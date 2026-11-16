'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, Link2, Loader2, Sparkles } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSync } from '@/features/sync/sync-provider';
import { useNotesStore } from '@/store/notes-store';
import type { NoteLink } from '@/types/database.types';
import { cn } from '@/lib/utils';

type RelatedNote = { id: string; title: string; reason: string };

type Props = { noteId: string };

/**
 * Outgoing links (`[[title]]`) and backlinks (notes pointing here), plus
 * server-side "related notes" suggestions. All data is fetched through RLS
 * protected queries; nothing leaves the current user's workspace.
 */
export function BacklinksPanel({ noteId }: Props) {
  const { userId } = useSync();
  const notes = useNotesStore((state) => state.notes);
  const [links, setLinks] = React.useState<NoteLink[]>([]);
  const [incoming, setIncoming] = React.useState<NoteLink[]>([]);
  const [related, setRelated] = React.useState<RelatedNote[]>([]);
  const [loading, setLoading] = React.useState(true);

  const titleById = React.useMemo(
    () => new Map(notes.map((note) => [note.id, note.title || 'بدون عنوان'])),
    [notes],
  );

  React.useEffect(() => {
    let active = true;

    async function load() {
      if (!userId) return;
      setLoading(true);
      const client = getSupabaseBrowserClient();

      const [outgoing, backlinks, suggestions] = await Promise.all([
        client.from('note_links').select('*').eq('source_note_id', noteId),
        client.from('note_links').select('*').eq('target_note_id', noteId),
        client.rpc('related_notes', { p_note_id: noteId, p_limit: 5 }),
      ]);

      if (!active) return;
      setLinks((outgoing.data ?? []) as NoteLink[]);
      setIncoming((backlinks.data ?? []) as NoteLink[]);
      setRelated(((suggestions.data ?? []) as { id: string; title: string; reason: string }[]) ?? []);
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [noteId, userId]);

  const reasonLabel: Record<string, string> = {
    link: 'لینک‌شده',
    backlink: 'به این یادداشت لینک داده',
    tag: 'برچسب مشترک',
    similar: 'عنوان مشابه',
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> در حال بارگذاری پیوندها…
      </div>
    );
  }

  const unresolved = links.filter((link) => !link.target_note_id);

  return (
    <div className="flex flex-col gap-4 text-sm">
      <section>
        <h3 className="muted-label mb-1.5 flex items-center gap-1.5">
          <ArrowUpRight className="h-3.5 w-3.5" /> لینک‌های خروجی ({links.length})
        </h3>
        {links.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            برای لینک‌دهی، در متن بنویسید <code className="rounded bg-muted px-1">[[عنوان یادداشت]]</code>
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {links.map((link) =>
              link.target_note_id ? (
                <li key={link.id}>
                  <Link
                    href={`/notes/${link.target_note_id}`}
                    className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-primary hover:bg-accent"
                  >
                    <Link2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">{titleById.get(link.target_note_id) ?? link.target_title}</span>
                  </Link>
                </li>
              ) : (
                <li key={link.id} className="flex items-center gap-1.5 px-1.5 py-1 text-muted-foreground">
                  <Link2 className="h-3 w-3 shrink-0 opacity-50" />
                  <span className="truncate">{link.target_title}</span>
                  <span className="rounded bg-muted px-1 text-[10px]">ناموجود</span>
                </li>
              ),
            )}
          </ul>
        )}
      </section>

      {unresolved.length > 0 && (
        <p className="rounded-md bg-muted/50 px-2 py-1.5 text-[11px] text-muted-foreground">
          لینک‌های «ناموجود» با ساخت یادداشتی با همان عنوان، خودکار وصل می‌شوند.
        </p>
      )}

      <section>
        <h3 className="muted-label mb-1.5 flex items-center gap-1.5">
          <ArrowDownLeft className="h-3.5 w-3.5" /> بک‌لینک‌ها ({incoming.length})
        </h3>
        {incoming.length === 0 ? (
          <p className="text-xs text-muted-foreground">هنوز یادداشت دیگری به این‌جا لینک نداده است.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {incoming.map((link) => (
              <li key={link.id}>
                <Link
                  href={`/notes/${link.source_note_id}`}
                  className="flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-accent"
                >
                  <ArrowDownLeft className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="truncate">{titleById.get(link.source_note_id) ?? 'یادداشت'}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {related.length > 0 && (
        <section>
          <h3 className="muted-label mb-1.5 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> پیشنهاد مرتبط
          </h3>
          <ul className="flex flex-col gap-1">
            {related.map((note) => (
              <li key={note.id}>
                <Link href={`/notes/${note.id}`} className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 hover:bg-accent">
                  <span className="truncate">{note.title || 'بدون عنوان'}</span>
                  <span className={cn('shrink-0 text-[10px] text-muted-foreground')}>
                    {reasonLabel[note.reason] ?? 'مرتبط'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
