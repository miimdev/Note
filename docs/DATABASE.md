# طرح دیتابیس — SQL

> این سند طرح اولیه و توضیح جداول است. **نسخه‌ی اجراشده و نهایی** در `supabase/migrations/` قرار دارد
> (۱۱ فایل شماره‌دار، اعمال‌شده روی پروژه `notebook-note`) و همان مرجع معتبر است.

---

## 0001 — extensions و توابع کمکی

```sql
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- نرمال‌سازی فارسی: ي→ی، ك→ک، حذف اعراب، ارقام فارسی/عربی → لاتین
create or replace function public.normalize_fa(input text)
returns text language plpgsql immutable as $$
declare out text;
begin
  if input is null then return ''; end if;
  out := translate(input, 'يكةۀأإآؤئ٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', 'یکهههههه01234567890123456789');
  out := regexp_replace(out, '[\u064B-\u065F\u0670\u0640]', '', 'g');
  out := regexp_replace(out, '\s+', ' ', 'g');
  return lower(trim(out));
end $$;
```

## 0002 — profiles

```sql
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  avatar_url  text,
  locale      text not null default 'fa' check (locale in ('fa','en')),
  theme       text not null default 'system' check (theme in ('light','dark','system')),
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_profiles_updated before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy profiles_select on public.profiles for select using (auth.uid() = user_id);
create policy profiles_insert on public.profiles for insert with check (auth.uid() = user_id);
create policy profiles_update on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ساخت خودکار پروفایل بعد از ثبت‌نام
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, user_id, display_name)
  values (new.id, new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();
```

## 0003 — folders

```sql
create table public.folders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  parent_id  uuid references public.folders(id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 120),
  color      text,
  icon       text,
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint folders_no_self_parent check (parent_id is distinct from id)
);

create index folders_user_parent_idx on public.folders (user_id, parent_id, position);
create trigger trg_folders_updated before update on public.folders
for each row execute function public.set_updated_at();

alter table public.folders enable row level security;
create policy folders_all on public.folders for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

## 0004 — notes

```sql
create table public.notes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  folder_id     uuid references public.folders(id) on delete set null,
  title         text not null default '',
  content       jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  content_text  text not null default '',
  search_vector tsvector,
  icon          text,
  cover_url     text,
  is_pinned     boolean not null default false,
  is_favorite   boolean not null default false,
  is_archived   boolean not null default false,
  deleted_at    timestamptz,
  daily_date    date,
  version       integer not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index notes_search_idx      on public.notes using gin (search_vector);
create index notes_title_trgm_idx  on public.notes using gin (title gin_trgm_ops);
create index notes_text_trgm_idx   on public.notes using gin (content_text gin_trgm_ops);
create index notes_user_updated_idx on public.notes (user_id, updated_at desc) where deleted_at is null;
create index notes_user_folder_idx  on public.notes (user_id, folder_id);
create index notes_user_pinned_idx  on public.notes (user_id, is_pinned desc, updated_at desc) where deleted_at is null;
create unique index notes_daily_unique on public.notes (user_id, daily_date) where daily_date is not null;

create trigger trg_notes_updated before update on public.notes
for each row execute function public.set_updated_at();

-- متن مسطح + بردار جستجو
create or replace function public.notes_before_write()
returns trigger language plpgsql as $$
begin
  if new.content_text is null or new.content_text = '' then
    new.content_text := public.normalize_fa(public.tiptap_to_text(new.content));
  end if;
  new.search_vector :=
      setweight(to_tsvector('simple', public.normalize_fa(coalesce(new.title,''))), 'A')
   || setweight(to_tsvector('simple', new.content_text), 'B');
  return new;
end $$;

create trigger trg_notes_search before insert or update of title, content, content_text on public.notes
for each row execute function public.notes_before_write();

alter table public.notes enable row level security;
create policy notes_all on public.notes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

`tiptap_to_text(jsonb)` یک تابع کمکی plpgsql است که به‌صورت بازگشتی روی `content` حرکت می‌کند و `text` بلاک‌ها را با `\n` می‌چسباند.

## 0005 — tags / note_tags

```sql
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  slug text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table public.note_tags (
  note_id uuid not null references public.notes(id) on delete cascade,
  tag_id  uuid not null references public.tags(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, tag_id)
);
create index note_tags_user_tag_idx on public.note_tags (user_id, tag_id);

alter table public.tags enable row level security;
create policy tags_all on public.tags for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table public.note_tags enable row level security;
create policy note_tags_all on public.note_tags for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

## 0006 — note_links

```sql
create table public.note_links (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  source_note_id uuid not null references public.notes(id) on delete cascade,
  target_note_id uuid references public.notes(id) on delete cascade,
  target_title   text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index note_links_unique on public.note_links (source_note_id, coalesce(target_note_id::text, target_title));
create index note_links_target_idx on public.note_links (user_id, target_note_id);

alter table public.note_links enable row level security;
create policy note_links_all on public.note_links for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

استخراج لینک‌ها در تریگر بعد از insert/update `content` انجام می‌شود (regexp روی متن مسطح + resolve عنوان موجود).

## 0007 — note_versions

```sql
create table public.note_versions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  content jsonb not null,
  version integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (note_id, version)
);
create index note_versions_note_idx on public.note_versions (note_id, version desc);

alter table public.note_versions enable row level security;
create policy note_versions_select on public.note_versions for select using (auth.uid() = user_id);
create policy note_versions_insert on public.note_versions for insert with check (auth.uid() = user_id);
create policy note_versions_delete on public.note_versions for delete using (auth.uid() = user_id);
```

snapshot قبل از update در `notes_snapshot_version()` (آستانه‌ی زمانی ۵ دقیقه) و افزایش `version`.

## 0008 — reminders / templates / shared_notes / attachments

```sql
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  remind_at timestamptz not null,
  is_done boolean not null default false,
  fired_at timestamptz,
  channel text not null default 'browser',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reminders_due_idx on public.reminders (user_id, remind_at) where is_done = false;

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,   -- null برای قالب سیستمی
  name text not null,
  content jsonb not null,
  icon text,
  is_system boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shared_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shared_notes_token_idx on public.shared_notes (token) where is_active;

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  width integer, height integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reminders enable row level security;
create policy reminders_all on public.reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.templates enable row level security;
create policy templates_select on public.templates for select using (auth.uid() = user_id or is_system);
create policy templates_write on public.templates for all
  using (auth.uid() = user_id and not is_system)
  with check (auth.uid() = user_id and not is_system);

alter table public.shared_notes enable row level security;
create policy shared_all on public.shared_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.attachments enable row level security;
create policy attachments_all on public.attachments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

> `templates` با دو policy جدا نوشته می‌شود (select جدا و write با `for all` تفکیک‌شده) تا قالب‌های سیستمی برای همه قابل خواندن باشند.

## 0009 — Storage

```sql
insert into storage.buckets (id, name, public, file_size_limit)
values ('note-attachments', 'note-attachments', false, 26214400)
on conflict (id) do nothing;

create policy "own files read" on storage.objects for select
  using (bucket_id = 'note-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own files write" on storage.objects for insert
  with check (bucket_id = 'note-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own files update" on storage.objects for update
  using (bucket_id = 'note-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own files delete" on storage.objects for delete
  using (bucket_id = 'note-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
```

## 0010 — RPCها

```sql
-- جستجوی دوزبانه با تحمل خطا
create or replace function public.search_notes(q text, lim int default 25, off int default 0)
returns table (id uuid, title text, snippet text, rank real, updated_at timestamptz)
language sql stable security invoker set search_path = public as $$
  with norm as (select public.normalize_fa(q) as n),
  tsq as (select websearch_to_tsquery('simple', (select n from norm)) as q)
  select n.id, n.title,
         left(coalesce(n.content_text,''), 240) as snippet,
         greatest(
           ts_rank(n.search_vector, (select q from tsq)),
           similarity(n.title, (select n from norm))
         )::real as rank,
         n.updated_at
  from public.notes n
  where n.user_id = auth.uid() and n.deleted_at is null
    and (
      n.search_vector @@ (select q from tsq)
      or n.title % (select n from norm)
      or n.content_text ilike '%' || (select n from norm) || '%'
    )
  order by rank desc, n.updated_at desc
  limit lim offset off;
$$;

-- خواندن سهم عمومی (security definer)
create or replace function public.get_shared_note(share_token text)
returns table (title text, content jsonb, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select n.title, n.content, n.updated_at
  from public.shared_notes s
  join public.notes n on n.id = s.note_id
  where s.token = share_token
    and s.is_active
    and (s.expires_at is null or s.expires_at > now())
    and n.deleted_at is null
  limit 1;
$$;
revoke all on function public.get_shared_note(text) from public;
grant execute on function public.get_shared_note(text) to anon, authenticated;

-- پاک‌سازی سطل زباله (۳۰ روز)
create or replace function public.purge_trashed_notes()
returns integer language sql security definer set search_path = public as $$
  with d as (delete from public.notes where deleted_at < now() - interval '30 days' returning 1)
  select count(*)::int from d;
$$;
```

## 0011 — Realtime

```sql
alter publication supabase_realtime add table public.notes;
alter publication supabase_realtime add table public.reminders;
```

## 0012 — قالب‌های سیستمی (seed)

```sql
insert into public.templates (user_id, name, is_system, icon, content) values
 (null, 'جلسه', true, '📅', '{...}'),
 (null, 'لیست کارها', true, '✅', '{...}'),
 (null, 'ژورنال', true, '📔', '{...}'),
 (null, 'پروژه', true, '🚀', '{...}')
on conflict do nothing;
```

---

## نکات اجرایی

1. **همه‌ی migrationها idempotent نیستند** (create table). اجرای دوباره نیاز به بازنشانی ندارد چون Supabase migration را یک‌بار اجرا می‌کند.
2. `notes.content_text` نرمال‌شده ذخیره می‌شود؛ اگر متن خام هم لازم شد، در TS از سند TipTap بازتولید می‌شود.
3. `search_vector` با config `simple` ساخته شد تا فارسی بدون توکنایزر خاص کار کند؛ `pg_trgm` بار «غلط املایی» را می‌کشد.
4. RLS هیچ policy برای `anon` روی جدول‌ها ندارد؛ تنها مجرای عمومی `get_shared_note` است.
5. تریگر روی `auth.users` (`on_auth_user_created`) باید با دسترسی admin ساخته شود — در migration پروژه‌ی Supabase مجاز است.

**لطفاً این سند + `ARCHITECTURE.md` را تایید کنید تا مرحله ۲ (ساخت پروژه، اسکافولد، اجرای migration) شروع شود.**

---

## تأیید اجرای migrationها روی پروژه‌ی واقعی

پروژه: `efvnoyrqqkotbeyjlfzm` — آخرین بررسی: **۱۴۰۴/۰۸/۲۵** (2026-11-16)

### جدول‌ها و RLS

۱۱ جدول در schema `public`؛ RLS روی همه فعال است (`profiles` با `force`).

| جدول            | RLS | force | policy |
| --------------- | --- | ----- | ------ |
| `attachments`   | ✅  | –     | ۱      |
| `folders`       | ✅  | –     | ۱      |
| `note_links`    | ✅  | –     | ۱      |
| `note_tags`     | ✅  | –     | ۱      |
| `note_versions` | ✅  | –     | ۳      |
| `notes`         | ✅  | –     | ۱      |
| `profiles`      | ✅  | ✅    | ۳      |
| `reminders`     | ✅  | –     | ۱      |
| `shared_notes`  | ✅  | –     | ۱      |
| `tags`          | ✅  | –     | ۱      |
| `templates`     | ✅  | –     | ۴      |

### تریگرها (`tgenabled = 'O'` یعنی فعال)

| تریگر                      | جدول           | تابع                          |
| -------------------------- | -------------- | ----------------------------- |
| `trg_notes_search`         | `notes`        | `notes_before_write`          |
| `trg_notes_links`          | `notes`        | `notes_after_write_links`     |
| `trg_notes_resolve_links`  | `notes`        | `notes_resolve_pending_links` |
| `trg_notes_snapshot`       | `notes`        | `notes_snapshot_version`      |
| `trg_notes_updated`        | `notes`        | `set_updated_at`              |
| `trg_note_links_no_self`   | `note_links`   | `notes_drop_self_links`       |
| `trg_note_links_updated`   | `note_links`   | `set_updated_at`              |
| `trg_folders_no_cycle`     | `folders`      | `folders_no_cycle`            |
| `trg_folders_updated`      | `folders`      | `set_updated_at`              |
| `trg_reminders_updated`    | `reminders`    | `set_updated_at`              |
| `trg_tags_updated`         | `tags`         | `set_updated_at`              |
| `trg_templates_updated`    | `templates`    | `set_updated_at`              |
| `trg_shared_notes_updated` | `shared_notes` | `set_updated_at`              |
| `trg_attachments_updated`  | `attachments`  | `set_updated_at`              |
| `trg_profiles_updated`     | `profiles`     | `set_updated_at`              |
| `on_auth_user_created`     | `auth.users`   | `handle_new_user`             |

### تابع‌های `security definer` با `search_path` قفل‌شده

`expire_shared_notes`, `get_shared_note`, `handle_new_user`, `notes_after_write_links`,
`notes_drop_self_links`, `notes_resolve_pending_links`, `notes_snapshot_version`,
`purge_trashed_notes`, `refresh_note_links` — همه با `SET search_path = public`.

تابع‌های `search_notes`, `related_notes`, `note_graph`, `suggest_note_titles`
`security invoker` هستند و به RLS کاربر تکیه می‌کنند (درست، چون داده‌ی خصوصی است).

### آزمون دودی تریگرها (idempotent، با `rollback`)

در یک تراکنش و با `rollback` انتها:

1. ایجاد یادداشت «zzz probe target» و «zzz probe source» که `[[zzz probe target]]` دارد
   → `content_text` به `[[zzz probe target]]` تبدیل شد (تریگر `trg_notes_search` ✅)
   → `search_vector` پر شد ✅
   → لینک خروجی **resolve شد** (`note_links.target_note_id` پر) ✅
2. تغییر عنوان منبع (نسخه ۱ → ۲)
   → `version` به ۲ رفت و یک ردیف در `note_versions` با محتوای نسخه‌ی قبلی ثبت شد
   (`trg_notes_snapshot` + throttle پنج‌دقیقه‌ای + نگه‌داشتن ۳۰ نسخه) ✅

هیچ داده‌ای روی پروژه باقی نماند؛ `notes` همان ۳ ردیف قبلی است.
