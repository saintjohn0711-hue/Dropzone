import { NextResponse } from "next/server";
import {
  clearSessionCookieHeader,
  destroySession,
  extractBearer,
} from "@/lib/driver-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = extractBearer(request);
  if (token) await destroySession(token);
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearSessionCookieHeader());
  return res;
}
