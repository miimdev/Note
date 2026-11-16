-- 0009_maintenance_realtime.sql
-- Trash purge (30 days), expiring shares and Realtime publication.

create or replace function public.purge_trashed_notes()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed int;
begin
  with d as (
    delete from public.notes
    where deleted_at is not null
      and deleted_at < now() - interval '30 days'
    returning 1
  )
  select count(*) into removed from d;

  return removed;
end;
$$;

revoke all on function public.purge_trashed_notes() from public, anon, authenticated;

create or replace function public.expire_shared_notes()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  touched int;
begin
  with u as (
    update public.shared_notes
    set is_active = false
    where is_active = true and expires_at is not null and expires_at <= now()
    returning 1
  )
  select count(*) into touched from u;

  return touched;
end;
$$;

revoke all on function public.expire_shared_notes() from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notes'
  ) then
    alter publication supabase_realtime add table public.notes;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reminders'
  ) then
    alter publication supabase_realtime add table public.reminders;
  end if;
end;
$$;
