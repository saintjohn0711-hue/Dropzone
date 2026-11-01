import Stripe from "stripe";

export type PaymentMode = "stripe" | "demo";

export function getStripeMode(): {
  mode: PaymentMode;
  publishableKey: string | null;
  configured: boolean;
  message: string;
} {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const pub = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || null;
  if (secret) {
    return {
      mode: "stripe",
      publishableKey: pub,
      configured: true,
      message: "Stripe Checkout enabled (test/live per key prefix).",
    };
  }
  return {
    mode: "demo",
    publishableKey: null,
    configured: false,
    message:
      "Stripe keys missing — demo checkout only (no real charge). Set STRIPE_SECRET_KEY + NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY on Vercel dropzone.",
  };
}

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key, { typescript: true });
}

export function appBaseUrl(request?: Request): string {
  const env =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (env) {
    return env.startsWith("http") ? env.replace(/\/$/, "") : `https://${env.replace(/\/$/, "")}`;
  }
  if (request) {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") || "https";
    if (host) return `${proto}://${host}`;
  }
  return "https://dropzone-seven-ecru.vercel.app";
}

export async function createCheckoutSession(opts: {
  orderId: string;
  totalCents: number;
  currency?: string;
  customerEmail?: string | null;
  lineSummary: string;
  request?: Request;
}): Promise<{ url: string; sessionId: string } | { error: string }> {
  const stripe = getStripe();
  if (!stripe) return { error: "Stripe not configured" };

  const base = appBaseUrl(opts.request);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: (opts.currency || "usd").toLowerCase(),
          unit_amount: opts.totalCents,
          product_data: {
            name: "DropZone jobsite delivery",
            description: opts.lineSummary.slice(0, 400),
          },
        },
      },
    ],
    success_url: `${base}/order/${opts.orderId}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/checkout?canceled=1&orderId=${opts.orderId}`,
    client_reference_id: opts.orderId,
    customer_email: opts.customerEmail || undefined,
    metadata: { order_id: opts.orderId, source: "dropzone" },
  });

  if (!session.url) return { error: "Stripe session missing URL" };
  return { url: session.url, sessionId: session.id };
}
