import { NextResponse } from "next/server";
import { getStripe, getStripeMode } from "@/lib/payments/stripe";
import { updateOrderPayment } from "@/lib/payments/order-payment";
import { getWriteClient } from "@/lib/supabase/write-client";

export const runtime = "nodejs";

/** GET ?session_id= — verify Stripe session and mark order paid (success-page helper). */
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json(
      { ok: false, error: "session_id required", stripeMode: getStripeMode() },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({
      ok: false,
      error: "Stripe not configured",
      stripeMode: getStripeMode(),
    }, { status: 503 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const orderId =
      session.client_reference_id ||
      session.metadata?.order_id ||
      null;

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "Session has no order reference" },
        { status: 400 },
      );
    }

    const paid =
      session.payment_status === "paid" || session.status === "complete";

    if (paid) {
      const pi =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null;
      const upd = await updateOrderPayment(orderId, {
        payment_status: "paid",
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: pi,
        paid_at: new Date().toISOString(),
      });

      const client = getWriteClient();
      let order = null;
      if (client) {
        const { data } = await client
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .maybeSingle();
        order = data;
      }

      return NextResponse.json({
        ok: true,
        paid: true,
        orderId,
        order,
        soft: upd.soft,
        hint: upd.hint,
      });
    }

    return NextResponse.json({
      ok: true,
      paid: false,
      orderId,
      paymentStatus: session.payment_status,
      status: session.status,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Confirm failed",
      },
      { status: 400 },
    );
  }
}
