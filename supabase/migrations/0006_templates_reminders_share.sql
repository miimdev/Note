-- 0006_templates_reminders_share.sql
-- Templates (system + user), reminders, public sharing and attachment metadata.

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  description text,
  content jsonb not null,
  icon text,
  is_system boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists templates_user_idx on public.templates (user_id, position);

drop trigger if exists trg_templates_updated on public.templates;
create trigger trg_templates_updated
  before update on public.templates
  for each row execute function public.set_updated_at();

alter table public.templates enable row level security;

drop policy if exists templates_select on public.templates;
create policy templates_select on public.templates
  for select to authenticated using (auth.uid() = user_id or is_system);

drop policy if exists templates_insert on public.templates;
create policy templates_insert on public.templates
  for insert to authenticated with check (auth.uid() = user_id and is_system = false);

drop policy if exists templates_update on public.templates;
create policy templates_update on public.templates
  for update to authenticated
  using (auth.uid() = user_id and is_system = false)
  with check (auth.uid() = user_id and is_system = false);

drop policy if exists templates_delete on public.templates;
create policy templates_delete on public.templates
  for delete to authenticated using (auth.uid() = user_id and is_system = false);

revoke all on public.templates from anon;

-- Reminders -------------------------------------------------------------------
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  note_id uuid not null references public.notes (id) on delete cascade,
  remind_at timestamptz not null,
  is_done boolean not null default false,
  fired_at timestamptz,
  channel text not null default 'browser' check (channel in ('browser', 'in_app')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reminders_due_idx
  on public.reminders (user_id, remind_at) where is_done = false;
create index if not exists reminders_note_idx on public.reminders (note_id);

drop trigger if exists trg_reminders_updated on public.reminders;
create trigger trg_reminders_updated
  before update on public.reminders
  for each row execute function public.set_updated_at();

alter table public.reminders enable row level security;

drop policy if exists reminders_all on public.reminders;
create policy reminders_all on public.reminders
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Public sharing --------------------------------------------------------------
create table if not exists public.shared_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  note_id uuid not null references public.notes (id) on delete cascade,
  token text not null unique,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shared_notes_token_idx
  on public.shared_notes (token) where is_active;
create index if not exists shared_notes_note_idx on public.shared_notes (note_id);

drop trigger if exists trg_shared_notes_updated on public.shared_notes;
create trigger trg_shared_notes_updated
  before update on public.shared_notes
  for each row execute function public.set_updated_at();

alter table public.shared_notes enable row level security;

drop policy if exists shared_notes_all on public.shared_notes;
create policy shared_notes_all on public.shared_notes
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke all on public.shared_notes from anon;
revoke all on public.reminders from anon;

-- Attachments metadata --------------------------------------------------------
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  note_id uuid not null references public.notes (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists attachments_note_idx on public.attachments (note_id);
create index if not exists attachments_user_idx on public.attachments (user_id);

drop trigger if exists trg_attachments_updated on public.attachments;
create trigger trg_attachments_updated
  before update on public.attachments
  for each row execute function public.set_updated_at();

alter table public.attachments enable row level security;

drop policy if exists attachments_all on public.attachments;
create policy attachments_all on public.attachments
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke all on public.attachments from anon;
