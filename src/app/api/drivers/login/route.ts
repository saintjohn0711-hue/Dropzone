import { NextResponse } from "next/server";
import {
  createDriverSession,
  sessionCookieHeader,
} from "@/lib/driver-session";
import { getWriteClient, isMissingRelation } from "@/lib/supabase/write-client";

export const runtime = "nodejs";

/**
 * POST /api/drivers/login
 * v1: email-only session. Issues opaque token (hashed in driver_sessions).
 * See docs/driver-login.md
 */
export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, error: "email is required" }, { status: 400 });
  }

  const client = getWriteClient();
  if (!client) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 503 },
    );
  }

  const { data: driver, error } = await client
    .from("drivers")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        hint: isMissingRelation(error)
          ? "Run supabase-drivers.sql first."
          : undefined,
      },
      { status: isMissingRelation(error) ? 503 : 400 },
    );
  }

  if (!driver) {
    return NextResponse.json(
      { ok: false, error: "No driver account for that email" },
      { status: 404 },
    );
  }

  const session = await createDriverSession(driver.id);
  const res = NextResponse.json({
    ok: true,
    driver,
    token: session.token,
    expiresAt: session.expiresAt,
    persisted: session.persisted,
    hint: session.hint,
    approach:
      "Email + opaque session token (SHA-256 stored in driver_sessions). Demo v1 — no password / magic-email yet.",
  });
  res.headers.set(
    "Set-Cookie",
    sessionCookieHeader(session.token, session.expiresAt),
  );
  return res;
}
