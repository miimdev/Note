import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { docToHtml } from '@/lib/editor/content';
import { sanitizeHtml } from '@/lib/editor/sanitize';
import { formatJalaliDateTime } from '@/lib/jalali';
import { PrintTrigger } from '@/features/export/print-trigger';
import type { NoteContent } from '@/types/database.types';

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ auto?: string }> };

export const dynamic = 'force-dynamic';

export default async function PrintPage({ params, searchParams }: Params) {
  const { id } = await params;
  const { auto } = await searchParams;

  type PrintNote = { title: string; content: NoteContent; updated_at: string; icon: string | null };

  // `redirect()` works by throwing, so it must stay outside the try/catch below.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/print/${id}`);

  let note: PrintNote | null = null;
  try {
    const { data } = await supabase
      .from('notes')
      .select('title, content, updated_at, icon')
      .eq('id', id)
      .maybeSingle();
    note = (data as PrintNote | null) ?? null;
  } catch {
    note = null;
  }

  if (!note) notFound();

  const html = sanitizeHtml(docToHtml(note.content));

  return (
    <main className="print-sheet mx-auto max-w-3xl px-6 py-10">
      <PrintTrigger auto={auto === '1'} />
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
