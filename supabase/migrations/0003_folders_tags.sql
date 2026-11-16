-- 0003_folders_tags.sql

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  parent_id uuid references public.folders (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  color text,
  icon text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint folders_no_self_parent check (parent_id is distinct from id)
);

create index if not exists folders_user_parent_idx
  on public.folders (user_id, parent_id, position);

drop trigger if exists trg_folders_updated on public.folders;
create trigger trg_folders_updated
  before update on public.folders
  for each row execute function public.set_updated_at();

alter table public.folders enable row level security;

drop policy if exists folders_all on public.folders;
create policy folders_all on public.folders
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- A folder can never be moved under one of its own descendants.
create or replace function public.folders_no_cycle()
returns trigger
language plpgsql
as $$
declare
  cursor_id uuid := new.parent_id;
  depth int := 0;
begin
  while cursor_id is not null and depth < 64 loop
    if cursor_id = new.id then
      raise exception 'folder_cycle_detected';
    end if;
    select parent_id into cursor_id from public.folders where id = cursor_id;
    depth := depth + 1;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_folders_no_cycle on public.folders;
create trigger trg_folders_no_cycle
  before insert or update of parent_id on public.folders
  for each row execute function public.folders_no_cycle();

-- Tags ------------------------------------------------------------------------
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  slug text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create index if not exists tags_user_idx on public.tags (user_id, name);

drop trigger if exists trg_tags_updated on public.tags;
create trigger trg_tags_updated
  before update on public.tags
  for each row execute function public.set_updated_at();

alter table public.tags enable row level security;

drop policy if exists tags_all on public.tags;
create policy tags_all on public.tags
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke all on public.folders from anon;
revoke all on public.tags from anon;
