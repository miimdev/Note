# معماری «دفترچه یادداشت هوشمند» (Note)

> نسخه‌ی سند: ۱.۰ — مرحله ۱ (معماری و طرح دیتابیس)
> وضعیت: **در انتظار تایید** — تا تایید شما هیچ migration‌ای اجرا نمی‌شود.

---

## ۰) خلاصه‌ی اجرایی

یک وب‌اپ PWA با Next.js App Router که سه چیز را همزمان حل می‌کند:

1. **سرعت نوشتن** — ادیتور بلاکی TipTap با اسلش‌کامند، مارک‌داون، autosave محلی (IndexedDB) و همگام‌سازی پس‌زمینه.
2. **شبکه‌ی دانش** — لینک دوطرفه‌ی `[[...]]`، بک‌لینک، گراف، پیشنهاد مرتبط.
3. **دوام داده** — offline-first واقعی با صف عملیات (outbox)، نسخه‌گذاری و حل تداخل با تصمیم کاربر.

قیدهای سخت: RTL کامل + فونت فارسی + جستجوی دوزبانه با `pg_trgm`، بدون هیچ کلید در گیت، همه‌ی تغییرات DB فقط از طریق migration.

---

## ۱) تصمیم‌های معماری (ADR کوتاه)

| # | تصمیم | جایگزین رد‌شده | چرا |
|---|-------|----------------|-----|
| ADR-1 | **Supabase پروژه‌ی کاملاً جدید** (`notebook-note`) | استفاده از `public` پروژه‌ی kenaret | kenaret داده‌ی زنده و جدول `profiles` دارد؛ قید «هیچ تغییر در داده‌ی موجود» |
| ADR-2 | محتوا در `notes.content` به‌صورت **JSONB = سند TipTap**، و متن مسطح در `content_text` | HTML خام | JSONB ساختارمند و قابل sanitize، متن مسطح برای جستجو و word-count |
| ADR-3 | **offline-first**: Dexie منبع حقیقت محلی، Supabase مقصد | server-first + optimistic UI | الزام «کارکرد کامل آفلاین»؛ نوشتن آفلاین بدون تردید |
| ADR-4 | حل تداخل با **`version` عددی + مقایسه‌ی نسخه‌ها** (نه last-write-wins) | LWW کور | الزام «نمایش پیغام در صورت نیاز به تصمیم کاربر» |
| ADR-5 | `note_links` **صریح ذخیره می‌شود** (نه view محاسباتی) | استخراج در زمان خواندن | بک‌لینک و گراف سریع + امکان رفرنس به یادداشت ناموجود (dangling link) |
| ADR-6 | جستجو با `tsvector` (GIN) + `pg_trgm` برای تحمل غلط املایی، **config ساده‌ی `simple`** | `english`/`persian` config | `simple` برای فارسی و انگلیسی یکسان عمل می‌کند و به دیکشنری وابسته نیست |
| ADR-7 | اشتراک‌گذاری عمومی فقط با **token** و یک **RPC با `security definer`** | RLS روی جدول + anon key | anon نباید به جدول‌ها دسترسی داشته باشد؛ فقط یک تابع محدود |
| ADR-8 | PDF با **print stylesheet + `window.print()`** | Playwright سمت سرور | سبک، RTL دقیق، بدون هزینه‌ی اجرای DLL روی Vercel |
| ADR-9 | AI پشت feature flag و از **Route Handler** با `OPENROUTER_API_KEY` | تماس مستقیم مرورگر | کلید فقط سمت سرور |
| ADR-10 | TipTap با **Extension‌های بلاکی** و `UniqueID` روی هر بلاک | ادیتور HTML آزاد | drag & drop بلاک، undo/redo، و پایداری شناسه‌ها برای همگام‌سازی |

---

## ۲) نمای سیستم (C4 سطح ۲)

```
┌─────────────────────────── Browser (PWA) ────────────────────────────┐
│  App Router (RSC)  ──  Client Components                              │
│        │                    │                                        │
│        │            ┌───────┴────────┐                               │
│        │            │ Zustand (UI)   │  theme, sidebar, focus mode   │
│        │            │ TanStack Query │  server state + cache/retry   │
│        │            └───────┬────────┘                               │
│        │                    │                                        │
│        │            ┌───────┴────────┐   ┌────────────────────┐      │
│        │            │  Dexie (IDB)   │◄─►│  Sync Engine       │      │
│        │            │ notes,outbox,  │   │  outbox → push     │      │
│        │            │ versions,meta │   │  realtime → pull   │      │
│        │            └────────────────┘   └─────────┬──────────┘      │
└────────────────────────────────────────────────────┼─────────────────┘
                                                     │ HTTPS / WSS
┌────────────────────────────────────────────────────▼─────────────────┐
│ Next.js on Vercel                                                     │
│   /app/(auth)  /app/(workspace)  /s/[token]  /print/[id]              │
│   Route Handlers: /api/ai/*, /api/export/zip, /api/share/[token]      │
└────────────────────────────────────────────────────┬─────────────────┘
                                                     │ supabase-js (RLS)
┌────────────────────────────────────────────────────▼─────────────────┐
│ Supabase: Auth (email+Google) · Postgres (RLS) · Realtime · Storage   │
└───────────────────────────────────────────────────────────────────────┘
```

**جریان نوشتن:** keystroke → TipTap state → debounce ۸۰۰ms → Dexie `notes` + `outbox` (وضعیت «در حال ذخیره») → push به Supabase (وضعیت «ذخیره شد») → استخراج لینک‌ها + `content_text` سمت DB با تریگر.

**جریان خواندن:** RSC پوسته را می‌دهد → IndexedDB hydrate می‌شود → Realtime فقط `notes` تغییر‌یافته را pull می‌کند → اگر `incoming.version > local.base_version && local در outbox است` → conflict.

---

## ۳) ساختار پوشه‌ها

```
Note/
├─ app/
│  ├─ layout.tsx                  # html lang/dir, fonts, Providers, Toaster
│  ├─ globals.css                 # tailwind + design tokens + print styles
│  ├─ page.tsx                    # redirect: /notes یا /login
│  ├─ (auth)/
│  │  ├─ login/page.tsx           # ایمیل/رمز + Google
│  │  ├─ signup/page.tsx          # تایید ایمیل
│  │  ├─ forgot-password/page.tsx
│  │  ├─ reset-password/page.tsx
│  │  └─ callback/route.ts        # تبادل code → session (PKCE)
│  ├─ (workspace)/
│  │  ├─ layout.tsx               # Sidebar + CommandPalette + Shortcuts
│  │  ├─ notes/page.tsx           # همه یادداشت‌ها (فیلتر/مرتب‌سازی)
│  │  ├─ notes/[id]/page.tsx      # ادیتور + پنل بک‌لینک/متادیتا
│  │  ├─ folders/[id]/page.tsx
│  │  ├─ tags/[slug]/page.tsx
│  │  ├─ daily/page.tsx           # یادداشت روزانه (جلالی/میلادی)
│  │  ├─ graph/page.tsx           # lazy: گراف
│  │  ├─ templates/page.tsx
│  │  ├─ archive/page.tsx
│  │  ├─ trash/page.tsx
│  │  ├─ reminders/page.tsx
│  │  ├─ search/page.tsx          # نتایج + هایلایت
│  │  └─ settings/page.tsx        # پروفایل، تم، locale، AI flag
│  ├─ s/[token]/page.tsx          # نمای عمومی فقط‌خواندنی
│  ├─ print/[id]/page.tsx         # چیدمان چاپ/PDF
│  └─ api/
│     ├─ ai/route.ts              # summarize|rewrite|fix|translate|actions|tags
│     ├─ export/zip/route.ts      # zip همه‌ی یادداشت‌ها
│     └─ share/[token]/route.ts   # خواندن امن سهم
├─ components/
│  ├─ ui/                         # shadcn/ui (button, dialog, dropdown, ...)
│  ├─ layout/                     # sidebar, topbar, mobile-nav, theme-toggle
│  ├─ common/                     # empty-state, loader, error-boundary, confirm
│  └─ providers.tsx               # QueryClient, Theme, Direction, Auth
├─ features/
│  ├─ editor/                     # TipTap: extensions, slash-menu, bubble-menu,
│  │                              #   block-drag, counters, autosave hook
│  ├─ notes/                      # list, card, actions, metadata panel
│  ├─ folders/  ├─ tags/
│  ├─ links/                      # backlinks, suggestions
│  ├─ graph/                      # lazy-load شده (d3-force یا cytoscape)
│  ├─ search/                     # query builder + highlight
│  ├─ command-palette/
│  ├─ versions/                   # history, diff, restore
│  ├─ sync/                       # engine, outbox, realtime, conflict UI
│  ├─ share/  ├─ export/
│  ├─ reminders/  ├─ templates/
│  └─ ai/
├─ lib/
│  ├─ supabase/{client,server,middleware}.ts
│  ├─ db/                         # Dexie schema + repositories
│  ├─ validation/                 # Zod schemas (note, folder, tag, share, ai)
│  ├─ editor/                     # tiptap JSON ↔ text/markdown/html, sanitize
│  ├─ jalali.ts                   # تاریخ شمسی (date-fns-jalali)
│  ├─ text-direction.ts           # تشخیص dir هر بلاک
│  ├─ search-query.ts             # ساخت پارامترهای tsquery/trigram
│  └─ utils.ts
├─ hooks/                         # useDebounce, useHotkeys, useOnline, useMediaQuery
├─ store/                         # ui-store, editor-store, sync-store, prefs-store
├─ types/                         # database.types.ts (generated), domain.ts
├─ supabase/migrations/           # SQL نسخه‌دار
├─ scripts/                       # seed, gen-types
├─ tests/                         # unit (vitest) + e2e (playwright)
├─ public/                        # icons, manifest, fonts (Vazirmatn woff2)
├─ docs/                          # ARCHITECTURE.md, DATABASE.md, AI notes
├─ .env.example
└─ README.md
```

**قاعده‌ی مرزها:** `app/` فقط ترکیب می‌کند؛ منطق تجاری در `features/*`؛ دسترسی داده فقط از `lib/db` و `lib/supabase`؛ هیچ کامپوننتی مستقیم `createClient()` صدا نمی‌زند.

---

## ۴) طرح دیتابیس

### ۴.۱ قواعد عمومی
- همه‌ی جدول‌ها: `id uuid primary key default gen_random_uuid()`, `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`.
- `user_id uuid not null references auth.users(id) on delete cascade` در همه‌ی جدول‌های شخصی.
- تریگر عمومی `set_updated_at()` روی همه‌ی جدول‌های دارای `updated_at`.
- RLS روی **همه‌ی** جدول‌ها فعال + policy برای `select/insert/update/delete` با `auth.uid() = user_id`.
- دسترسی‌ها: `revoke all on ... from anon` روی جدول‌های خصوصی.

### ۴.۲ جدول‌ها

#### profiles
| ستون | نوع | توضیح |
|---|---|---|
| id | uuid PK | همان `auth.users.id` (1:1) |
| user_id | uuid unique not null → auth.users | برای یکدستی با بقیه‌ی جدول‌ها |
| display_name | text | |
| avatar_url | text | |
| locale | text default `'fa'` | `fa` \| `en` |
| theme | text default `'system'` | `light` \| `dark` \| `system` |
| settings | jsonb default `'{}'` | `{ calendar:'jalali'\|'gregorian', direction:'auto', aiEnabled:bool, editorFont, ... }` |

ایندکس: `(user_id)` unique. پر شدن خودکار با تریگر `handle_new_user()` روی `auth.users`.

#### folders
`user_id`, `parent_id uuid null → folders(id) on delete cascade`, `name text not null`, `color text`, `icon text`, `position int default 0`
- ایندکس: `(user_id, parent_id, position)`
- قید: `parent_id <> id` (جلوگیری از self-parent). جلوگیری از حلقه در سطح اپ + تابع کمکی `is_descendant` (اختیاری در فاز بعد).

#### notes
| ستون | نوع | توضیح |
|---|---|---|
| user_id, folder_id | uuid | `folder_id → folders(id) on delete set null` |
| title | text default `''` | |
| content | jsonb default سند خالی TipTap | |
| content_text | text default `''` | متن مسطح، با تریگر از `content` |
| search_vector | tsvector | `setweight(title,'A') || setweight(content_text,'B')` |
| icon, cover_url | text | |
| is_pinned, is_favorite, is_archived | bool default false | |
| deleted_at | timestamptz null | soft delete (سطل زباله) |
| version | int default 1 | base_version برای تعارض |
| daily_date | date null | برای یادداشت روزانه یکتا در روز |
| last_synced_at | timestamptz | سلامت‌سنجی |

ایندکس‌ها:
- `gin (search_vector)`
- `(user_id, updated_at desc) where deleted_at is null`
- `(user_id, folder_id)`, `(user_id, is_pinned desc, updated_at desc)`
- `unique (user_id, daily_date) where daily_date is not null`
- `gin (content jsonb_path_ops)` (اختیاری، برای جستجوی ساختاری آینده)

#### tags و note_tags
`tags`: `user_id`, `name text not null`, `slug text not null`, `color text`, unique `(user_id, slug)`.
`note_tags`: `note_id`, `tag_id`, `user_id`, PK `(note_id, tag_id)`, cascade از هر دو سمت. ایندکس `(user_id, tag_id)`.

#### note_links
`user_id`, `source_note_id → notes on delete cascade`, `target_note_id → notes on delete cascade`, `target_title text` (برای dangling)، unique `(source_note_id, target_note_id)`.
ایندکس: `(target_note_id)` برای بک‌لینک، `(source_note_id)`.
> استخراج `[[...]]` در تریگر روی `notes.content` انجام می‌شود و لینک‌های یتیم (بدون target) با `target_note_id null` نگه داشته می‌شوند.

#### note_versions
`note_id`, `user_id`, `title`, `content jsonb`, `version int`, `created_at`.
- unique `(note_id, version)`، ایندکس `(note_id, version desc)`.
- سیاست نگه‌داری: ۲ نسخه‌ی اخیر همیشه + حداکثر ۵۰ نسخه، پاک‌سازی با تابع `prune_note_versions()` (cron یا در حین insert).
- ساخت نسخه با تریگر BEFORE UPDATE روی notes وقتی محتوا/عنوان تغییر کند و > ۵ دقیقه از نسخه‌ی آخر گذشته باشد (کاهش نویز).

#### reminders
`note_id`, `user_id`, `remind_at timestamptz not null`, `is_done bool default false`, `fired_at timestamptz null`, `channel text default 'browser'`.
ایندکس `(user_id, remind_at) where is_done = false`.

#### templates
`user_id`, `name`, `content jsonb`, `icon`, `is_system bool default false`, `position int`.
> قالب‌های آماده (جلسه، کارها، ژورنال، پروژه) به‌صورت ردیف‌های `is_system = true` ساخته می‌شوند. برای این که هر کاربر بتواند آن‌ها را ببیند بدون نقض RLS، policy خواندن: `user_id = auth.uid() or is_system = true`.

#### shared_notes
`note_id`, `user_id`, `token text unique not null` (۱۶+ بایت base64url), `expires_at timestamptz null`, `is_active bool default true`, `created_at`.
- ایندکس `unique (token) where is_active`.
- سیاست: هیچ policy برای anon. خواندن عمومی فقط با RPC زیر.

```sql
-- قرارداد (در مرحله ۶ پیاده می‌شود)
create function public.get_shared_note(share_token text)
returns table (title text, content jsonb, created_at timestamptz, expires_at timestamptz)
language sql security definer set search_path = public as $$ ... $$;
-- فقط اگر is_active و (expires_at is null or expires_at > now())
```

#### attachments
`note_id`, `user_id`, `storage_path text not null`, `file_name`, `mime_type`, `size_bytes bigint`, `width`, `height`.
- Storage bucket `note-attachments` **خصوصی**؛ مسیر `{user_id}/{note_id}/{uuid}.{ext}`.
- Storage policies: `select/insert/delete` با `(storage.foldername(name))[1] = auth.uid()::text`.
- Public URLs فقط از طریق signed URL کوتاه‌مدت.

#### activity_log (پیشنهاد افزوده)
`user_id`, `entity`, `entity_id`, `action`, `meta jsonb` — برای «آخرین تغییرات» و اشکال‌زدایی همگام‌سازی. سبک و قابل prune.

### ۴.۳ توابع و تریگرهای کلیدی
| نام | نوع | کار |
|---|---|---|
| `set_updated_at()` | trigger | `new.updated_at = now()` |
| `handle_new_user()` | trigger on auth.users | ساخت `profiles` + قالب‌های پیش‌فرض |
| `notes_search_vector_update()` | trigger on notes | ساخت `content_text` (اگر null) و `search_vector` |
| `notes_extract_links()` | trigger after insert/update content | همگام‌سازی `note_links` |
| `notes_snapshot_version()` | trigger before update | ثبت `note_versions` + `version = version + 1` |
| `soft_delete_expired_notes()` | function | حذف قطعی notes با `deleted_at < now() - 30 days` |
| `search_notes(q text, ...)` | RPC | ترکیب `websearch_to_tsquery` + شباهت trigram، صفحه‌بندی، exclude deleted |
| `get_shared_note(token)` | RPC security definer | خواندن عمومی سهم |
| `prune_note_versions(note_id)` | function | نگه‌داری نسخه‌ها |

### ۴.۴ استراتژی جستجو (فارسی + انگلیسی + غلط املایی)
```sql
-- مرحله ۱: دقیق/ریشه‌ای
websearch_to_tsquery('simple', :q)
-- مرحله ۲: اگر نتیجه کم بود، تحمل خطا
similarity(title, :q) > 0.25 OR title % :q
OR EXISTS (select 1 from unnest(:terms) t where content_text ILIKE '%'||t||'%' or similarity(content_text, t) > 0.2)
```
- `pg_trgm` + ایندکس `gin (title gin_trgm_ops)` و `gin (content_text gin_trgm_ops)`.
- نرمال‌سازی فارسی قبل از ایندکس/جستجو: `ی`/`ي`، `ک`/`ك`، حذف اعراب، تبدیل ارقام فارسی/عربی به لاتین. این کار در تابع `normalize_fa(text)` انجام و در `content_text` ذخیره می‌شود (ستون موازی `content_text_norm` یا همان `content_text` نرمال‌شده). **تصمیم:** `content_text` نرمال‌شده نگه داشته می‌شود تا جستجو ساده بماند.
- هایلایت نتایج سمت کلاینت با `ts_headline` در RPC (`highlight boolean`) یا با ساخت قطعه در TS.

### ۴.۵ چرخه‌ی عمر داده
- **Soft delete:** `deleted_at` → نمایش در سطل زباله → حذف قطعی دستی یا خودکار بعد از ۳۰ روز (Cron روی Supabase یا Vercel Cron روزانه).
- **آرشیو:** `is_archived` جدا از حذف؛ در جستجوی پیش‌فرض حذف می‌شود.
- **نسخه‌ها:** snapshot بر اساس آستانه‌ی زمانی/حجمی، نگه‌داری محدود.

---

## ۵) امنیت

- **RLS** روی همه‌ی جدول‌ها؛ الگوی یکسان `auth.uid() = user_id` با `using` و `with check` هر دو.
- `shared_notes` هیچ policy برای `anon` ندارد؛ تنها راه، RPC با `security definer` و `search_path` قفل‌شده.
- `storage` خصوصی + policy بر اساس پوشه‌ی user id.
- **محتوا:** ذخیره JSONB/TipTap → خروجی HTML فقط از `generateHTML` با schema محدود TipTap و سپس **DOMPurify** (سمت کلاینت) / sanitize در سرور برای مسیرهای اشتراک. هیچ `dangerouslySetInnerHTML` بدون sanitize.
- **Zod** در همه‌ی مرزها: فرم‌ها، Route Handlers، پارامترهای جستجو، payload همگام‌سازی.
- کلیدها: فقط `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` در کلاینت؛ `SUPABASE_SERVICE_ROLE_KEY` هرگز به کلاینت نمی‌رود و فقط در اسکریپت‌های سرور استفاده می‌شود. `OPENROUTER_API_KEY` فقط در Route Handler.
- محافظت: rate-limit سبک روی `/api/ai` و `/api/share/[token]`، `Expires`/`noindex` روی صفحه‌ی عمومی، revoke خودکار share با انقضا.
- هدرها: CSP سازگار با Next، `Referrer-Policy`, `X-Content-Type-Options` در `middleware.ts`.

## ۶) عملکرد

- RSC برای پوسته؛ بخش‌های سنگین (`editor`, `graph`, `command-palette`, `diff`) با `next/dynamic` + `ssr:false`.
- IndexedDB به‌عنوان l1 cache؛ TanStack Query برای سرور state با `staleTime` و retry نمایی.
- تصاویر: `next/image` + `remotePatterns` فقط دامنه‌ی Supabase Storage؛ آپلودهای بزرگ به WebP تبدیل سمت کلاینت (اختیاری).
- Realtime فقط روی `notes` و `reminders` کاربر (filter روی `user_id`)، با debounce ادغام.
- مجازی‌سازی لیست یادداشت‌ها برای >۲۰۰ آیتم (اختیاری در مرحله ۳).

## ۷) دسترس‌پذیری و RTL

- `dir` روی `<html>` از locale؛ هر بلاک ادیتور با `detectDirection(text)` کلاس `dir-auto` می‌گیرد.
- تمام آیکون-باتن‌ها `aria-label`؛ پالت دستورات با role="dialog" + focus trap + بازگشت فوکوس.
- میانبرهای استاندارد: `Ctrl/Cmd+K` پالت، `Ctrl/Cmd+N` یادداشت جدید، `Ctrl/Cmd+S` ذخیره فوری، `Ctrl/Cmd+Shift+F` تمرکز، `?` راهنمای میانبرها، `g then n/g g` ناوبری.
- کنتراست AA؛ احترام به `prefers-reduced-motion`.

## ۸) استراتژی آزمون

| لایه | ابزار | نمونه |
|---|---|---|
| Unit | Vitest | `search-query`, `text-direction`, `links-extract`, `sync-merge`, `jalali`, zod schemas |
| Integration | Vitest + MSW | autosave state machine, outbox retry |
| E2E | Playwright | ثبت‌نام/ورود، ساخت و ویرایش یادداشت، `[[link]]` + بک‌لینک، جستجو، اشتراک عمومی، آفلاین → آنلاین |
| Lint | ESLint + Prettier | در CI با typecheck |

---

## ۹) متغیرهای محیطی (طرح)

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # فقط اسکریپت سرور، اختیاری
NEXT_PUBLIC_SITE_URL=http://localhost:3000
AI_ENABLED=false                    # feature flag
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-4o-mini
CRON_SECRET=                        # محافظت مسیر پاک‌سازی سطل زباله
```

## ۱۰) نقشه‌ی راه پیاده‌سازی

| مرحله | خروجی | commit |
|---|---|---|
| ۱ | همین سند + `DATABASE.md` + `README` اولیه | `docs: architecture and database design` |
| ۲ | اسکافولد Next+TS+Tailwind+shadcn، auth، migrations+RLS، Storage، middleware | ۳–۴ commit کوچک |
| ۳ | ادیتور، پوشه/برچسب، autosave، جستجو (MVP) | … |
| ۴ | لینک دوطرفه، گراف، پالت، یادداشت روزانه، قالب‌ها | … |
| ۵ | نسخه‌ها، Realtime، آفلاین (Dexie+outbox)، PWA | … |
| ۶ | اشتراک، خروجی/ورودی، یادآور، AI | … |
| ۷ | پولیش UI، تست‌ها، CI، مستندات، دیپلوی | … |

---

## ۱۱) ابهامات باقی‌مانده (پاسخ کوتاه لازم نیست مگر نظرتان متفاوت است)

1. **زبان رابط پیش‌فرض:** فارسی به‌عنوان پیش‌فرض و کلید تغییر به انگلیسی. (دوزبانه‌ی کامل i18n در مرحله ۷ به‌صورت سبک اضافه می‌شود.)
2. **آپلود تصویر:** مستقیم از کلاینت به Storage با signed upload؛ تبدیل به WebP در فاز اول انجام نمی‌شود.
3. **گراف:** `d3-force` سبک + canvas (نه کتابخانه‌ی سنگین).
4. **تاریخ شمسی:** `date-fns-jalali` برای نمایش و اعداد فارسی به‌صورت format helper.

اگر تأیید کنید، مرحله ۲ را شروع می‌کنم: ساخت پروژه‌ی Supabase جدید، سپس اسکافولد و migration‌ها (SQL را قبل از اجرا همین‌جا نمایش می‌دهم).
