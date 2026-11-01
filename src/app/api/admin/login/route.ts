import { NextResponse } from "next/server";
import { authenticateAdmin, getAdminAuthMode } from "@/lib/admin/auth";
import {
  adminSessionCookieHeader,
  createAdminSession,
} from "@/lib/admin/session";
import { ADMIN_SESSION_DAYS } from "@/lib/admin/constants";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const identity = authenticateAdmin(body.email || "", body.password || "");
  if (!identity) {
    return NextResponse.json(
      { ok: false, error: "Invalid email or password" },
      { status: 401 },
    );
  }

  const session = await createAdminSession(identity);
  const res = NextResponse.json({
    ok: true,
    token: session.token,
    expiresAt: session.expiresAt,
    persisted: session.persisted,
    hint: session.hint,
    admin: {
      email: identity.email,
      displayName: identity.displayName,
      demo: identity.demo,
    },
    authMode: getAdminAuthMode(),
  });
  res.headers.set(
    "Set-Cookie",
    adminSessionCookieHeader(
      session.token,
      ADMIN_SESSION_DAYS * 24 * 60 * 60,
    ),
  );
  return res;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    authMode: getAdminAuthMode(),
    usage: "POST { email, password }",
  });
}
