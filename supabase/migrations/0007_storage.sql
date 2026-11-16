-- 0007_storage.sql
-- Private bucket for note attachments; every object lives under {user_id}/...

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'note-attachments',
  'note-attachments',
  false,
  26214400, -- 25 MB
  array[
    'image/png','image/jpeg','image/webp','image/gif','image/svg+xml','image/avif',
    'application/pdf','text/plain','text/markdown','text/csv',
    'application/zip','application/json',
    'audio/mpeg','audio/ogg','audio/wav','video/mp4'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "note attachments read own" on storage.objects;
create policy "note attachments read own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'note-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "note attachments insert own" on storage.objects;
create policy "note attachments insert own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'note-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "note attachments update own" on storage.objects;
create policy "note attachments update own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'note-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'note-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "note attachments delete own" on storage.objects;
create policy "note attachments delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'note-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
