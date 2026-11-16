import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { CalendarDays, Sparkles } from 'lucide-react';
import type { SharedNotePayload } from '@/types/database.types';
import { docToHtml } from '@/lib/editor/content';
import { sanitizeHtml } from '@/lib/editor/sanitize';
import { formatJalaliDate } from '@/lib/jalali';

type Params = { params: Promise<{ token: string }> };

export const dynamic = 'force-dynamic';

async function fetchShared(token: string): Promise<SharedNotePayload | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  // Anon key + RPC only: shared_notes has no anon RLS policy on purpose.
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc('get_shared_note', { share_token: token });
  if (error || !data) return null;

  const rows = data as SharedNotePayload[];
  return rows[0] ?? null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { token } = await params;
  const note = await fetchShared(token);
  if (!note) return { title: 'یادداشت پیدا نشد', robots: { index: false } };
  return {
    title: note.title || 'یادداشت اشتراکی',
    description: note.author_name ? `یادداشت عمومی از ${note.author_name}` : 'یادداشت عمومی',
    robots: { index: false, follow: false },
  };
}

export default async function SharedNotePage({ params }: Params) {
  const { token } = await params;
  const note = await fetchShared(token);
  if (!note) notFound();

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
            // Sanitised above with DOMPurify; never inject raw user HTML.
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
