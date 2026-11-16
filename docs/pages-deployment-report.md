# گزارش دیپلوی GitHub Pages

سایت زنده: **https://miimdev.github.io/Note/**

## تنظیمات فعال

| مورد                   | مقدار                                                                  |
| ---------------------- | ---------------------------------------------------------------------- |
| Repository             | `miimdev/Note` — branch `main`                                         |
| Pages Source           | GitHub Actions (`deploy.yml`)                                          |
| Enforce HTTPS          | فعال (اجباری برای دامنهٔ `github.io`)                                   |
| Actions Variables      | `NEXT_PUBLIC_SUPABASE_URL`، `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon فقط) |
| Environment            | `github-pages` (هر دو job اعلامش می‌کنند)                              |
| Supabase Site URL      | `https://miimdev.github.io/Note/`                                      |
| Supabase Redirect URLs | `…/Note/callback`، `…/Note/reset-password`، `…/Note/**` (+ localhost)  |

## جریان CI

| Workflow     | Job                            | کاری که می‌کند                                   |
| ------------ | ------------------------------ | ------------------------------------------------ |
| `ci.yml`     | Lint, typecheck, unit tests    | `tsc --noEmit`، `next lint`، prettier، ۱۲۸ تست   |
| `ci.yml`     | Static export (Pages artifact) | `build:static` + بررسی `.nojekyll`/`404.html`/…  |
| `ci.yml`     | Playwright (public routes)     | E2E مسیرهای عمومی                                |
| `deploy.yml` | Build static site              | بیلد + Verify artifact (کلید service_role ممنوع) |
| `deploy.yml` | Deploy                         | `deploy-pages` تا محیط `github-pages`            |

## باگ‌هایی که فقط روی سایت زنده پیدا شدند

1. **بررسی بیلد اشتباه بود** — `NEXT_PUBLIC_*` در `out/_next/static/chunks/*.js`
   اینلاین می‌شوند، نه در `index.html`. بررسی به chunks منتقل شد.
2. **`/callback` وجود نداشت** — لینک تأیید ایمیل و OAuth به ۴۰۴ می‌خورد.
   اکنون یک صفحه در خروجی استاتیک و یک route handler در بیلد سروری وجود دارد.
3. **basePath دو بار اعمال می‌شد** — `/Note/notes/` بعد از ورود به
   `/Note/Note/notes/` تبدیل می‌شد؛ `stripBasePath()` اضافه شد. آدرس بازگشت
   Supabase هم از `origin/callback` به `origin/Note/callback` اصلاح شد.
4. **عنوان صفحه دوبار ضمیمه می‌شد** — «ورود | Note | Note».
5. **فایل‌های tracked که بیلد استاتیک حذفشان می‌کرد** — یک `git commit -a`
   بعد از بیلد، مسیرهای داینامیک را از مخزن پاک می‌کرد. اکنون تولیدشده و ignored‌اند.

## محدودیت‌های باقی‌مانده (ذاتِ هاست استاتیک)

- دستیار AI غیرفعال (به `/api/ai` و کلید OpenRouter نیاز دارد).
- `/api/share/...` و cron پاکسازی سطل زباله کار نمی‌کند (نیاز به service role).
- گارد ورود کلاینت‌ساید است (`AuthGate`)، نه middleware.

## بررسی پس از دیپلوی

```bash
node scripts/verify-pages.mjs https://miimdev.github.io/Note
```

نکته: دسترسی HTTPS خروجی این سندباکس به `github.io` مسدود است، بنابراین بررسی
مسیرها با ابزار fetch صفحه (نه curl) انجام شد؛ نتایج: خانه، `/login/`،
`/signup/`، `/forgot-password/`، `/reset-password/`، `/callback/`، `/offline/`،
`/print/?id=…`، صفحهٔ ۴۰۴، `manifest.webmanifest`، `sw.js` و چانک‌های
`/Note/_next/…` همه ۲۰۰ هستند. مسیرهای تازه‌اضافه ممکن است چند دقیقه ۴۰۴ کش‌شده
بمانند؛ با `?v=1` می‌توان فوراً بررسی کرد.
