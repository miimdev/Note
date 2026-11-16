'use client';

import * as React from 'react';
import { toast } from 'sonner';
import type { NoteContent } from '@/types/database.types';
import type { LocalNote } from '@/types/domain';
import { buildLocalNote, getNote, saveNoteLocally, enqueue } from '@/lib/db/notes-repo';
import { getDb } from '@/lib/db/local-db';
import { useNotesStore } from '@/store/notes-store';
import { useSync } from '@/features/sync/sync-provider';
import { getSyncEngine } from '@/lib/sync/engine';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { emptyDoc } from '@/lib/editor/content';
import { isoToday } from '@/lib/jalali';

export type CreateNoteOptions = {
  title?: string;
  content?: NoteContent;
  folderId?: string | null;
  icon?: string | null;
  tagIds?: string[];
  dailyDate?: string | null;
};

export function useNoteActions() {
  const { userId, engine } = useSync();
  const notes = useNotesStore((state) => state.notes);

  const createNote = React.useCallback(
    async (options: CreateNoteOptions = {}): Promise<string | null> => {
      if (!userId) return null;
      const id = crypto.randomUUID();
      const local = buildLocalNote({
        id,
        userId,
        title: options.title ?? '',
        content: options.content ?? emptyDoc(),
        folderId: options.folderId ?? null,
        icon: options.icon ?? null,
        dailyDate: options.dailyDate ?? null,
      });

      await saveNoteLocally({
        note: local,
        op: 'upsert',
        payload: {
          id: local.id,
          folder_id: local.folder_id,
          title: local.title,
          content: local.content,
          icon: local.icon,
          daily_date: local.daily_date,
        },
      });

      useNotesStore.getState().upsertNote(local);

      if (options.tagIds?.length) {
        for (const tagId of options.tagIds) {
          await getDb().noteTags.put({ note_id: id, tag_id: tagId, user_id: userId });
          await enqueue({
            entity: 'note_tag',
            entityId: `${id}:${tagId}`,
            op: 'upsert',
            payload: { note_id: id, tag_id: tagId },
            createdAt: Date.now(),
            attempts: 0,
          });
        }
        const client = getSupabaseBrowserClient();
        await client.from('note_tags').insert(options.tagIds.map((tagId) => ({ note_id: id, tag_id: tagId, user_id: userId })));
        const map = new Map(useNotesStore.getState().noteTags);
        map.set(id, options.tagIds);
        useNotesStore.getState().setNoteTags(map);
      }

      void engine?.sync();
      return id;
    },
    [engine, userId],
  );

  const ensureDailyNote = React.useCallback(
    async (date = isoToday(), title: string): Promise<string | null> => {
      const existing = notes.find((note) => note.daily_date === date && !note.deleted_at);
      if (existing) return existing.id;
      return createNote({ title, dailyDate: date });
    },
    [createNote, notes],
  );

  const updateNote = React.useCallback(
    async (id: string, patch: Partial<LocalNote>) => {
      if (!userId) return;
      const existing = await getNote(id);
      if (!existing) return;

      const next: LocalNote = {
        ...existing,
        ...patch,
        updated_at: new Date().toISOString(),
      };

      await saveNoteLocally({
        note: next,
        op: 'upsert',
        payload: {
          id: next.id,
          folder_id: next.folder_id,
          title: next.title,
          content: next.content,
          icon: next.icon,
          cover_url: next.cover_url,
          is_pinned: next.is_pinned,
          is_favorite: next.is_favorite,
          is_archived: next.is_archived,
          deleted_at: next.deleted_at,
          daily_date: next.daily_date,
        },
      });

      useNotesStore.getState().upsertNote(next);
      void engine?.sync();
    },
    [engine, userId],
  );

  const togglePinned = React.useCallback(
    async (id: string) => {
      const note = notes.find((item) => item.id === id);
      if (!note) return;
      await updateNote(id, { is_pinned: !note.is_pinned });
    },
    [notes, updateNote],
  );

  const toggleFavorite = React.useCallback(
    async (id: string) => {
      const note = notes.find((item) => item.id === id);
      if (!note) return;
      await updateNote(id, { is_favorite: !note.is_favorite });
    },
    [notes, updateNote],
  );

  const archiveNote = React.useCallback(
    async (id: string, archived = true) => {
      await updateNote(id, { is_archived: archived });
      toast.success(archived ? 'یادداشت آرشیو شد' : 'از آرشیو خارج شد');
    },
    [updateNote],
  );

  const trashNote = React.useCallback(
    async (id: string) => {
      await updateNote(id, { deleted_at: new Date().toISOString() });
      toast.success('به سطل زباله منتقل شد', { description: 'تا ۳۰ روز قابل بازیابی است.' });
    },
    [updateNote],
  );

  const restoreNote = React.useCallback(
    async (id: string) => {
      await updateNote(id, { deleted_at: null });
      toast.success('یادداشت بازیابی شد');
    },
    [updateNote],
  );

  const deleteForever = React.useCallback(
    async (id: string) => {
      if (!userId) return;
      const client = getSupabaseBrowserClient();
      await getDb().notes.delete(id);
      useNotesStore.getState().removeNote(id);
      const { error } = await client.from('notes').delete().eq('id', id);
      if (error) {
        toast.error('حذف قطعی ناموفق بود', { description: error.message });
      } else {
        toast.success('برای همیشه حذف شد');
      }
    },
    [userId],
  );

  const duplicateNote = React.useCallback(
    async (id: string) => {
      const note = await getNote(id);
      if (!note?.content) return null;
      return createNote({
        title: `${note.title} (کپی)`,
        content: note.content,
        folderId: note.folder_id,
      });
    },
    [createNote],
  );

  const moveNote = React.useCallback(
    async (id: string, folderId: string | null) => {
      await updateNote(id, { folder_id: folderId });
    },
    [updateNote],
  );

  return {
    createNote,
    ensureDailyNote,
    updateNote,
    togglePinned,
    toggleFavorite,
    archiveNote,
    trashNote,
    restoreNote,
    deleteForever,
    duplicateNote,
    moveNote,
  };
}
