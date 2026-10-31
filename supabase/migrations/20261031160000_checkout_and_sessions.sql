-- DropZone checkout + driver sessions (xvfxjxmdtazihzuyyrsj only)

-- Orders extras for real checkout
alter table public.orders
  add column if not exists contact_name text;

alter table public.orders
  add column if not exists vehicle_id text;

alter table public.orders
  add column if not exists rush_id text;

alter table public.orders
  add column if not exists subtotal_cents integer;

alter table public.orders
  add column if not exists delivery_fee_cents integer;

alter table public.orders
  add column if not exists session_key text;

alter table public.cart_items
  add column if not exists unit_price_cents integer;

alter table public.cart_items
  add column if not exists product_name text;

-- Public write policies for checkout stubs (tighten with Auth later)
do $$ begin
  create policy "carts_public_insert" on public.carts for insert with check (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "carts_public_select" on public.carts for select using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "carts_public_update" on public.carts for update using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "cart_items_public_insert" on public.cart_items for insert with check (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "cart_items_public_select" on public.cart_items for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "orders_public_insert" on public.orders for insert with check (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "orders_public_select" on public.orders for select using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "orders_public_update" on public.orders for update using (true);
exception when duplicate_object then null;
end $$;

-- Driver login sessions (email → opaque token; hash stored server-side)
create table if not exists public.driver_sessions (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists driver_sessions_driver_id_idx
  on public.driver_sessions (driver_id);
create index if not exists driver_sessions_expires_at_idx
  on public.driver_sessions (expires_at);

alter table public.driver_sessions enable row level security;

do $$ begin
  create policy "driver_sessions_public_insert" on public.driver_sessions
    for insert with check (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "driver_sessions_public_select" on public.driver_sessions
    for select using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "driver_sessions_public_delete" on public.driver_sessions
    for delete using (true);
exception when duplicate_object then null;
end $$;
