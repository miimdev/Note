-- 0005_links_versions.sql
-- Bidirectional link graph + version history.

create table if not exists public.note_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_note_id uuid not null references public.notes (id) on delete cascade,
  target_note_id uuid references public.notes (id) on delete cascade,
  target_title text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists note_links_unique_idx
  on public.note_links (source_note_id, coalesce(target_note_id::text, target_title));
create index if not exists note_links_target_idx on public.note_links (user_id, target_note_id);
create index if not exists note_links_source_idx on public.note_links (source_note_id);

drop trigger if exists trg_note_links_updated on public.note_links;
create trigger trg_note_links_updated
  before update on public.note_links
  for each row execute function public.set_updated_at();

alter table public.note_links enable row level security;

drop policy if exists note_links_all on public.note_links;
create policy note_links_all on public.note_links
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke all on public.note_links from anon;

-- Rebuild outgoing links from the raw text of a note.
create or replace function public.refresh_note_links(p_note_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_text text;
  m text[];
begin
  select user_id into v_user from public.notes where id = p_note_id;

  if v_user is null then
    return;
  end if;

  select public.tiptap_to_raw_text(content) into v_text from public.notes where id = p_note_id;

  delete from public.note_links where source_note_id = p_note_id;

  for m in
    select regexp_matches(coalesce(v_text, ''), '\[\[([^\]\n]{1,200})\]\]', 'g')
  loop
    declare
      ref_title text := btrim(m[1]);
      target uuid;
    begin
      if ref_title = '' then
        continue;
      end if;

      select id into target
      from public.notes
      where user_id = v_user
        and deleted_at is null
        and public.normalize_fa(title) = public.normalize_fa(ref_title)
      order by updated_at desc
      limit 1;

      insert into public.note_links (user_id, source_note_id, target_note_id, target_title)
      values (v_user, p_note_id, target, ref_title)
      on conflict do nothing;
    end;
  end loop;

  delete from public.note_links
  where source_note_id = p_note_id and target_note_id = p_note_id;
end;
$$;

create or replace function public.notes_after_write_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_note_links(new.id);
  return null;
end;
$$;

drop trigger if exists trg_notes_links on public.notes;
create trigger trg_notes_links
  after insert or update of content, title on public.notes
  for each row execute function public.notes_after_write_links();

-- When a note is created/renamed, resolve links that were dangling before.
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

-- Never keep a self-link.
create or replace function public.notes_drop_self_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.note_links
  where source_note_id = new.source_note_id and target_note_id = new.source_note_id;
  return null;
end;
$$;

drop trigger if exists trg_note_links_no_self on public.note_links;
create trigger trg_note_links_no_self
  after insert or update on public.note_links
  for each row execute function public.notes_drop_self_links();

-- Version history -------------------------------------------------------------
create table if not exists public.note_versions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  content jsonb not null,
  version integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (note_id, version)
);

create index if not exists note_versions_note_idx
  on public.note_versions (note_id, version desc);

alter table public.note_versions enable row level security;

drop policy if exists note_versions_select on public.note_versions;
create policy note_versions_select on public.note_versions
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists note_versions_insert on public.note_versions;
create policy note_versions_insert on public.note_versions
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists note_versions_delete on public.note_versions;
create policy note_versions_delete on public.note_versions
  for delete to authenticated using (auth.uid() = user_id);

revoke all on public.note_versions from anon;

-- Bounded history: snapshot when content/title changed and the newest existing
-- snapshot is older than 5 minutes (avoids one row per keystroke), keep 30.
create or replace function public.notes_snapshot_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  last_at timestamptz;
  keep constant int := 30;
begin
  if new.content is distinct from old.content or new.title is distinct from old.title then
    select max(created_at) into last_at from public.note_versions where note_id = old.id;

    if last_at is null or last_at < now() - interval '5 minutes' then
      insert into public.note_versions (note_id, user_id, title, content, version)
      values (old.id, old.user_id, old.title, old.content, old.version)
      on conflict (note_id, version) do nothing;

      delete from public.note_versions
      where note_id = old.id and version <= old.version - keep;
    end if;

    new.version := old.version + 1;
  end if;

  new.last_edited_at := now();
  return new;
end;
$$;

drop trigger if exists trg_notes_snapshot on public.notes;
create trigger trg_notes_snapshot
  before update on public.notes
  for each row execute function public.notes_snapshot_version();
