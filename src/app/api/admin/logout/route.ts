import { NextResponse } from "next/server";
import {
  clearAdminSessionCookieHeader,
  destroyAdminSession,
  extractAdminToken,
} from "@/lib/admin/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = extractAdminToken(request);
  if (token) await destroyAdminSession(token);
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearAdminSessionCookieHeader());
  return res;
}
