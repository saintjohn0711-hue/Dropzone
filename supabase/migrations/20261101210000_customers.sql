-- DropZone customer accounts (xvfxjxmdtazihzuyyrsj ONLY)

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  created_at timestamptz not null default now()
);

create index if not exists customers_email_idx on public.customers (email);

alter table public.customers enable row level security;

do $$ begin
  create policy "customers_public_select" on public.customers for select using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "customers_public_insert" on public.customers for insert with check (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "customers_public_update" on public.customers for update using (true);
exception when duplicate_object then null;
end $$;

create table if not exists public.customer_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists customer_sessions_customer_id_idx
  on public.customer_sessions (customer_id);
create index if not exists customer_sessions_expires_at_idx
  on public.customer_sessions (expires_at);

alter table public.customer_sessions enable row level security;

do $$ begin
  create policy "customer_sessions_public_insert" on public.customer_sessions
    for insert with check (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "customer_sessions_public_select" on public.customer_sessions
    for select using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "customer_sessions_public_delete" on public.customer_sessions
    for delete using (true);
exception when duplicate_object then null;
end $$;

create table if not exists public.customer_jobsites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  label text not null default 'Jobsite',
  address text not null,
  created_at timestamptz not null default now()
);

create index if not exists customer_jobsites_customer_id_idx
  on public.customer_jobsites (customer_id);

alter table public.customer_jobsites enable row level security;

do $$ begin
  create policy "customer_jobsites_public_select" on public.customer_jobsites
    for select using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "customer_jobsites_public_insert" on public.customer_jobsites
    for insert with check (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "customer_jobsites_public_delete" on public.customer_jobsites
    for delete using (true);
exception when duplicate_object then null;
end $$;

alter table public.orders add column if not exists customer_id uuid references public.customers (id);
alter table public.orders add column if not exists contact_email text;

create index if not exists orders_customer_id_idx on public.orders (customer_id);
create index if not exists orders_contact_email_idx on public.orders (contact_email);
