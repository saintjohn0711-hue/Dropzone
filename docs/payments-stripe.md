# DropZone Stripe payments

**Checkout:** https://dropzone-seven-ecru.vercel.app/checkout  
**Webhook:** `POST /api/payments/webhook`  
**Confirm helper:** `GET /api/payments/confirm?session_id=…`

Isolated DropZone only — Vercel **dropzone**, Supabase `xvfxjxmdtazihzuyyrsj`. Never player1.

## Env keys (Vercel dropzone only)

| Key | Required | Purpose |
|-----|----------|---------|
| `STRIPE_SECRET_KEY` | For live Checkout | `sk_test_…` or `sk_live_…` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Recommended | `pk_test_…` / `pk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | For webhook | `whsec_…` from Stripe Dashboard → Webhooks |
| `NEXT_PUBLIC_APP_URL` | Optional | Override success/cancel base URL (defaults to production host) |

## Demo without keys

If `STRIPE_SECRET_KEY` is unset, checkout shows a **demo payments** banner and **Place order (demo · no charge)**. Orders persist with `payment_status = demo`.

## Flow

1. Customer places order → `POST /api/checkout` creates cart + order.  
2. With Stripe keys → Stripe Checkout Session; browser redirects.  
3. Success → `/order/{id}?paid=1&session_id=…` (confirms + marks paid).  
4. Cancel → `/checkout?canceled=1`.  
5. Webhook `checkout.session.completed` also marks `payment_status=paid`.

Test card (Stripe test mode): `4242 4242 4242 4242`, any future expiry, any CVC.

## SQL

Paste `/cursor/stores/self/docs/supabase-payments.sql` in the DropZone SQL editor (adds `payment_status`, Stripe ids, `paid_at`). Soft-fallback works until then.
