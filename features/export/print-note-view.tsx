'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, Printer } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { docToHtml } from '@/lib/editor/content';
import { sanitizeHtml } from '@/lib/editor/sanitize';
import { formatJalaliDateTime } from '@/lib/jalali';
import { Button } from '@/components/ui/button';
import type { NoteContent } from '@/types/database.types';

type PrintNote = { title: string; content: NoteContent; updated_at: string; icon: string | null };

type State =
  | { status: 'loading' }
  | { status: 'ready'; note: PrintNote }
  | { status: 'signed-out' }
  | { status: 'missing' };

/**
 * Print/PDF view for the static build: the server version loaded the note with
 * cookies, this one uses the browser session and RLS, which enforces the same
 * ownership rules.
 */
export function PrintNoteView() {
  const params = useSearchParams();
  const noteId = params.get('id') ?? '';
  const auto = params.get('auto') === '1';
  const [state, setState] = React.useState<State>({ status: 'loading' });

  React.useEffect(() => {
    let active = true;

    async function load() {
      if (!noteId) {
        setState({ status: 'missing' });
        return;
      }

      try {
        const client = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await client.auth.getUser();
        if (!active) return;
        if (!user) {
          setState({ status: 'signed-out' });
          return;
        }

        const { data } = await client
          .from('notes')
          .select('title, content, updated_at, icon')
          .eq('id', noteId)
          .maybeSingle();
        if (!active) return;
        setState(data ? { status: 'ready', note: data as PrintNote } : { status: 'missing' });
      } catch {
        if (active) setState({ status: 'missing' });
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [noteId]);

  React.useEffect(() => {
    if (state.status !== 'ready' || !auto) return;
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, [auto, state.status]);

  if (state.status === 'loading') {
    return (
      <main className="mx-auto flex max-w-3xl items-center gap-2 px-6 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> در حال آماده‌سازی…
      </main>
    );
  }

  if (state.status === 'signed-out') {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10 text-sm">
        <p className="font-medium">برای چاپ باید وارد شوید.</p>
        <Button asChild size="sm" variant="outline" className="mt-3">
          <Link href={`/login?next=${encodeURIComponent(`/print?id=${noteId}`)}`}>ورود</Link>
        </Button>
      </main>
    );
  }

  if (state.status === 'missing') {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10 text-sm">
        <p className="font-medium">یادداشت پیدا نشد.</p>
        <Button asChild size="sm" variant="outline" className="mt-3">
          <Link href="/notes">بازگشت به یادداشت‌ها</Link>
        </Button>
      </main>
    );
  }

  const note = state.note;
  const html = sanitizeHtml(docToHtml(note.content));

  return (
    <main className="print-sheet mx-auto max-w-3xl px-6 py-10">
      <div className="no-print mb-4 flex justify-end">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5" /> چاپ / ذخیره PDF
        </Button>
      </div>
      <header className="mb-6 border-b pb-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {note.icon ? `${note.icon} ` : ''}
          {note.title || 'بدون عنوان'}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          آخرین ویرایش: {formatJalaliDateTime(note.updated_at)}
        </p>
      </header>
      <article
        className="space-y-3 text-[15px] leading-8 [&_blockquote]:border-s-2 [&_blockquote]:ps-4 [&_h1]:mt-6 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_hr]:my-6 [&_img]:max-w-full [&_img]:rounded-lg [&_ol]:list-decimal [&_ol]:ps-6 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:text-xs [&_ul]:list-disc [&_ul]:ps-6"
        dir="auto"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </main>
  );
}
