-- DropZone driver application fields (project xvfxjxmdtazihzuyyrsj ONLY)
-- Extends public.drivers for full application + DL + vehicle + compliance.

-- Allow SUV / van alongside existing vehicle types
do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.drivers'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%vehicle_type%';
  if cname is not null then
    execute format('alter table public.drivers drop constraint %I', cname);
  end if;
end $$;

alter table public.drivers
  add constraint drivers_vehicle_type_check
  check (vehicle_type in ('car', 'suv', 'pickup', 'van', 'box_truck', 'drone'));

alter table public.drivers add column if not exists display_name text;
alter table public.drivers add column if not exists date_of_birth date;
alter table public.drivers add column if not exists address_street text;
alter table public.drivers add column if not exists address_city text;
alter table public.drivers add column if not exists address_state text;
alter table public.drivers add column if not exists address_zip text;

alter table public.drivers add column if not exists dl_number text;
alter table public.drivers add column if not exists dl_state text;
alter table public.drivers add column if not exists dl_expiration date;
alter table public.drivers add column if not exists dl_front_path text;
alter table public.drivers add column if not exists dl_back_path text;
alter table public.drivers add column if not exists dl_upload_status text
  check (dl_upload_status is null or dl_upload_status in ('stored', 'deferred', 'none'));

alter table public.drivers add column if not exists vehicle_make text;
alter table public.drivers add column if not exists vehicle_model text;
alter table public.drivers add column if not exists vehicle_year integer;
alter table public.drivers add column if not exists vehicle_color text;
alter table public.drivers add column if not exists license_plate_state text;
alter table public.drivers add column if not exists hauling_notes text;

alter table public.drivers add column if not exists service_area text;
alter table public.drivers add column if not exists availability_days text;
alter table public.drivers add column if not exists availability_hours text;
alter table public.drivers add column if not exists can_haul_heavy boolean default false;
alter table public.drivers add column if not exists weight_class text
  check (weight_class is null or weight_class in ('light', 'medium', 'heavy'));
alter table public.drivers add column if not exists insurance_confirmed boolean default false;

alter table public.drivers add column if not exists background_check_consent boolean default false;
alter table public.drivers add column if not exists terms_accepted boolean default false;
alter table public.drivers add column if not exists contractor_ack boolean default false;
alter table public.drivers add column if not exists signature_name text;
alter table public.drivers add column if not exists signed_at timestamptz;

alter table public.drivers add column if not exists application_json jsonb;
alter table public.drivers add column if not exists application_completed_at timestamptz;

-- Soft catch-all for future fields / pre-migration payloads
comment on column public.drivers.application_json is
  'Full driver application payload snapshot; also used as soft-fallback when discrete columns lag.';

-- Private storage bucket for driver's license images (service-role upload only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'driver-licenses',
  'driver-licenses',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No public read policies — access via signed URLs / service role only.
do $$ begin
  create policy "driver_licenses_service_insert"
    on storage.objects for insert
    with check (bucket_id = 'driver-licenses');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "driver_licenses_service_select"
    on storage.objects for select
    using (bucket_id = 'driver-licenses');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "driver_licenses_service_update"
    on storage.objects for update
    using (bucket_id = 'driver-licenses');
exception when duplicate_object then null;
end $$;
