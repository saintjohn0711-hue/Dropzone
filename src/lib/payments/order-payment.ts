import { getWriteClient, isMissingRelation } from "@/lib/supabase/write-client";

export type PaymentStatus =
  | "unpaid"
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "demo";

export async function updateOrderPayment(
  orderId: string,
  patch: {
    payment_status?: PaymentStatus;
    stripe_checkout_session_id?: string | null;
    stripe_payment_intent_id?: string | null;
    paid_at?: string | null;
  },
): Promise<{ ok: boolean; soft?: boolean; hint?: string; error?: string }> {
  const client = getWriteClient();
  if (!client) return { ok: false, error: "Supabase not configured" };

  const full = {
    ...patch,
    updated_at: new Date().toISOString(),
  };

  const { error } = await client.from("orders").update(full).eq("id", orderId);
  if (!error) return { ok: true };

  if (
    isMissingRelation(error) ||
    error.message.toLowerCase().includes("column")
  ) {
    // Soft: only touch status/updated_at if payment columns missing
    const softPatch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (patch.payment_status === "paid" || patch.payment_status === "demo") {
      // keep order pending/placed; payment metadata deferred
    }
    const soft = await client.from("orders").update(softPatch).eq("id", orderId);
    if (soft.error) {
      return {
        ok: false,
        error: soft.error.message,
        hint: "Run supabase-payments.sql",
      };
    }
    return {
      ok: true,
      soft: true,
      hint: "Payment columns missing — run /cursor/stores/self/docs/supabase-payments.sql",
    };
  }

  return { ok: false, error: error.message };
}
