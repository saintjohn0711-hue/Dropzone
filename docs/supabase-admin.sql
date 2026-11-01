-- DropZone ADMIN backend schema
-- Run in SQL Editor for project xvfxjxmdtazihzuyyrsj ONLY
-- https://supabase.com/dashboard/project/xvfxjxmdtazihzuyyrsj/sql/new
-- Do NOT run against any player1 project.
-- Safe to re-run.

-- Application review status on drivers
alter table public.drivers
  add column if not exists application_status text
    check (
      application_status is null
      or application_status in ('pending', 'approved', 'rejected', 'suspended')
    );

alter table public.drivers
  add column if not exists admin_notes text;

alter table public.drivers
  add column if not exists reviewed_at timestamptz;

alter table public.drivers
  add column if not exists reviewed_by text;

update public.drivers
set application_status = coalesce(application_status, 'pending')
where application_status is null;

create index if not exists drivers_application_status_idx
  on public.drivers (application_status);

-- Admins (env-primary auth; table for audit / multi-admin)
create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text,
  password_hash text,
  role text not null default 'admin'
    check (role in ('admin', 'ops')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admins_email_idx on public.admins (email);

alter table public.admins enable row level security;

do $$ begin
  create policy "admins_service_select" on public.admins for select using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "admins_service_insert" on public.admins for insert with check (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "admins_service_update" on public.admins for update using (true);
exception when duplicate_object then null;
end $$;

create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.admins (id) on delete cascade,
  admin_email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_sessions_email_idx on public.admin_sessions (admin_email);
create index if not exists admin_sessions_expires_at_idx on public.admin_sessions (expires_at);

alter table public.admin_sessions enable row level security;

do $$ begin
  create policy "admin_sessions_insert" on public.admin_sessions for insert with check (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "admin_sessions_select" on public.admin_sessions for select using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "admin_sessions_delete" on public.admin_sessions for delete using (true);
exception when duplicate_object then null;
end $$;

-- Order status aliases (placed/assigned/canceled)
do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.orders'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%';
  if cname is not null then
    execute format('alter table public.orders drop constraint %I', cname);
  end if;
end $$;

alter table public.orders
  add constraint orders_status_check
  check (
    status in (
      'draft',
      'pending',
      'placed',
      'dispatched',
      'assigned',
      'en_route',
      'delivered',
      'cancelled',
      'canceled'
    )
  );

alter table public.orders
  add column if not exists admin_notes text;

alter table public.orders
  add column if not exists assigned_driver_id uuid references public.drivers (id) on delete set null;
