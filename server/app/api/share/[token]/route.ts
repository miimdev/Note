import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { docToHtml, docToMarkdown } from '@/lib/editor/content';
import { sanitizeHtml } from '@/lib/editor/sanitize';
import type { NoteContent, SharedNotePayload } from '@/types/database.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ token: string }> };

/**
 * Read-only public API for a shared note (`?format=html|markdown|json`).
 * Uses the anon key + `get_shared_note` RPC only, never the service role key.
 */
export async function GET(request: Request, { params }: Params) {
  const { token } = await params;
  const url = new URL(request.url);
  const format = (url.searchParams.get('format') ?? 'json').toLowerCase();

  if (!/^[a-f0-9]{16,128}$/i.test(token)) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc('get_shared_note', { share_token: token });

  if (error) {
    // PostgREST returns a code for SQL errors; an empty code means the request
    // never reached the database (network/DNS), which is a 503, not a 500.
    const status = error.code ? 500 : 503;
    return NextResponse.json(
      { error: status === 503 ? 'unavailable' : 'lookup_failed' },
      { status },
    );
  }

  const note = (data as SharedNotePayload[] | null)?.[0];
  if (!note) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };

  if (format === 'html') {
    return new NextResponse(sanitizeHtml(docToHtml(note.content)), {
      headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (format === 'markdown') {
    return new NextResponse(docToMarkdown(note.content as NoteContent, note.title), {
      headers: {
        ...headers,
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `inline; filename="${encodeURIComponent(note.title || 'note')}.md"`,
      },
    });
  }

  return NextResponse.json(
    {
      title: note.title,
      content: note.content,
      shared_at: note.shared_at,
      expires_at: note.expires_at,
    },
    { headers },
  );
}
