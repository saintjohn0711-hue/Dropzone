-- DropZone proof of delivery (xvfxjxmdtazihzuyyrsj ONLY)

alter table public.orders add column if not exists pod_path text;
alter table public.orders add column if not exists pod_captured_at timestamptz;
alter table public.orders add column if not exists pod_status text;
alter table public.orders add column if not exists pod_note text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'proof-of-delivery',
  'proof-of-delivery',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$ begin
  create policy "pod_service_insert"
    on storage.objects for insert
    with check (bucket_id = 'proof-of-delivery');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "pod_service_select"
    on storage.objects for select
    using (bucket_id = 'proof-of-delivery');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "pod_service_update"
    on storage.objects for update
    using (bucket_id = 'proof-of-delivery');
exception when duplicate_object then null;
end $$;
