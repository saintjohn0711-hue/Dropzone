import { createHash, randomBytes } from "crypto";
import type { Driver } from "@/lib/drivers";
import { getWriteClient, isMissingRelation } from "@/lib/supabase/write-client";

export const DRIVER_SESSION_COOKIE = "dz_driver_session";
export const DRIVER_SESSION_STORAGE = "dz-driver-session";
export const SESSION_DAYS = 14;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function mintToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sessionExpiryISO(days = SESSION_DAYS): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function extractBearer(request: Request): string | null {
  const header = request.headers.get("authorization") || "";
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (m?.[1]) return m[1].trim();
  const cookie = request.headers.get("cookie") || "";
  const part = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${DRIVER_SESSION_COOKIE}=`));
  if (!part) return null;
  return decodeURIComponent(part.slice(DRIVER_SESSION_COOKIE.length + 1));
}

export async function createDriverSession(driverId: string): Promise<{
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

  const { error } = await client.from("driver_sessions").insert({
    driver_id: driverId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (error) {
    return {
      token,
      expiresAt,
      persisted: false,
      hint: isMissingRelation(error)
        ? "Run supabase-checkout.sql to create driver_sessions."
        : error.message,
    };
  }
  return { token, expiresAt, persisted: true };
}

export async function resolveDriverFromToken(
  token: string,
): Promise<
  | { ok: true; driver: Driver; sessionId: string }
  | { ok: false; error: string; status: number; hint?: string }
> {
  const client = getWriteClient();
  if (!client) {
    return { ok: false, error: "Supabase not configured", status: 503 };
  }

  const tokenHash = hashToken(token);
  const now = new Date().toISOString();
  const { data: session, error } = await client
    .from("driver_sessions")
    .select("id, driver_id, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      error: error.message,
      status: isMissingRelation(error) ? 503 : 400,
      hint: isMissingRelation(error)
        ? "Run supabase-checkout.sql for driver_sessions."
        : undefined,
    };
  }
  if (!session) {
    return { ok: false, error: "Invalid session", status: 401 };
  }
  if (session.expires_at < now) {
    await client.from("driver_sessions").delete().eq("id", session.id);
    return { ok: false, error: "Session expired", status: 401 };
  }

  const { data: driver, error: dErr } = await client
    .from("drivers")
    .select("*")
    .eq("id", session.driver_id)
    .maybeSingle();

  if (dErr || !driver) {
    return { ok: false, error: "Driver not found", status: 404 };
  }

  return { ok: true, driver: driver as Driver, sessionId: session.id };
}

export async function destroySession(token: string): Promise<void> {
  const client = getWriteClient();
  if (!client) return;
  await client.from("driver_sessions").delete().eq("token_hash", hashToken(token));
}

export function sessionCookieHeader(token: string, expiresAt: string): string {
  const maxAge = Math.max(
    0,
    Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
  );
  return `${DRIVER_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookieHeader(): string {
  return `${DRIVER_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
