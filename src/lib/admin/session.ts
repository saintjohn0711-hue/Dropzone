import { createHash, createHmac, randomBytes } from "crypto";
import type { AdminIdentity } from "@/lib/admin/auth";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_DAYS,
} from "@/lib/admin/constants";
import { getWriteClient, isMissingRelation } from "@/lib/supabase/write-client";

export { ADMIN_SESSION_COOKIE };

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function mintToken(): string {
  return randomBytes(32).toString("base64url");
}

function sessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 48) ||
    "dropzone-admin-dev-secret"
  );
}

/** Soft signed token when admin_sessions table missing: soft.<base64url(json)>.<sig> */
function mintSoftToken(email: string, expiresAtMs: number): string {
  const body = Buffer.from(
    JSON.stringify({ email, exp: expiresAtMs }),
    "utf8",
  ).toString("base64url");
  const payload = `soft.${body}`;
  const sig = createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

function parseSoftToken(token: string): { email: string; exp: number } | null {
  if (!token.startsWith("soft.")) return null;
  const parts = token.split(".");
  // soft.<body>.<sig> — body is base64url (no dots)
  if (parts.length !== 3) return null;
  const body = parts[1];
  const sig = parts[2];
  const payload = `soft.${body}`;
  const expected = createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("base64url");
  if (sig !== expected) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as { email?: string; exp?: number };
    if (!parsed.email || !Number.isFinite(parsed.exp) || (parsed.exp as number) < Date.now()) {
      return null;
    }
    return { email: String(parsed.email).toLowerCase(), exp: parsed.exp as number };
  } catch {
    return null;
  }
}

export function extractAdminToken(request: Request): string | null {
  const header = request.headers.get("authorization") || "";
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (m?.[1]) return m[1].trim();
  const cookie = request.headers.get("cookie") || "";
  const part = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  if (!part) return null;
  return decodeURIComponent(part.slice(ADMIN_SESSION_COOKIE.length + 1));
}

export function adminSessionCookieHeader(token: string, maxAgeSec: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`;
}

export function clearAdminSessionCookieHeader(): string {
  return `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function createAdminSession(identity: AdminIdentity): Promise<{
  token: string;
  expiresAt: string;
  persisted: boolean;
  hint?: string;
}> {
  const expiresAtMs = Date.now() + ADMIN_SESSION_DAYS * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(expiresAtMs).toISOString();
  const client = getWriteClient();

  if (!client) {
    return {
      token: mintSoftToken(identity.email, expiresAtMs),
      expiresAt,
      persisted: false,
      hint: "Supabase not configured — soft session",
    };
  }

  const token = mintToken();
  const tokenHash = hashToken(token);

  // Best-effort ensure admin row
  try {
    await client.from("admins").upsert(
      {
        email: identity.email,
        display_name: identity.displayName,
        active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" },
    );
  } catch {
    /* soft */
  }

  const { data: adminRow } = await client
    .from("admins")
    .select("id")
    .eq("email", identity.email)
    .maybeSingle();

  const { error } = await client.from("admin_sessions").insert({
    admin_id: adminRow?.id ?? null,
    admin_email: identity.email,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (error) {
    return {
      token: mintSoftToken(identity.email, expiresAtMs),
      expiresAt,
      persisted: false,
      hint: isMissingRelation(error)
        ? "Run supabase-admin.sql to create admin_sessions."
        : error.message,
    };
  }

  return { token, expiresAt, persisted: true };
}

export async function resolveAdminFromToken(token: string): Promise<
  | { ok: true; email: string; displayName: string; demo: boolean; soft: boolean }
  | { ok: false; error: string; status: number; hint?: string }
> {
  const soft = parseSoftToken(token);
  if (soft) {
    const demo = soft.email === "admin@dropzone.test";
    return {
      ok: true,
      email: soft.email,
      displayName: demo ? "Demo Admin" : soft.email.split("@")[0] || "Admin",
      demo,
      soft: true,
    };
  }

  const client = getWriteClient();
  if (!client) {
    return { ok: false, error: "Supabase not configured", status: 503 };
  }

  const tokenHash = hashToken(token);
  const now = new Date().toISOString();
  const { data: session, error } = await client
    .from("admin_sessions")
    .select("id, admin_email, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      error: error.message,
      status: isMissingRelation(error) ? 503 : 401,
      hint: isMissingRelation(error)
        ? "Run supabase-admin.sql"
        : undefined,
    };
  }

  if (!session || session.expires_at < now) {
    return { ok: false, error: "Invalid or expired admin session", status: 401 };
  }

  const { data: admin } = await client
    .from("admins")
    .select("display_name, active")
    .eq("email", session.admin_email)
    .maybeSingle();

  if (admin && admin.active === false) {
    return { ok: false, error: "Admin deactivated", status: 403 };
  }

  return {
    ok: true,
    email: session.admin_email,
    displayName: admin?.display_name || session.admin_email.split("@")[0] || "Admin",
    demo: session.admin_email === "admin@dropzone.test",
    soft: false,
  };
}

export async function destroyAdminSession(token: string): Promise<void> {
  if (token.startsWith("soft.")) return;
  const client = getWriteClient();
  if (!client) return;
  await client.from("admin_sessions").delete().eq("token_hash", hashToken(token));
}

export async function requireAdmin(request: Request) {
  const token = extractAdminToken(request);
  if (!token) {
    return { ok: false as const, error: "Unauthorized", status: 401 };
  }
  const resolved = await resolveAdminFromToken(token);
  if (!resolved.ok) {
    return {
      ok: false as const,
      error: resolved.error,
      status: resolved.status,
      hint: resolved.hint,
    };
  }
  return { ok: true as const, admin: resolved, token };
}
