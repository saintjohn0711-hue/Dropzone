-- DropZone dispatch — run in SQL Editor for xvfxjxmdtazihzuyyrsj ONLY
-- https://supabase.com/dashboard/project/xvfxjxmdtazihzuyyrsj/sql/new
-- Do NOT run against player1.

-- DropZone dispatch (xvfxjxmdtazihzuyyrsj ONLY)

alter table public.orders
  add column if not exists assigned_driver_id uuid references public.drivers (id) on delete set null;

alter table public.orders
  add column if not exists assigned_at timestamptz;

alter table public.orders
  add column if not exists driver_accepted_at timestamptz;

alter table public.orders
  add column if not exists driver_started_at timestamptz;

alter table public.orders
  add column if not exists driver_completed_at timestamptz;

alter table public.orders
  add column if not exists dispatch_notes text;

create index if not exists orders_assigned_driver_idx
  on public.orders (assigned_driver_id);

create index if not exists orders_status_assigned_idx
  on public.orders (status, assigned_driver_id);
