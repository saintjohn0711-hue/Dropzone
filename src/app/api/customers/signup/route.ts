import { NextResponse } from "next/server";
import {
  createCustomerSession,
  customerSessionCookieHeader,
} from "@/lib/customer-session";
import { getWriteClient, isMissingRelation } from "@/lib/supabase/write-client";

export const runtime = "nodejs";

/** POST — create customer by email (demo email-only; soft if SQL missing). */
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
        hint: "Client may use local customer store until SQL + keys are set.",
      },
      { status: 503 },
    );
  }

  const { data: existing } = await client
    .from("customers")
    .select("id, email, name, created_at")
    .eq("email", email)
    .maybeSingle();

  let customer = existing;
  if (!customer) {
    const inserted = await client
      .from("customers")
      .insert({ email, name })
      .select("id, email, name, created_at")
      .maybeSingle();
    if (inserted.error) {
      return NextResponse.json(
        {
          ok: false,
          error: inserted.error.message,
          softLocal: true,
          hint: isMissingRelation(inserted.error)
            ? "Run supabase-customers.sql — client can soft-store locally."
            : undefined,
        },
        { status: isMissingRelation(inserted.error) ? 503 : 400 },
      );
    }
    customer = inserted.data;
  }

  if (!customer) {
    return NextResponse.json({ ok: false, error: "Could not create customer" }, { status: 500 });
  }

  const session = await createCustomerSession(customer.id);
  const res = NextResponse.json({
    ok: true,
    customer,
    token: session.token,
    expiresAt: session.expiresAt,
    persisted: session.persisted,
    hint: session.hint,
    approach: "Email + opaque session (SHA-256 in customer_sessions). Demo — no password.",
  });
  res.headers.set(
    "Set-Cookie",
    customerSessionCookieHeader(session.token, session.expiresAt),
  );
  return res;
}
