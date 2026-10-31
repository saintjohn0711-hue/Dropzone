-- DropZone driver stats + reviews (project xvfxjxmdtazihzuyyrsj only)

alter table public.drivers
  add column if not exists drives_completed integer not null default 0
    check (drives_completed >= 0);

alter table public.drivers
  add column if not exists rating_avg numeric(3, 2)
    check (rating_avg is null or (rating_avg >= 0 and rating_avg <= 5));

alter table public.drivers
  add column if not exists rank_score integer not null default 0
    check (rank_score >= 0 and rank_score <= 100);

alter table public.drivers
  add column if not exists rank_tier text not null default 'bronze'
    check (rank_tier in ('bronze', 'silver', 'gold', 'elite'));

alter table public.drivers
  add column if not exists rank_position integer
    check (rank_position is null or rank_position > 0);

alter table public.drivers
  add column if not exists rank_area text;

create table if not exists public.driver_reviews (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers (id) on delete cascade,
  rating numeric(2, 1) not null check (rating >= 1 and rating <= 5),
  quote text not null,
  customer_first_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists driver_reviews_driver_id_idx
  on public.driver_reviews (driver_id);

create index if not exists driver_reviews_rating_idx
  on public.driver_reviews (driver_id, rating desc);

alter table public.driver_reviews enable row level security;

do $$ begin
  create policy "driver_reviews_public_select" on public.driver_reviews
    for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "driver_reviews_public_insert" on public.driver_reviews
    for insert with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "driver_reviews_public_update" on public.driver_reviews
    for update using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "driver_reviews_public_delete" on public.driver_reviews
    for delete using (true);
exception when duplicate_object then null;
end $$;
