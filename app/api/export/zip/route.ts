import { NextResponse } from 'next/server';
import { zipSync, strToU8 } from 'fflate';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { docToMarkdown } from '@/lib/editor/content';
import type { Note, NoteContent } from '@/types/database.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function safeName(input: string, fallback = 'note'): string {
  return (
    input
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, ' ')
      .slice(0, 80) || fallback
  );
}

/** Server-side zip export of every note as Markdown + a JSON backup. */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const [{ data: notes, error }, { data: folders }] = await Promise.all([
    supabase
      .from('notes')
      .select('id, title, content, folder_id, updated_at, is_archived, deleted_at')
      .eq('user_id', user.id)
      .is('deleted_at', null),
    supabase.from('folders').select('id, name, parent_id').eq('user_id', user.id),
  ]);

  if (error) return NextResponse.json({ error: 'query_failed' }, { status: 500 });

  const folderNames = new Map((folders ?? []).map((folder) => [folder.id, folder.name as string]));
  const files: Record<string, Uint8Array> = {};
  const used = new Set<string>();

  for (const note of (notes ?? []) as Pick<Note, 'id' | 'title' | 'content' | 'folder_id'>[]) {
    const folder = note.folder_id ? folderNames.get(note.folder_id) : null;
    const base = safeName(note.title || 'بدون-عنوان');
    let path = `${folder ? `${safeName(folder)}/` : ''}${base}.md`;
    let counter = 2;
    while (used.has(path)) {
      path = `${folder ? `${safeName(folder)}/` : ''}${base}-${counter}.md`;
      counter += 1;
    }
    used.add(path);
    files[path] = strToU8(docToMarkdown(note.content as NoteContent, note.title));
  }

  files['backup.json'] = strToU8(JSON.stringify({ exported_at: new Date().toISOString(), notes, folders }, null, 2));

  const zipped = zipSync(files, { level: 6 });
  const filename = `note-backup-${new Date().toISOString().slice(0, 10)}.zip`;

  return new NextResponse(zipped, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
