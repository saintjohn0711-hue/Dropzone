-- DropZone Stripe payments (xvfxjxmdtazihzuyyrsj ONLY)

alter table public.orders
  add column if not exists payment_status text
    check (
      payment_status is null
      or payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded', 'demo')
    );

alter table public.orders
  add column if not exists stripe_checkout_session_id text;

alter table public.orders
  add column if not exists stripe_payment_intent_id text;

alter table public.orders
  add column if not exists paid_at timestamptz;

create index if not exists orders_payment_status_idx
  on public.orders (payment_status);

create index if not exists orders_stripe_session_idx
  on public.orders (stripe_checkout_session_id);

update public.orders
set payment_status = coalesce(payment_status, 'unpaid')
where payment_status is null;
