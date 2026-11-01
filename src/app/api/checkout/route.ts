import { NextResponse } from "next/server";
import { resolveProduct } from "@/lib/resolve-product";
import {
  createCheckoutSession,
  getStripeMode,
} from "@/lib/payments/stripe";
import { updateOrderPayment } from "@/lib/payments/order-payment";
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

/** POST — create cart + order, then Stripe Checkout (or demo pay) */
export async function POST(request: Request) {
  let body: {
    items?: CheckoutLine[];
    deliveryAddress?: string;
    contactName?: string;
    contactEmail?: string;
    sessionKey?: string;
    /** demo | stripe — default stripe when configured */
    payMode?: "demo" | "stripe";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const items = (body.items ?? []).filter((i) => i.qty > 0);
  const deliveryAddress = body.deliveryAddress?.trim();
  const contactName = body.contactName?.trim() || null;
  const contactEmail = body.contactEmail?.trim() || null;

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
  const stripeMode = getStripeMode();
  const wantStripe =
    body.payMode !== "demo" && stripeMode.configured;

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

  const paymentStatus = wantStripe ? "pending" : "demo";
  const orderRow: Record<string, unknown> = {
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
    payment_status: paymentStatus,
  };

  let order: Record<string, unknown> | null = null;
  let orderHint: string | undefined;

  {
    const { data, error } = await client
      .from("orders")
      .insert(orderRow)
      .select("*")
      .single();
    if (!error && data) {
      order = data as Record<string, unknown>;
    } else {
      const basic = await client
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
      if (basic.error || !basic.data) {
        return NextResponse.json(
          {
            ok: false,
            error: error?.message || basic.error?.message || "Order create failed",
            hint: "Run supabase-checkout.sql then supabase-payments.sql.",
          },
          { status: 400 },
        );
      }
      order = basic.data as Record<string, unknown>;
      orderHint =
        "Order created with base columns; run supabase-payments.sql for payment_status.";
    }
  }

  const orderId = String(order.id);

  if (wantStripe) {
    const summary = resolved
      .map((i) => `${i.name} ×${i.qty}`)
      .join(", ");
    const session = await createCheckoutSession({
      orderId,
      totalCents,
      currency: "usd",
      customerEmail: contactEmail,
      lineSummary: summary || "DropZone delivery",
      request,
    });
    if ("error" in session) {
      return NextResponse.json({
        ok: true,
        order,
        cartId: cart.id,
        payment: {
          mode: "demo",
          status: "demo",
          message: `Stripe session failed (${session.error}) — order saved; use demo pay or fix keys.`,
        },
        totals: {
          subtotalCents,
          deliveryFeeCents: feeCents,
          totalCents,
        },
        hint: orderHint,
        stripeMode,
      });
    }

    await updateOrderPayment(orderId, {
      payment_status: "pending",
      stripe_checkout_session_id: session.sessionId,
    });

    return NextResponse.json({
      ok: true,
      order: { ...order, payment_status: "pending" },
      cartId: cart.id,
      payment: {
        mode: "stripe",
        status: "pending",
        checkoutUrl: session.url,
        sessionId: session.sessionId,
      },
      totals: {
        subtotalCents,
        deliveryFeeCents: feeCents,
        totalCents,
      },
      hint: orderHint,
      stripeMode,
    });
  }

  // Demo path — no charge
  await updateOrderPayment(orderId, {
    payment_status: "demo",
    paid_at: new Date().toISOString(),
  });

  return NextResponse.json({
    ok: true,
    order: { ...order, payment_status: "demo" },
    cartId: cart.id,
    payment: {
      mode: "demo",
      status: "demo",
      message: stripeMode.message,
    },
    totals: {
      subtotalCents,
      deliveryFeeCents: feeCents,
      totalCents,
    },
    hint: orderHint,
    stripeMode,
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({
      ok: true,
      stripeMode: getStripeMode(),
      usage: "POST { items, deliveryAddress, contactName?, contactEmail?, sessionKey?, payMode? }",
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
  return NextResponse.json({ ok: true, order: data, stripeMode: getStripeMode() });
}
