-- Keep dangling [[wiki links]] in sync when a note is created or renamed.
-- The function lives in 0005; this migration records the standalone
-- `resolve_pending_links` change that was applied to the project so the
-- migration history matches the repository. It is fully idempotent.

create or replace function public.notes_resolve_pending_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.title <> '' then
    update public.note_links l
    set target_note_id = new.id, updated_at = now()
    where l.user_id = new.user_id
      and l.target_note_id is null
      and l.source_note_id <> new.id
      and public.normalize_fa(l.target_title) = public.normalize_fa(new.title)
      and not exists (
        select 1 from public.note_links d
        where d.source_note_id = l.source_note_id and d.target_note_id = new.id
      );
  end if;
  return null;
end;
$$;

drop trigger if exists trg_notes_resolve_links on public.notes;
create trigger trg_notes_resolve_links
  after insert or update of title on public.notes
  for each row execute function public.notes_resolve_pending_links();
