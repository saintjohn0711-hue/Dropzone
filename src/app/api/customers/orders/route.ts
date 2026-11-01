import { NextResponse } from "next/server";
import { requireCustomer } from "@/lib/customer-session";
import { normalizeOrderStatus } from "@/lib/admin/constants";
import { getWriteClient, isMissingRelation } from "@/lib/supabase/write-client";

export const runtime = "nodejs";

/** GET — order history for logged-in customer */
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

  // Prefer customer_id; soft-fall back to contact_email match
  let { data, error } = await client
    .from("orders")
    .select(
      "id, status, total_cents, currency, delivery_address, contact_name, contact_email, payment_status, customer_id, pod_path, pod_captured_at, pod_status, created_at, updated_at, cart_id",
    )
    .eq("customer_id", auth.customer.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error && error.message.toLowerCase().includes("column")) {
    const soft = await client
      .from("orders")
      .select(
        "id, status, total_cents, currency, delivery_address, contact_name, created_at, updated_at, cart_id",
      )
      .order("created_at", { ascending: false })
      .limit(50);
    if (soft.error) {
      return NextResponse.json(
        {
          ok: false,
          error: soft.error.message,
          hint: isMissingRelation(soft.error)
            ? "Run init / checkout SQL"
            : "Run supabase-customers.sql for customer_id on orders",
        },
        { status: 503 },
      );
    }
    // Soft filter by email in contact_name/session when customer_id missing
    const email = auth.customer.email.toLowerCase();
    const softRows = (soft.data || []).filter((o) => {
      const blob = `${o.contact_name || ""} ${o.delivery_address || ""}`.toLowerCase();
      return blob.includes(email.split("@")[0]);
    });
    return NextResponse.json({
      ok: true,
      orders: softRows.map((o) => ({
        ...o,
        uiStatus: normalizeOrderStatus(String(o.status)),
      })),
      soft: true,
      hint: "customer_id / POD columns missing — run supabase-customers.sql (+ pod SQL). Showing soft-matched orders.",
    });
  }

  if (error) {
    if (isMissingRelation(error)) {
      return NextResponse.json({
        ok: true,
        orders: [],
        soft: true,
        hint: "Orders table missing — run init SQL",
      });
    }
    // Try contact_email match if customer_id filter failed empty schema path
    const byEmail = await client
      .from("orders")
      .select(
        "id, status, total_cents, currency, delivery_address, contact_name, contact_email, payment_status, created_at, updated_at, cart_id",
      )
      .eq("contact_email", auth.customer.email)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!byEmail.error) {
      return NextResponse.json({
        ok: true,
        orders: (byEmail.data || []).map((o) => ({
          ...o,
          uiStatus: normalizeOrderStatus(String(o.status)),
        })),
        soft: true,
        hint: "Matched via contact_email — set customer_id after supabase-customers.sql",
      });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  // If none by customer_id, also try contact_email
  if ((!data || data.length === 0) && auth.customer.email) {
    const byEmail = await client
      .from("orders")
      .select(
        "id, status, total_cents, currency, delivery_address, contact_name, contact_email, payment_status, customer_id, pod_path, pod_captured_at, pod_status, created_at, updated_at, cart_id",
      )
      .eq("contact_email", auth.customer.email)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!byEmail.error && byEmail.data?.length) {
      data = byEmail.data;
    }
  }

  return NextResponse.json({
    ok: true,
    orders: (data || []).map((o) => ({
      ...o,
      uiStatus: normalizeOrderStatus(String(o.status)),
    })),
  });
}
