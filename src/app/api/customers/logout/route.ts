import { NextResponse } from "next/server";
import {
  clearCustomerSessionCookieHeader,
  destroyCustomerSession,
  extractCustomerBearer,
} from "@/lib/customer-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = extractCustomerBearer(request);
  if (token) await destroyCustomerSession(token);
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearCustomerSessionCookieHeader());
  return res;
}
