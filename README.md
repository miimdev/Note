# Note — دفترچه یادداشت هوشمند

یک وب‌اپلیکیشن یادداشت‌برداری **offline-first** با ادیتور بلاکی، شبکه دانش (لینک دوطرفه + گراف)، جستجوی دوزبانه‌ی فارسی/انگلیسی با تحمل غلط املایی، نسخه‌گذاری، همگام‌سازی لحظه‌ای و PWA.

ساخته‌شده با **Next.js (App Router) + TypeScript strict + Tailwind CSS + shadcn/ui + TipTap + Supabase + Dexie + Zustand + TanStack Query**، آماده برای دیپلوی روی Vercel.

---

## فهرست

- [قابلیت‌ها](#قابلیتها)
- [معماری و ساختار پوشه‌ها](#معماری-و-ساختار-پوشهها)
- [دیتابیس](#دیتابیس)
- [راه‌اندازی محلی](#راهاندازی-محلی)
- [متغیرهای محیطی](#متغیرهای-محیطی)
- [اجرای migrationها](#اجرای-migrationها)
- [تست و کیفیت کد](#تست-و-کیفیت-کد)
- [دیپلوی روی Vercel](#دیپلوی-روی-vercel)
- [کارهای انجام‌شده / باقی‌مانده](#کارهای-انجامشده--باقیمانده)
- [امنیت](#امنیت)

---

## قابلیت‌ها

### ۱) ادیتور

- ادیتور بلاکی TipTap با **اسلش‌کامند** (`/`): متن، تیتر ۱–۳، لیست نقطه‌ای/شماره‌دار، چک‌لیست، جدول، بلوک کد با **رنگ‌بندی سینتکس** (lowlight)، نقل‌قول، جداکننده، تصویر، فایل، ایموجی
- **میانبرهای Markdown** (`#`، `**`، `- `، `> `، ` ``` `، `[ ] `)
- **drag & drop بلاک‌ها** + جابه‌جایی با `Alt+↑/↓`
- **ذخیره خودکار** (debounce ۷۰۰ms) با نشانگر «در حال ذخیره / ذخیره شد / آفلاین — در صف / خطا»
- Undo/Redo کامل (TipTap history)
- شمارنده کلمه، کاراکتر و **زمان تقریبی مطالعه**
- **حالت تمرکز** (⌘⇧F) با مخفی‌کردن نوارها و سایدبار
- **تشخیص خودکار جهت** برای هر بلاک (فارسی/انگلیسی در یک یادداشت)

### ۲) شبکه دانش

- لینک‌دهی `[[نام یادداشت]]` با **تکمیل خودکار** و پارس خودکار در دیتابیس
- **بک‌لینک‌ها** (چه یادداشت‌هایی به این یادداشت لینک دارند) + لینک‌های خروجی و لینک‌های «ناموجود»
- **گراف تعاملی** (canvas + شبیه‌سازی نیرو، بدون کتابخانه سنگین) با بزرگ‌نمایی، برچسب و انتخاب گره
- **پیشنهاد یادداشت مرتبط** با RPC `related_notes` (لینک، بک‌لینک، برچسب مشترک، شباهت عنوان)

### ۳) سازمان‌دهی

- پوشه‌های **تو در تو** با جلوگیری از حلقه در سطح دیتابیس
- برچسب رنگی، پین، علاقه‌مندی، آرشیو
- **سطل زباله** با soft delete و بازیابی + حذف خودکار بعد از ۳۰ روز (Cron)
- مرتب‌سازی (تاریخ ویرایش/ساخت، عنوان) و فیلتر (پوشه، برچسب، آرشیو، علاقه‌مندی)
- آیکون و تصویر کاور برای هر یادداشت

### ۴) جستجو و پیمایش سریع

- جستجوی تمام‌متنی (tsvector + GIN) با **نرمال‌سازی فارسی** (ي/ی، ك/ک، اعراب، ارقام) و **تحمل غلط املایی** (`pg_trgm`)
- **هایلایت** نتایج + قطعه‌ی متن اطراف
- جستجوی محلی آفلاین با Levenshtein
- **پالت دستورات** (⌘K) برای جستجو، ساخت یادداشت، تغییر تم، ناوبری و…
- میانبرهای کامل + **صفحه راهنمای میانبرها** (`?`)

### ۵) یادداشت روزانه، قالب و یادآور

- یادداشت روزانه با یک کلیک، یکتا در هر روز (`unique (user_id, daily_date)`)
- **تقویم شمسی** با الگوریتم داخلی (بدون وابستگی، تست‌شده) و امکان سوییچ به میلادی
- قالب‌های آماده (جلسه، لیست کارها، ژورنال، پروژه) + ساخت قالب شخصی
- یادآور روی هر یادداشت با **نوتیفیکیشن مرورگر** (+ toast درون‌برنامه‌ای)

### ۶) نسخه‌ها و همگام‌سازی

- تاریخچه نسخه‌ها (snapshot هر ۵ دقیقه، نگه‌داری ۳۰ نسخه)، **مقایسه** و **بازگردانی**
- همگام‌سازی لحظه‌ای با **Supabase Realtime**
- **کار کامل آفلاین**: Dexie + صف `outbox` و پوش بعد از اتصال با backoff نمایی
- **مدیریت تداخل** با مقایسه‌ی دو نسخه و انتخاب کاربر (نه last-write-wins کور)

### ۷) اشتراک‌گذاری و خروجی

- لینک عمومی **فقط‌خواندنی** با token، تاریخ انقضا و امکان لغو (`/s/[token]`)
- خروجی **Markdown / HTML / PDF** (چاپ با استایل اختصاصی) + **ورود Markdown**
- خروجی کامل همه یادداشت‌ها در یک **zip** (سمت کلاینت و سمت سرور)

### ۸) دستیار هوش مصنوعی (پشت feature flag)

- خلاصه‌سازی، بازنویسی، تصحیح، ترجمه، استخراج کارها، پیشنهاد برچسب، ادامه نوشتن
- از **OpenRouter** با کلید **فقط سمت سرور**؛ نیازمند ورود کاربر و rate-limit ساده

### ۹) تجربه کاربری

- تم روشن/تاریک/خودکار، طراحی مینیمال با انیمیشن‌های ظریف
- RTL کامل + فونت **Vazirmatn** (self-hosted) + Inter برای لاتین
- موبایل‌فرست، سایدبار جمع‌شونده، ناوبری پایین در موبایل
- a11y: aria-label روی همه کنترل‌ها، focus trap دیالوگ‌ها، کنتراست AA، احترام به `prefers-reduced-motion`

---

## معماری و ساختار پوشه‌ها

```
app/
  layout.tsx                 # html lang/dir، فونت‌ها، Providers، Toaster
  globals.css                # توکن‌های تم، استایل ادیتور، استایل چاپ
  page.tsx                   # ریدایرکت به /notes یا /login
  (auth)/                    # login, signup, forgot-password, reset-password, callback
  (workspace)/               # پوسته اپ: notes, folders, tags, daily, graph,
                             #   templates, archive, trash, reminders, search, settings, favorites
  s/[token]/                 # نمای عمومی فقط‌خواندنی
  print/[id]/                # چیدمان چاپ/PDF
  api/ai/                    # Route Handler دستیار (OpenRouter)
  api/export/zip/            # خروجی zip سمت سرور
  api/share/[token]/         # API عمومی سهم (html/markdown/json)
  api/cron/purge/            # پاک‌سازی سطل زباله + انقضای لینک‌ها
components/
  ui/                        # پرimitiveهای shadcn-style (button, dialog, dropdown, …)
  layout/                    # sidebar, mobile-nav, app-shell, hotkeys, offline-banner
  providers.tsx              # Theme + QueryClient + Tooltip + Sync + SW
features/
  editor/                    # TipTap: extensions (slash, wiki-link, direction), autosave, toolbar
  notes/                     # note-screen, note-card, list, filter bar, actions
  folders/ tags/ links/ graph/ search/ versions/ sync/ share/ export/ reminders/ templates/ daily/ ai/
lib/
  supabase/{client,server,middleware}.ts
  db/                        # Dexie schema + repositories (notes, folders, tags)
  sync/engine.ts             # flush outbox → pull → realtime → conflict
  sync/pull.ts               # پیمایش جدول‌ها
  sync-merge.ts              # منطق merge و backoff (تست‌شده)
  editor/content.ts          # JSON ↔ text/markdown/html (بدون باندل ادیتور)
  editor/sanitize.ts         # DOMPurify
  search-query.ts            # نرمال‌سازی فارسی، هایلایت، Levenshtein (تست‌شده)
  links.ts                   # پارس/حل/پیشنهاد [[لینک]] (تست‌شده)
  jalali.ts + jalali-convert.ts   # تقویم شمسی
  markdown-import.ts         # Markdown → TipTap JSON
  validation/schemas.ts      # همه schemaهای Zod
hooks/ store/ types/ supabase/migrations/ tests/ docs/
```

**مرزها:** `app/` فقط ترکیب می‌کند؛ منطق در `features/`؛ دسترسی داده فقط از `lib/db` و `lib/supabase`. هیچ کامپوننتی مستقیم `createClient()` صدا نمی‌زند.

**جریان نوشتن:** keystroke → TipTap → debounce → Dexie + outbox («در حال ذخیره») → push به Supabase («ذخیره شد») → تریگر دیتابیس متن مسطح، بردار جستجو و لینک‌ها را می‌سازد.

**جریان خواندن:** RSC پوسته → هیدریت IndexedDB → Realtime تغییرات → اگر `remote.version > base_version` و نسخه محلی dirty باشد → **تداخل** و تصمیم کاربر.

> معماری کامل و ADRها: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · طرح دیتابیس: [`docs/DATABASE.md`](docs/DATABASE.md)

---

## دیتابیس

پروژه Supabase: **`notebook-note`** (ref: `efvnoyrqqkotbeyjlfzm`, منطقه `eu-central-1`).

| جدول                 | توضیح                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| `profiles`           | پروفایل هر کاربر (۱:۱ با `auth.users`)، locale، theme، settings                                     |
| `folders`            | پوشه درختی با `parent_id` و رنگ/آیکون/position                                                      |
| `notes`              | سند TipTap در `content` + `content_text` + `search_vector` + soft delete + `version` + `daily_date` |
| `tags` / `note_tags` | برچسب رنگی و اتصال چند-به-چند                                                                       |
| `note_links`         | گراف لینک‌های `[[...]]` (شامل لینک‌های هنوز ناموجود)                                                |
| `note_versions`      | snapshot نسخه‌ها                                                                                    |
| `reminders`          | یادآور با `remind_at`                                                                               |
| `templates`          | قالب سیستمی (`user_id = null`) و شخصی                                                               |
| `shared_notes`       | لینک عمومی با token/انقضا                                                                           |
| `attachments`        | متادیتای فایل‌ها (فایل در Storage خصوصی)                                                            |

- **RLS روی همه‌ی ۱۱ جدول** با `auth.uid() = user_id`؛ هیچ policy‌ای برای `anon` روی جدول‌ها وجود ندارد
- خواندن عمومی فقط از طریق `get_shared_note(token)`
- ایندکس‌ها: GIN روی `search_vector`، trgm روی `title`/`content_text`، `(user_id, updated_at)`، `(user_id, folder_id)`، ایندکس یکتای جزئی برای یادداشت روزانه
- تریگرها: `updated_at`، ساخت پروفایل هنگام ثبت‌نام، ساخت `content_text` + `search_vector`، پارس `[[لینک]]`، حل خودکار لینک‌های ناموجود، snapshot نسخه‌ها، جلوگیری از حلقه پوشه
- توابع: `search_notes`، `suggest_note_titles`، `note_graph`، `related_notes`، `get_shared_note`، `purge_trashed_notes`، `expire_shared_notes`
- Storage: bucket **خصوصی** `note-attachments` با policy بر اساس `{user_id}/…`

---

## راه‌اندازی محلی

پیش‌نیاز: Node.js 20+ (توصیه: 22)

```bash
git clone https://github.com/miimdev/Note.git
cd Note
npm install
cp .env.example .env.local     # مقادیر Supabase را پر کنید
npm run dev                    # http://localhost:3000
```

سپس در Supabase → Authentication:

1. **Providers → Email**: فعال؛ `Confirm email` روشن (تایید ایمیل).
2. **Providers → Google**: فعال و Client ID/Secret از Google Cloud Console.
3. **URL Configuration**:
   - Site URL: `http://localhost:3000` (و دامنه‌ی Vercel در پروداکشن)
   - Redirect URLs: `http://localhost:3000/callback`, `https://YOUR-DOMAIN/callback`
4. **Email Templates**: لینک تایید/بازیابی به‌صورت پیش‌فرض به `/callback` هدایت می‌شود.

بدون تنظیم `.env.local` هم برنامه بالا می‌آید و صفحه‌ی ورود پیام «اتصال Supabase تنظیم نشده است» را نشان می‌دهد.

---

## متغیرهای محیطی

فایل `.env.example`:

| متغیر                           | محیط        | توضیح                                                      |
| ------------------------------- | ----------- | ---------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | عمومیکلاینت | آدرس پروژه Supabase                                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | عمومیکلاینت | کلید anon/publishable (امن برای مرورگر؛ RLS محافظت می‌کند) |
| `SUPABASE_SERVICE_ROLE_KEY`     | فقط سرور    | برای `/api/cron/purge` و اسکریپت‌ها — **هرگز** در کلاینت   |
| `NEXT_PUBLIC_SITE_URL`          | عمومی       | آدرس کامل برنامه (برای redirectهای auth)                   |
| `NEXT_PUBLIC_AI_ENABLED`        | عمومی       | نمایش پنل دستیار در UI (`true`/`false`)                    |
| `AI_ENABLED`                    | سرور        | فعال‌سازی واقعی `/api/ai`                                  |
| `OPENROUTER_API_KEY`            | سرور        | کلید OpenRouter — فقط سمت سرور                             |
| `OPENROUTER_MODEL`              | سرور        | مثلاً `openai/gpt-4o-mini`                                  |
| `CRON_SECRET`                   | سرور        | محافظت از `/api/cron/purge`                                |

> هیچ کلیدی در گیت نیست: `.env.local` در `.gitignore` قرار دارد و فقط `.env.example` منتشر می‌شود.

---

## اجرای migrationها

همه‌ی تغییرات دیتابیس به‌صورت نسخه‌دار در `supabase/migrations/` هستند و روی پروژه اعمال شده‌اند:

| فایل                                 | محتوا                                                                       |
| ------------------------------------ | --------------------------------------------------------------------------- |
| `0001_init_core.sql`                 | extensions، `set_updated_at`، `normalize_fa`، `tiptap_to_text`، `empty_doc` |
| `0002_profiles.sql`                  | `profiles` + تریگر ساخت پروفایل                                             |
| `0003_folders_tags.sql`              | `folders` (با ضدحلقه) و `tags`                                              |
| `0004_notes.sql`                     | `notes` + ایندکس‌ها/تریگر جستجو + `note_tags`                               |
| `0005_links_versions.sql`            | `note_links` + تریگرهای پارس/حل لینک + `note_versions` + snapshot           |
| `0006_templates_reminders_share.sql` | `templates`, `reminders`, `shared_notes`, `attachments`                     |
| `0007_storage.sql`                   | bucket خصوصی + policyها                                                     |
| `0008_search_functions.sql`          | RPCهای جستجو/گراف/پیشنهاد/سهم عمومی                                         |
| `0009_maintenance_realtime.sql`      | purge سطل زباله، انقضای لینک، انتشار Realtime                               |
| `0010_seed_templates.sql`            | ۴ قالب سیستمی                                                               |
| `0011_resolve_pending_links.sql`     | حل خودکار لینک‌های آویزان هنگام ساخت/تغییر نام یادداشت (idempotent)         |

سه روش اجرا:

```bash
# ۱) Supabase CLI (پیشنهادی)
supabase link --project-ref <PROJECT_REF>
supabase db push

# ۲) Dashboard → SQL Editor: محتوای فایل‌ها را به ترتیب شماره اجرا کنید

# ۳) با MCP/اتصال موجود: هر فایل به‌عنوان یک migration
```

مigrations روی پروژه اعمال شده و صحت آن‌ها با تست روی schema موقت بررسی شده است:
RLS (کاربر دیگر صفر ردیف می‌بیند)، `anon` بدون grant، جستجوی فارسی با `ي` و `ی`، پارس و حل لینک‌ها، شمارش نسخه‌ها.

---

## تست و کیفیت کد

```bash
npm run typecheck    # TypeScript strict
npm run lint         # ESLint (next/core-web-vitals + prettier)
npm run format       # Prettier
npm test             # Vitest — ۷۸ تست واحد
npm run test:e2e     # Playwright (نیازمند نصب مرورگر)
```

پوشش تست واحد: نرمال‌سازی و جستجو (`search-query`)، هایلایت و قطعه‌سازی، لینک‌های ویکی (`links`)، ادغام تداخل و outbox (`sync-merge`)، تبدیل JSON→HTML/Markdown و sanitize، تقویم شمسی، تشخیص جهت متن، ورود Markdown.

E2E: مسیرهای عمومی (ورود/ثبت‌نام/ریست، ریدایرکت مسیرهای محافظت‌شده، لینک عمومی نامعتبر، manifest و صفحه آفلاین) + فلوی احراز‌شده با `E2E_EMAIL`/`E2E_PASSWORD`.

CI: `.github/workflows/ci.yml` → typecheck، lint، prettier check، تست، build، Playwright.

---

## دیپلوی روی Vercel

1. ریپو را به Vercel وصل کنید (Framework: Next.js).
2. متغیرهای محیطی بالا را در Project Settings → Environment Variables وارد کنید (`SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, `CRON_SECRET` را فقط برای Production/Server).
3. `NEXT_PUBLIC_SITE_URL` را روی دامنه‌ی نهایی بگذارید و همان دامنه را در Supabase → Redirect URLs اضافه کنید.
4. `vercel.json` یک Cron روزانه برای `/api/cron/purge` تعریف می‌کند (نیازمند `CRON_SECRET`).
5. برای Google OAuth، دامنه‌ی Vercel را در Google Cloud Console مجاز کنید.

---

## کارهای انجام‌شده / باقی‌مانده

**انجام‌شده**

- [x] معماری، ADRها، طرح دیتابیس و پیش‌نمایش SQL
- [x] ساخت پروژه Supabase جدید + ۱۱ migration + RLS + Storage + Realtime + RPCها
- [x] Next.js + TS strict + Tailwind + UI primitives + تم روشن/تاریک/خودکار
- [x] احراز هویت ایمیل/رمز + Google + تایید ایمیل + بازیابی رمز + middleware
- [x] ادیتور بلاکی (اسلش، مارک‌داون، جدول، کد، تصویر، چک‌لیست، جهت خودکار، شمارنده‌ها، حالت تمرکز، autosave)
- [x] پوشه درختی، برچسب، پین، علاقه‌مندی، آرشیو، سطل زباله
- [x] جستجوی دوزبانه (DB + آفلاین) با هایلایت
- [x] لینک دوطرفه، بک‌لینک، گراف، پیشنهاد مرتبط، پالت دستورات، راهنمای میانبرها
- [x] یادداشت روزانه (شمسی/میلادی)، قالب‌ها، یادآور با نوتیفیکیشن
- [x] Dexie + outbox + Realtime + حل تداخل + نشانگر وضعیت همگام‌سازی
- [x] اشتراک عمومی با token/انقضا، خروجی Markdown/HTML/PDF/zip، ورود Markdown
- [x] PWA (manifest + service worker + صفحه آفلاین) + فونت self-hosted
- [x] دستیار AI با OpenRouter پشت feature flag و rate limit
- [x] تست واحد (۷۸)، E2E، CI، ESLint/Prettier، README و مستندات

**باقی‌مانده / پیشنهاد بهبود**

- [ ] تبدیل خودکار تصاویر آپلودی به WebP و تولید thumbnail (بهینه‌سازی پهنای باند)
- [ ] اشتراک‌گذاری بین کاربران (همکاری چندنفره) — نیازمند جدول عضویت و RLS جدید
- [ ] جستجوی `ts_headline` سمت سرور برای هایلایت دقیق‌تر متون طولانی
- [ ] تاریخچه undo/redo بین دستگاه‌ها (الان undo فقط محلی است)
- [ ] ویرایش سریع درجا (inline) در لیست یادداشت‌ها
- [ ] i18n کامل UI (الان رشته‌ها فارسی و ساختار locale آماده است)
- [ ] Push Notification واقعی (Web Push + VAPID) به‌جای نوتیفیکیشن تب باز
- [ ] تست‌های E2E بیشتر برای فلوی آفلاین → آنلاین با Playwright context offline

---

## امنیت

- **RLS forced** روی `profiles` و فعال روی همه‌ی جدول‌ها؛ `revoke all … from anon` روی جدول‌های خصوصی
- تنها مسیر عمومی داده: `get_shared_note(token)` با `security definer` + `search_path` قفل‌شده و بررسی `is_active`/`expires_at`
- HTML فقط با **DOMPurify** (allowlist تگ/اتریبیوت، مسدودسازی `javascript:`) و تولید HTML از ساختار محدود TipTap
- اعتبارسنجی **Zod** روی همه‌ی فرم‌ها و Route Handlerها
- `/api/ai` نیازمند session + rate limit؛ کلید فقط در env سرور
- `/api/cron/purge` با `CRON_SECRET`
- Storage خصوصی + signed URL؛ مسیر فایل‌ها با شناسه‌ی کاربر پیشوند می‌شوند
- هدرهای امنیتی در `next.config.mjs` (nosniff، referrer-policy، frame-options، permissions-policy)
- هیچ secret در ریپو نیست — بررسی شده با `git ls-files` (فقط `.env.example`)

---

## لایسنس

MIT — استفاده آزاد با ذکر منبع.
