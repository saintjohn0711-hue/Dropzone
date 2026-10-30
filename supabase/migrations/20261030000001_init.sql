-- DropZone schema (dedicated project — never share with player1)
-- Apply in Supabase SQL editor or via CLI against the NEW "DropZone" project.

create extension if not exists "pgcrypto";

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  retailer text,
  address text,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  weight_class text check (weight_class in ('light', 'medium', 'heavy')),
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.product_offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products (id) on delete set null,
  sku text not null,
  store_slug text not null references public.stores (slug) on delete cascade,
  price numeric(12, 2) not null,
  currency text not null default 'USD',
  stock_signal text not null default 'unknown'
    check (stock_signal in ('in_stock', 'limited', 'low', 'out', 'unknown')),
  fetched_at timestamptz not null default now(),
  raw jsonb,
  unique (sku, store_slug)
);

create index if not exists product_offers_store_slug_idx on public.product_offers (store_slug);
create index if not exists product_offers_fetched_at_idx on public.product_offers (fetched_at desc);

-- Cart / orders stubs (auth wiring later)
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  session_key text,
  user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  product_offer_id uuid references public.product_offers (id) on delete set null,
  sku text,
  qty integer not null default 1 check (qty > 0),
  vehicle_id text,
  rush_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid references public.carts (id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'dispatched', 'en_route', 'delivered', 'cancelled')),
  total_cents integer,
  currency text not null default 'USD',
  delivery_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.product_offers enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;

-- Public read for catalog tables (tighten later)
create policy "stores_public_read" on public.stores for select using (true);
create policy "products_public_read" on public.products for select using (true);
create policy "product_offers_public_read" on public.product_offers for select using (true);
