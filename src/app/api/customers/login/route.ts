import { NextResponse } from "next/server";
import {
  createCustomerSession,
  customerSessionCookieHeader,
} from "@/lib/customer-session";
import { getWriteClient, isMissingRelation } from "@/lib/supabase/write-client";

export const runtime = "nodejs";

/** POST — email-only customer login (creates account if missing for demo UX). */
export async function POST(request: Request) {
  let body: { email?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim() || null;
  if (!email) {
    return NextResponse.json({ ok: false, error: "email is required" }, { status: 400 });
  }

  const client = getWriteClient();
  if (!client) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase not configured",
        softLocal: true,
        hint: "Use local customer store until Supabase is linked.",
      },
      { status: 503 },
    );
  }

  let { data: customer, error } = await client
    .from("customers")
    .select("id, email, name, created_at")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        softLocal: true,
        hint: isMissingRelation(error)
          ? "Run supabase-customers.sql — client soft-login available."
          : undefined,
      },
      { status: isMissingRelation(error) ? 503 : 400 },
    );
  }

  if (!customer) {
    const inserted = await client
      .from("customers")
      .insert({ email, name: name || email.split("@")[0] })
      .select("id, email, name, created_at")
      .maybeSingle();
    if (inserted.error) {
      return NextResponse.json(
        {
          ok: false,
          error: inserted.error.message,
          softLocal: true,
          hint: isMissingRelation(inserted.error)
            ? "Run supabase-customers.sql"
            : undefined,
        },
        { status: isMissingRelation(inserted.error) ? 503 : 400 },
      );
    }
    customer = inserted.data;
  }

  if (!customer) {
    return NextResponse.json({ ok: false, error: "Login failed" }, { status: 500 });
  }

  const session = await createCustomerSession(customer.id);
  const res = NextResponse.json({
    ok: true,
    customer,
    token: session.token,
    expiresAt: session.expiresAt,
    persisted: session.persisted,
    hint: session.hint,
  });
  res.headers.set(
    "Set-Cookie",
    customerSessionCookieHeader(session.token, session.expiresAt),
  );
  return res;
}
