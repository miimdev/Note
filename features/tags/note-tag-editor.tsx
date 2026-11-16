'use client';

import * as React from 'react';
import { Hash, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Tag } from '@/types/database.types';
import { useNotesStore } from '@/store/notes-store';
import { useSync } from '@/features/sync/sync-provider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getDb } from '@/lib/db/local-db';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { slugify } from '@/lib/utils';
import { TAG_COLORS } from './tag-colors';

export function NoteTagEditor({ noteId }: { noteId: string }) {
  const { userId } = useSync();
  const tags = useNotesStore((state) => state.tags);
  const noteTags = useNotesStore((state) => state.noteTags);
  const setTags = useNotesStore((state) => state.setTags);
  const setNoteTags = useNotesStore((state) => state.setNoteTags);
  const [value, setValue] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const activeIds = noteTags.get(noteId) ?? [];
  const activeTags = tags.filter((tag) => activeIds.includes(tag.id));

  const attach = React.useCallback(
    async (tag: Tag) => {
      if (!userId) return;
      const next = [...new Set([...activeIds, tag.id])];
      const map = new Map(noteTags);
      map.set(noteId, next);
      setNoteTags(map);
      await getDb().noteTags.put({ note_id: noteId, tag_id: tag.id, user_id: userId });
      const client = getSupabaseBrowserClient();
      const { error } = await client.from('note_tags').insert({ note_id: noteId, tag_id: tag.id, user_id: userId });
      if (error && !error.message.includes('duplicate')) toast.error('افزودن برچسب ناموفق بود');
    },
    [activeIds, noteId, noteTags, setNoteTags, userId],
  );

  const detach = React.useCallback(
    async (tagId: string) => {
      const next = activeIds.filter((id) => id !== tagId);
      const map = new Map(noteTags);
      map.set(noteId, next);
      setNoteTags(map);
      await getDb().noteTags.where('[note_id+tag_id]').equals([noteId, tagId]).delete();
      const client = getSupabaseBrowserClient();
      await client.from('note_tags').delete().eq('note_id', noteId).eq('tag_id', tagId);
    },
    [activeIds, noteId, noteTags, setNoteTags],
  );

  const createAndAttach = async () => {
    const name = value.trim();
    if (!name || !userId) return;
    setBusy(true);
    try {
      const client = getSupabaseBrowserClient();
      const color = TAG_COLORS[tags.length % TAG_COLORS.length];
      const { data, error } = await client
        .from('tags')
        .upsert({ user_id: userId, name, slug: slugify(name), color }, { onConflict: 'user_id,slug' })
        .select('*')
        .single();
      if (error) throw error;
      const tag = data as Tag;
      if (!tags.some((item) => item.id === tag.id)) {
        setTags([...tags, tag]);
        await getDb().tags.put(tag);
      }
      await attach(tag);
      setValue('');
    } catch (error) {
      toast.error('ساخت برچسب ناموفق بود', {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h3 className="muted-label mb-2 flex items-center gap-1.5">
        <Hash className="h-3.5 w-3.5" /> برچسب‌ها
      </h3>

      <div className="mb-2 flex flex-wrap gap-1">
        {activeTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]"
            style={tag.color ? { borderColor: `${tag.color}55`, color: tag.color } : undefined}
          >
            {tag.name}
            <button type="button" onClick={() => void detach(tag.id)} aria-label={`حذف برچسب ${tag.name}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {activeTags.length === 0 && <span className="text-xs text-muted-foreground">بدون برچسب</span>}
      </div>

      <div className="flex gap-1.5">
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void createAndAttach();
            }
          }}
          placeholder="برچسب جدید…"
          aria-label="افزودن برچسب"
          className="h-8 text-xs"
          list="tag-suggestions"
        />
        <datalist id="tag-suggestions">
          {tags
            .filter((tag) => !activeIds.includes(tag.id))
            .map((tag) => (
              <option key={tag.id} value={tag.name} />
            ))}
        </datalist>
        <Button size="icon-sm" variant="outline" onClick={() => void createAndAttach()} disabled={busy || !value.trim()} aria-label="افزودن">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {tags.filter((tag) => !activeIds.includes(tag.id)).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags
            .filter((tag) => !activeIds.includes(tag.id))
            .slice(0, 8)
            .map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => void attach(tag)}
                className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent"
              >
                + {tag.name}
              </button>
            ))}
        </div>
      )}
    </section>
  );
}
