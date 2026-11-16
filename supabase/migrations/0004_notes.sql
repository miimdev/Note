-- 0004_notes.sql
-- Core note table with full-text search vector, soft delete and versioning.

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  folder_id uuid references public.folders (id) on delete set null,
  title text not null default '',
  content jsonb not null default public.empty_doc(),
  content_text text not null default '',
  search_vector tsvector,
  icon text,
  cover_url text,
  is_pinned boolean not null default false,
  is_favorite boolean not null default false,
  is_archived boolean not null default false,
  deleted_at timestamptz,
  daily_date date,
  version integer not null default 1,
  last_edited_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_search_idx on public.notes using gin (search_vector);
create index if not exists notes_title_trgm_idx on public.notes using gin (title gin_trgm_ops);
create index if not exists notes_text_trgm_idx on public.notes using gin (content_text gin_trgm_ops);
create index if not exists notes_user_updated_idx
  on public.notes (user_id, updated_at desc) where deleted_at is null;
create index if not exists notes_user_folder_idx on public.notes (user_id, folder_id);
create index if not exists notes_user_pinned_idx
  on public.notes (user_id, is_pinned desc, updated_at desc) where deleted_at is null;
create index if not exists notes_trash_idx
  on public.notes (user_id, deleted_at desc) where deleted_at is not null;
create unique index if not exists notes_daily_unique
  on public.notes (user_id, daily_date) where daily_date is not null;

drop trigger if exists trg_notes_updated on public.notes;
create trigger trg_notes_updated
  before update on public.notes
  for each row execute function public.set_updated_at();

-- Derive content_text + search_vector on every write that touches content.
create or replace function public.notes_before_write()
returns trigger
language plpgsql
as $$
begin
  new.content_text := public.tiptap_to_text(new.content);
  new.search_vector :=
    setweight(to_tsvector('simple', public.normalize_fa(coalesce(new.title, ''))), 'A')
    || setweight(to_tsvector('simple', new.content_text), 'B');
  return new;
end;
$$;

drop trigger if exists trg_notes_search on public.notes;
create trigger trg_notes_search
  before insert or update of title, content on public.notes
  for each row execute function public.notes_before_write();

alter table public.notes enable row level security;

drop policy if exists notes_all on public.notes;
create policy notes_all on public.notes
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke all on public.notes from anon;
grant select, insert, update, delete on public.notes to authenticated;

-- Note <-> tag join table (lives here because it depends on notes).
create table if not exists public.note_tags (
  note_id uuid not null references public.notes (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (note_id, tag_id)
);

create index if not exists note_tags_user_tag_idx on public.note_tags (user_id, tag_id);
create index if not exists note_tags_note_idx on public.note_tags (note_id);

alter table public.note_tags enable row level security;

drop policy if exists note_tags_all on public.note_tags;
create policy note_tags_all on public.note_tags
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke all on public.note_tags from anon;
