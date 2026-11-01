import { createHash, randomBytes } from "crypto";
import { getWriteClient, isMissingRelation } from "@/lib/supabase/write-client";

export const CUSTOMER_SESSION_COOKIE = "dz_customer_session";
export const CUSTOMER_SESSION_STORAGE = "dz-customer-session";
export const CUSTOMER_ID_STORAGE = "dz-customer-id";
export const SESSION_DAYS = 30;

export type Customer = {
  id: string;
  email: string;
  name: string | null;
  created_at?: string;
};

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function mintToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sessionExpiryISO(days = SESSION_DAYS): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function extractCustomerBearer(request: Request): string | null {
  const header = request.headers.get("authorization") || "";
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (m?.[1]) return m[1].trim();
  const cookie = request.headers.get("cookie") || "";
  const part = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CUSTOMER_SESSION_COOKIE}=`));
  if (!part) return null;
  return decodeURIComponent(part.slice(CUSTOMER_SESSION_COOKIE.length + 1));
}

export async function createCustomerSession(customerId: string): Promise<{
  token: string;
  expiresAt: string;
  persisted: boolean;
  hint?: string;
}> {
  const token = mintToken();
  const tokenHash = hashToken(token);
  const expiresAt = sessionExpiryISO();
  const client = getWriteClient();
  if (!client) {
    return { token, expiresAt, persisted: false, hint: "Supabase not configured" };
  }

  const { error } = await client.from("customer_sessions").insert({
    customer_id: customerId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (error) {
    return {
      token,
      expiresAt,
      persisted: false,
      hint: isMissingRelation(error)
        ? "Run supabase-customers.sql to create customer_sessions."
        : error.message,
    };
  }
  return { token, expiresAt, persisted: true };
}

export async function resolveCustomerFromToken(
  token: string,
): Promise<
  | { ok: true; customer: Customer; sessionId: string }
  | { ok: false; error: string; status: number; hint?: string }
> {
  const client = getWriteClient();
  if (!client) {
    return { ok: false, error: "Supabase not configured", status: 503 };
  }

  // Soft local token: local-<uuid>
  if (token.startsWith("local-")) {
    const id = token.slice(6);
    const { data, error } = await client
      .from("customers")
      .select("id, email, name, created_at")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      return {
        ok: false,
        error: error.message,
        status: isMissingRelation(error) ? 503 : 400,
        hint: isMissingRelation(error)
          ? "Run supabase-customers.sql"
          : undefined,
      };
    }
    if (!data) {
      return { ok: false, error: "Invalid session", status: 401 };
    }
    return { ok: true, customer: data as Customer, sessionId: `local-${id}` };
  }

  const tokenHash = hashToken(token);
  const now = new Date().toISOString();
  const { data: session, error } = await client
    .from("customer_sessions")
    .select("id, customer_id, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      error: error.message,
      status: isMissingRelation(error) ? 503 : 400,
      hint: isMissingRelation(error)
        ? "Run supabase-customers.sql for customer_sessions."
        : undefined,
    };
  }
  if (!session) {
    return { ok: false, error: "Invalid session", status: 401 };
  }
  if (session.expires_at < now) {
    await client.from("customer_sessions").delete().eq("id", session.id);
    return { ok: false, error: "Session expired", status: 401 };
  }

  const { data: customer, error: cErr } = await client
    .from("customers")
    .select("id, email, name, created_at")
    .eq("id", session.customer_id)
    .maybeSingle();

  if (cErr || !customer) {
    return { ok: false, error: "Customer not found", status: 404 };
  }

  return { ok: true, customer: customer as Customer, sessionId: session.id };
}

export async function destroyCustomerSession(token: string): Promise<void> {
  if (token.startsWith("local-")) return;
  const client = getWriteClient();
  if (!client) return;
  await client
    .from("customer_sessions")
    .delete()
    .eq("token_hash", hashToken(token));
}

export function customerSessionCookieHeader(
  token: string,
  expiresAt: string,
): string {
  const maxAge = Math.max(
    0,
    Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
  );
  return `${CUSTOMER_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearCustomerSessionCookieHeader(): string {
  return `${CUSTOMER_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function requireCustomer(request: Request) {
  const token = extractCustomerBearer(request);
  if (!token) {
    return { ok: false as const, error: "Unauthorized", status: 401 };
  }
  const resolved = await resolveCustomerFromToken(token);
  if (!resolved.ok) {
    return {
      ok: false as const,
      error: resolved.error,
      status: resolved.status,
      hint: resolved.hint,
    };
  }
  return { ok: true as const, customer: resolved.customer, token };
}
