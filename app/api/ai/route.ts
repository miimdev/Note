import { NextResponse } from 'next/server';
import { aiActionSchema } from '@/lib/validation/schemas';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPTS: Record<string, string> = {
  summarize: 'متن را در چند بولت کوتاه و دقیق خلاصه کن. زبان پاسخ فارسی است.',
  rewrite: 'متن را روان‌تر و شفاف‌تر بازنویسی کن، بدون تغییر معنا. ساختار پاراگراف‌ها را حفظ کن.',
  fix: 'غلط‌های املایی، نگارشی و فاصله‌گذاری فارسی را تصحیح کن و فقط متن اصلاح‌شده را برگردان.',
  translate: 'متن را به انگلیسی روان ترجمه کن و اصطلاحات را طبیعی برگردان.',
  actions: 'کارهای قابل انجام را به شکل فهرست بولت با فعل امری استخراج کن.',
  tags: 'حداکثر ۵ برچسب کوتاه پیشنهاد بده، با کاما و بدون توضیح اضافه.',
  continue: 'متن را با همان لحن و سبک، در حداکثر دو پاراگراف ادامه بده.',
};

/** Simple in-memory rate limit (per instance). */
const hits = new Map<string, { count: number; resetAt: number }>();
const LIMIT = 20;
const WINDOW_MS = 60_000;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > LIMIT;
}

export async function POST(request: Request) {
  if (process.env.AI_ENABLED !== 'true' && process.env.AI_ENABLED !== '1') {
    return NextResponse.json({ error: 'دستیار هوش مصنوعی غیرفعال است' }, { status: 503 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'کلید دستیار تنظیم نشده است' }, { status: 503 });
  }

  // Require an authenticated user so the endpoint cannot be abused anonymously.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'برای استفاده از دستیار وارد شوید' }, { status: 401 });
  }

  if (rateLimited(user.id)) {
    return NextResponse.json({ error: 'تعداد درخواست‌ها زیاد است؛ کمی بعد امتحان کنید' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'بدنه درخواست نامعتبر است' }, { status: 400 });
  }

  const parsed = aiActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'ورودی نامعتبر' }, { status: 400 });
  }

  const { action, text } = parsed.data;
  const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
        'X-Title': 'Note — Smart Notebook',
      },
      body: JSON.stringify({
        model,
        temperature: action === 'fix' ? 0.1 : 0.4,
        max_tokens: 900,
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS[action] ?? SYSTEM_PROMPTS.summarize },
          { role: 'user', content: text.slice(0, 24_000) },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('[ai] upstream error', response.status, detail.slice(0, 300));
      return NextResponse.json({ error: 'سرویس دستیار در دسترس نیست' }, { status: 502 });
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const result = payload.choices?.[0]?.message?.content?.trim();

    if (!result) {
      return NextResponse.json({ error: 'پاسخ خالی از سرویس دستیار' }, { status: 502 });
    }

    return NextResponse.json({ result, action, model });
  } catch (error) {
    console.error('[ai] request failed', error);
    return NextResponse.json({ error: 'ارتباط با دستیار برقرار نشد' }, { status: 502 });
  }
}
