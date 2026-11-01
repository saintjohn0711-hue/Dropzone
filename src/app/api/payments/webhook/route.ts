import { NextResponse } from "next/server";
import { getStripe } from "@/lib/payments/stripe";
import { updateOrderPayment } from "@/lib/payments/order-payment";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) {
    return NextResponse.json(
      {
        ok: false,
        error: "Stripe webhook not configured",
        hint: "Set STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET on DropZone Vercel.",
      },
      { status: 503 },
    );
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ ok: false, error: "Missing signature" }, { status: 400 });
  }

  const raw = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Invalid signature",
      },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      client_reference_id?: string | null;
      metadata?: { order_id?: string };
      payment_intent?: string | null;
      payment_status?: string;
    };
    const orderId =
      session.client_reference_id || session.metadata?.order_id || null;
    if (orderId) {
      const pi =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null;
      await updateOrderPayment(orderId, {
        payment_status: "paid",
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: pi,
        paid_at: new Date().toISOString(),
      });
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as {
      id: string;
      client_reference_id?: string | null;
      metadata?: { order_id?: string };
    };
    const orderId =
      session.client_reference_id || session.metadata?.order_id || null;
    if (orderId) {
      await updateOrderPayment(orderId, {
        payment_status: "failed",
        stripe_checkout_session_id: session.id,
      });
    }
  }

  return NextResponse.json({ ok: true, received: true, type: event.type });
}
