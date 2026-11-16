'use client';

import * as React from 'react';
import { toast } from 'sonner';
import type { Folder } from '@/types/database.types';
import { getDb } from '@/lib/db/local-db';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useNotesStore } from '@/store/notes-store';
import { useSync } from '@/features/sync/sync-provider';
import { slugify } from '@/lib/utils';

export function useFolderActions() {
  const { userId } = useSync();
  const folders = useNotesStore((state) => state.folders);
  const setFolders = useNotesStore((state) => state.setFolders);

  const createFolder = React.useCallback(
    async (input: { name: string; parentId?: string | null; color?: string | null; icon?: string | null }) => {
      if (!userId) return null;
      const client = getSupabaseBrowserClient();
      const payload = {
        user_id: userId,
        name: input.name.trim(),
        parent_id: input.parentId ?? null,
        color: input.color ?? null,
        icon: input.icon ?? null,
        position: folders.filter((folder) => folder.parent_id === (input.parentId ?? null)).length,
      };

      const { data, error } = await client.from('folders').insert(payload).select('*').single();
      if (error) {
        toast.error('ساخت پوشه ناموفق بود', { description: error.message });
        return null;
      }

      const next = [...folders, data as Folder];
      setFolders(next);
      await getDb().folders.put(data as Folder);
      toast.success('پوشه ساخته شد');
      return data as Folder;
    },
    [folders, setFolders, userId],
  );

  const renameFolder = React.useCallback(
    async (folder: Folder, name: string) => {
      const client = getSupabaseBrowserClient();
      const { data, error } = await client.from('folders').update({ name }).eq('id', folder.id).select('*').single();
      if (error) {
        toast.error('تغییر نام ناموفق بود', { description: error.message });
        return;
      }
      setFolders(folders.map((item) => (item.id === folder.id ? (data as Folder) : item)));
      await getDb().folders.put(data as Folder);
    },
    [folders, setFolders],
  );

  const removeFolder = React.useCallback(
    async (folder: Folder) => {
      const confirmed = window.confirm(`پوشه «${folder.name}» حذف شود؟ یادداشت‌ها به سطل زباله نمی‌روند، فقط بدون پوشه می‌شوند.`);
      if (!confirmed) return;

      const client = getSupabaseBrowserClient();
      const { error } = await client.from('folders').delete().eq('id', folder.id);
      if (error) {
        toast.error('حذف پوشه ناموفق بود', { description: error.message });
        return;
      }
      setFolders(folders.filter((item) => item.id !== folder.id));
      await getDb().folders.delete(folder.id);
      toast.success('پوشه حذف شد');
    },
    [folders, setFolders],
  );

  const ensureTag = React.useCallback(
    async (name: string, color?: string | null) => {
      if (!userId) return null;
      const client = getSupabaseBrowserClient();
      const slug = slugify(name);
      const { data, error } = await client
        .from('tags')
        .upsert({ user_id: userId, name: name.trim(), slug, color: color ?? null }, { onConflict: 'user_id,slug' })
        .select('*')
        .single();
      if (error) return null;
      return data;
    },
    [userId],
  );

  return { createFolder, renameFolder, removeFolder, ensureTag };
}
