import { NextResponse } from "next/server";
import { resolveProduct } from "@/lib/resolve-product";
import { getWriteClient, isMissingRelation } from "@/lib/supabase/write-client";

export const runtime = "nodejs";

type CheckoutLine = {
  id: string;
  qty: number;
  vehicleId?: string;
  rushId?: string;
  sku?: string;
  name?: string;
  price?: number;
};

function deliveryFeeCents(vehicleId?: string, rushId?: string): number {
  let fee = 899;
  if (vehicleId === "pickup") fee = 1499;
  if (vehicleId === "box" || vehicleId === "box_truck") fee = 2499;
  if (vehicleId === "drone") fee = 1299;
  if (rushId === "rush") fee += 1000;
  return fee;
}

/** POST — create cart + cart_items + order in Supabase */
export async function POST(request: Request) {
  let body: {
    items?: CheckoutLine[];
    deliveryAddress?: string;
    contactName?: string;
    sessionKey?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const items = (body.items ?? []).filter((i) => i.qty > 0);
  const deliveryAddress = body.deliveryAddress?.trim();
  const contactName = body.contactName?.trim() || null;

  if (!items.length) {
    return NextResponse.json({ ok: false, error: "Cart is empty" }, { status: 400 });
  }
  if (!deliveryAddress) {
    return NextResponse.json(
      { ok: false, error: "deliveryAddress is required" },
      { status: 400 },
    );
  }

  const resolved = items.map((line) => {
    const product = resolveProduct(line.id) || resolveProduct(line.sku || "");
    const price = line.price ?? product?.price ?? 0;
    const name = line.name || product?.name || line.id;
    const sku = line.sku || product?.sku || line.id;
    return {
      ...line,
      price,
      name,
      sku,
      vehicleId: line.vehicleId || "pickup",
      rushId: line.rushId || "standard",
    };
  });

  const subtotalCents = Math.round(
    resolved.reduce((sum, i) => sum + i.price * i.qty, 0) * 100,
  );
  const vehicleId = resolved[0]?.vehicleId;
  const rushId = resolved[0]?.rushId;
  const feeCents = deliveryFeeCents(vehicleId, rushId);
  const totalCents = subtotalCents + feeCents;
  const sessionKey = body.sessionKey?.trim() || `guest-${Date.now()}`;

  const client = getWriteClient();
  if (!client) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase not configured",
        hint: "Set DropZone Supabase env vars on Vercel.",
      },
      { status: 503 },
    );
  }

  const { data: cart, error: cartErr } = await client
    .from("carts")
    .insert({ session_key: sessionKey })
    .select("id")
    .single();

  if (cartErr || !cart) {
    return NextResponse.json(
      {
        ok: false,
        error: cartErr?.message || "Could not create cart",
        hint: isMissingRelation(cartErr || {})
          ? "Run init SQL + supabase-checkout.sql in DropZone SQL editor."
          : "Check carts RLS insert policy (supabase-checkout.sql).",
      },
      { status: 400 },
    );
  }

  const lineRows = resolved.map((i) => ({
    cart_id: cart.id,
    sku: i.sku,
    qty: i.qty,
    vehicle_id: i.vehicleId,
    rush_id: i.rushId,
    unit_price_cents: Math.round(i.price * 100),
    product_name: i.name,
  }));

  const { error: itemsErr } = await client.from("cart_items").insert(lineRows);
  if (itemsErr) {
    return NextResponse.json(
      {
        ok: false,
        error: itemsErr.message,
        hint: isMissingRelation(itemsErr)
          ? "Run supabase-checkout.sql (cart_items columns + RLS)."
          : undefined,
      },
      { status: 400 },
    );
  }

  const orderRow = {
    cart_id: cart.id,
    status: "pending",
    total_cents: totalCents,
    subtotal_cents: subtotalCents,
    delivery_fee_cents: feeCents,
    currency: "USD",
    delivery_address: deliveryAddress,
    contact_name: contactName,
    vehicle_id: vehicleId,
    rush_id: rushId,
    session_key: sessionKey,
  };

  const { data: order, error: orderErr } = await client
    .from("orders")
    .insert(orderRow)
    .select("*")
    .single();

  if (orderErr || !order) {
    // Fallback without extra columns if migration not applied
    const { data: basic, error: basicErr } = await client
      .from("orders")
      .insert({
        cart_id: cart.id,
        status: "pending",
        total_cents: totalCents,
        currency: "USD",
        delivery_address: deliveryAddress,
      })
      .select("*")
      .single();

    if (basicErr || !basic) {
      return NextResponse.json(
        {
          ok: false,
          error: orderErr?.message || basicErr?.message || "Order create failed",
          hint: "Run /cursor/stores/self/docs/supabase-checkout.sql then retry.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      order: basic,
      cartId: cart.id,
      items: resolved,
      totals: {
        subtotalCents,
        deliveryFeeCents: feeCents,
        totalCents,
      },
      hint: "Order created with base columns; run supabase-checkout.sql for full fields.",
    });
  }

  return NextResponse.json({
    ok: true,
    order,
    cartId: cart.id,
    items: resolved,
    totals: {
      subtotalCents,
      deliveryFeeCents: feeCents,
      totalCents,
    },
  });
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({
      ok: true,
      usage: "POST { items, deliveryAddress, contactName?, sessionKey? }",
    });
  }

  const client = getWriteClient();
  if (!client) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  }

  const { data, error } = await client.from("orders").select("*").eq("id", id).maybeSingle();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, order: data });
}
