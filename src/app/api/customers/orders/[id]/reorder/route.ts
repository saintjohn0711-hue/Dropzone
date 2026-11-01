import { NextResponse } from "next/server";
import { requireCustomer } from "@/lib/customer-session";
import { getWriteClient, isMissingRelation } from "@/lib/supabase/write-client";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** POST — return cart lines from a past order for client-side reorder into dz-cart */
export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
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
      { ok: false, error: "Supabase not configured" },
      { status: 503 },
    );
  }

  const { data: order, error } = await client
    .from("orders")
    .select("id, cart_id, customer_id, contact_email, delivery_address")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        hint: isMissingRelation(error) ? "Run init SQL" : undefined,
      },
      { status: 400 },
    );
  }
  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }

  const ownsById = order.customer_id === auth.customer.id;
  const ownsByEmail =
    !!order.contact_email &&
    String(order.contact_email).toLowerCase() === auth.customer.email;
  // Soft: allow when customer_id unset (SQL not applied); block only on clear mismatch
  if (order.customer_id && !ownsById && !ownsByEmail) {
    return NextResponse.json({ ok: false, error: "Not your order" }, { status: 403 });
  }

  if (!order.cart_id) {
    return NextResponse.json(
      {
        ok: false,
        error: "No cart linked to this order",
        hint: "Older orders without cart_id cannot reorder automatically.",
      },
      { status: 400 },
    );
  }

  let rows: Array<Record<string, unknown>> = [];
  const full = await client
    .from("cart_items")
    .select("product_id, sku, product_name, qty, unit_price_cents")
    .eq("cart_id", order.cart_id);

  if (full.error && full.error.message.toLowerCase().includes("column")) {
    const basic = await client
      .from("cart_items")
      .select("product_id, sku, qty")
      .eq("cart_id", order.cart_id);
    if (basic.error) {
      return NextResponse.json(
        { ok: false, error: basic.error.message },
        { status: 400 },
      );
    }
    rows = (basic.data || []) as Array<Record<string, unknown>>;
  } else if (full.error) {
    return NextResponse.json(
      { ok: false, error: full.error.message },
      { status: 400 },
    );
  } else {
    rows = (full.data || []) as Array<Record<string, unknown>>;
  }

  const lines = rows.map((row) => ({
    id: String(row.product_id || row.sku || "item"),
    qty: Number(row.qty) || 1,
    name: typeof row.product_name === "string" ? row.product_name : undefined,
    sku: row.sku,
  }));

  return NextResponse.json({
    ok: true,
    lines,
    deliveryAddress: order.delivery_address,
    message: "Add lines to local cart (dz-cart) then open /cart",
  });
}
