'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { CalendarDays, Loader2, Sparkles } from 'lucide-react';
import type { SharedNotePayload } from '@/types/database.types';
import { docToHtml } from '@/lib/editor/content';
import { sanitizeHtml } from '@/lib/editor/sanitize';
import { formatJalaliDate } from '@/lib/jalali';

type State =
  | { status: 'loading' }
  | { status: 'ok'; note: SharedNotePayload }
  | { status: 'missing' }
  | { status: 'unavailable' };

/**
 * Public, read-only share page for the static build (GitHub Pages has no server
 * to run the RPC). It talks to Supabase directly with the anon key, which is
 * fine: `shared_notes` has no anon RLS policy, so `get_shared_note` is the only
 * way to read a shared note.
 */
export function SharedNoteView() {
  const token = useSearchParams().get('id') ?? '';
  const [state, setState] = React.useState<State>({ status: 'loading' });

  React.useEffect(() => {
    let active = true;

    async function load() {
      if (!token) {
        setState({ status: 'missing' });
        return;
      }

      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) {
        setState({ status: 'unavailable' });
        return;
      }

      try {
        const supabase = createClient(url, key, { auth: { persistSession: false } });
        const { data, error } = await supabase.rpc('get_shared_note', { share_token: token });
        if (!active) return;

        if (error) {
          // No SQL error code means the request never reached the database.
          setState({ status: error.code ? 'missing' : 'unavailable' });
          return;
        }

        const rows = (data ?? []) as SharedNotePayload[];
        setState(rows[0] ? { status: 'ok', note: rows[0] } : { status: 'missing' });
      } catch {
        if (active) setState({ status: 'unavailable' });
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [token]);

  if (state.status === 'loading') {
    return (
      <main className="flex min-h-dvh items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> در حال بارگذاری…
      </main>
    );
  }

  if (state.status === 'unavailable') {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-lg font-semibold">موقتاً در دسترس نیست</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          ارتباط با سرور برقرار نشد. چند لحظه بعد دوباره تلاش کنید.
        </p>
        <button
          type="button"
          className="text-sm text-primary underline-offset-4 hover:underline"
          onClick={() => window.location.reload()}
        >
          تلاش دوباره
        </button>
      </main>
    );
  }

  if (state.status === 'missing') {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-lg font-semibold">این لینک وجود ندارد</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          ممکن است منقضی شده یا توسط صاحب یادداشت لغو شده باشد.
        </p>
        <Link href="/" className="text-sm text-primary underline-offset-4 hover:underline">
          رفتن به برنامه
        </Link>
      </main>
    );
  }

  const note = state.note;
  // Sanitised with DOMPurify below; never inject raw user HTML.
  const html = sanitizeHtml(docToHtml(note.content));

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="no-print border-b bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            Note
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            نمای عمومی · فقط‌خواندنی
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <article className="surface p-6 md:p-10">
          {note.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={note.cover_url} alt="" className="mb-6 h-44 w-full rounded-lg object-cover" />
          )}
          <h1 className="text-2xl font-semibold tracking-tight">
            {note.icon ? `${note.icon} ` : ''}
            {note.title || 'بدون عنوان'}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatJalaliDate(note.shared_at)}
            {note.author_name ? ` · ${note.author_name}` : ''}
            {note.expires_at ? ` · معتبر تا ${formatJalaliDate(note.expires_at)}` : ''}
          </p>

          <div
            className="prose-shared mt-6 space-y-3 text-[15px] leading-8 [&_.wiki-link]:text-primary [&_blockquote]:border-s-2 [&_blockquote]:ps-4 [&_blockquote]:text-muted-foreground [&_h1]:mt-6 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:font-semibold [&_hr]:my-6 [&_img]:max-w-full [&_img]:rounded-lg [&_li]:my-1 [&_ol]:list-decimal [&_ol]:ps-6 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:text-xs [&_ul]:list-disc [&_ul]:ps-6"
            dir="auto"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </article>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          این یادداشت توسط صاحب آن به‌صورت عمومی به اشتراک گذاشته شده است.
        </p>
      </main>
    </div>
  );
}
