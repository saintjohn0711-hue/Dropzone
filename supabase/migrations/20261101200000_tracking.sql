-- DropZone live tracking events (xvfxjxmdtazihzuyyrsj ONLY)

create table if not exists public.tracking_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status text not null,
  note text,
  lat numeric,
  lon numeric,
  created_at timestamptz not null default now()
);

create index if not exists tracking_events_order_id_idx
  on public.tracking_events (order_id, created_at);

alter table public.tracking_events enable row level security;

do $$ begin
  create policy "tracking_events_public_select" on public.tracking_events
    for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "tracking_events_public_insert" on public.tracking_events
    for insert with check (true);
exception when duplicate_object then null;
end $$;

-- Optional last-known pin on orders
alter table public.orders add column if not exists last_lat numeric;
alter table public.orders add column if not exists last_lon numeric;
alter table public.orders add column if not exists last_tracked_at timestamptz;
