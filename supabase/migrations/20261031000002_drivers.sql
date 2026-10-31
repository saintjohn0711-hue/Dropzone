-- DropZone drivers (run against project xvfxjxmdtazihzuyyrsj only)

create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text,
  vehicle_type text not null
    check (vehicle_type in ('car', 'pickup', 'box_truck', 'drone')),
  vehicle_detail text,
  license_plate text,
  status text not null default 'inactive'
    check (status in ('active', 'inactive')),
  locale text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists drivers_status_idx on public.drivers (status);
create index if not exists drivers_email_idx on public.drivers (email);

alter table public.drivers enable row level security;

-- Public insert for signup stub (tighten with Auth later)
do $$ begin
  create policy "drivers_public_insert" on public.drivers
    for insert with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "drivers_public_select" on public.drivers
    for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "drivers_public_update" on public.drivers
    for update using (true);
exception when duplicate_object then null;
end $$;
