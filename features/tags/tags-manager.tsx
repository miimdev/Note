'use client';

import * as React from 'react';
import Link from 'next/link';
import { Hash, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNotesStore } from '@/store/notes-store';
import { useSync } from '@/features/sync/sync-provider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getDb } from '@/lib/db/local-db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { slugify } from '@/lib/utils';
import { TAG_COLORS } from './tag-colors';

export function TagsManager() {
  const { userId } = useSync();
  const tags = useNotesStore((state) => state.tags);
  const noteTags = useNotesStore((state) => state.noteTags);
  const setTags = useNotesStore((state) => state.setTags);
  const [name, setName] = React.useState('');
  const [color, setColor] = React.useState<string>(TAG_COLORS[0]);

  const counts = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const [, tagIds] of noteTags) {
      for (const tagId of tagIds) map.set(tagId, (map.get(tagId) ?? 0) + 1);
    }
    return map;
  }, [noteTags]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId || !name.trim()) return;
    const client = getSupabaseBrowserClient();
    const { data, error } = await client
      .from('tags')
      .upsert(
        { user_id: userId, name: name.trim(), slug: slugify(name), color },
        { onConflict: 'user_id,slug' },
      )
      .select('*')
      .single();

    if (error) {
      toast.error('ساخت برچسب ناموفق بود', { description: error.message });
      return;
    }
    setTags([...tags.filter((tag) => tag.id !== data.id), data]);
    await getDb().tags.put(data);
    setName('');
    toast.success('برچسب ساخته شد');
  };

  const remove = async (id: string) => {
    if (!window.confirm('این برچسب حذف شود؟ از یادداشت‌ها هم برداشته می‌شود.')) return;
    const client = getSupabaseBrowserClient();
    const { error } = await client.from('tags').delete().eq('id', id);
    if (error) {
      toast.error('حذف ناموفق بود');
      return;
    }
    setTags(tags.filter((tag) => tag.id !== id));
    await getDb().tags.delete(id);
    await getDb().noteTags.where('tag_id').equals(id).delete();
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">برچسب‌ها</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          برچسب‌های رنگی برای دسته‌بندی سریع یادداشت‌ها.
        </p>
      </div>

      <form onSubmit={create} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="tag-name" className="text-xs text-muted-foreground">
            نام برچسب
          </label>
          <Input
            id="tag-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={60}
          />
        </div>
        <div className="flex gap-1">
          {TAG_COLORS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setColor(option)}
              aria-label={`رنگ ${option}`}
              aria-pressed={color === option}
              className="h-7 w-7 rounded-full border-2"
              style={{
                backgroundColor: option,
                borderColor: color === option ? 'currentColor' : 'transparent',
              }}
            />
          ))}
        </div>
        <Button type="submit" disabled={!name.trim()} className="gap-1.5">
          <Plus className="h-4 w-4" /> افزودن
        </Button>
      </form>

      {tags.length === 0 ? (
        <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
          هنوز برچسبی نساخته‌اید.
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border">
          {tags.map((tag) => (
            <li key={tag.id} className="flex items-center gap-3 px-3 py-2.5">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: tag.color ?? '#6366f1' }}
                aria-hidden
              >
                <Hash className="h-3.5 w-3.5" />
              </span>
              <Link href={`/tags/${tag.slug}`} className="flex-1 truncate text-sm hover:underline">
                {tag.name}
              </Link>
              <span className="text-xs text-muted-foreground">
                {counts.get(tag.id) ?? 0} یادداشت
              </span>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => void remove(tag.id)}
                aria-label={`حذف ${tag.name}`}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
