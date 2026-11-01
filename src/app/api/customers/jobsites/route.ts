import { NextResponse } from "next/server";
import { requireCustomer } from "@/lib/customer-session";
import { getWriteClient, isMissingRelation } from "@/lib/supabase/write-client";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireCustomer(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error, hint: auth.hint },
      { status: auth.status },
    );
  }

  const client = getWriteClient();
  if (!client) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured", softLocal: true },
      { status: 503 },
    );
  }

  const { data, error } = await client
    .from("customer_jobsites")
    .select("id, label, address, created_at")
    .eq("customer_id", auth.customer.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        softLocal: true,
        hint: isMissingRelation(error)
          ? "Run supabase-customers.sql"
          : undefined,
      },
      { status: isMissingRelation(error) ? 503 : 400 },
    );
  }

  return NextResponse.json({ ok: true, jobsites: data || [] });
}

export async function POST(request: Request) {
  const auth = await requireCustomer(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error, hint: auth.hint },
      { status: auth.status },
    );
  }

  let body: { label?: string; address?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const label = body.label?.trim() || "Jobsite";
  const address = body.address?.trim();
  if (!address) {
    return NextResponse.json(
      { ok: false, error: "address is required" },
      { status: 400 },
    );
  }

  const client = getWriteClient();
  if (!client) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured", softLocal: true },
      { status: 503 },
    );
  }

  const { data, error } = await client
    .from("customer_jobsites")
    .insert({
      customer_id: auth.customer.id,
      label,
      address,
    })
    .select("id, label, address, created_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        softLocal: true,
        hint: isMissingRelation(error)
          ? "Run supabase-customers.sql"
          : undefined,
      },
      { status: isMissingRelation(error) ? 503 : 400 },
    );
  }

  return NextResponse.json({ ok: true, jobsite: data });
}

export async function DELETE(request: Request) {
  const auth = await requireCustomer(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error, hint: auth.hint },
      { status: auth.status },
    );
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  }

  const client = getWriteClient();
  if (!client) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured", softLocal: true },
      { status: 503 },
    );
  }

  const { error } = await client
    .from("customer_jobsites")
    .delete()
    .eq("id", id)
    .eq("customer_id", auth.customer.id);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        softLocal: true,
        hint: isMissingRelation(error)
          ? "Run supabase-customers.sql"
          : undefined,
      },
      { status: isMissingRelation(error) ? 503 : 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
