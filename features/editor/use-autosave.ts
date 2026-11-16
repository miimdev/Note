'use client';

import * as React from 'react';
import type { NoteContent } from '@/types/database.types';
import { buildLocalNote, getNote, saveNoteLocally } from '@/lib/db/notes-repo';
import { useUiStore } from '@/store/ui-store';
import { useNotesStore } from '@/store/notes-store';
import { useSyncStore } from '@/store/sync-store';
import { getSyncEngine } from '@/lib/sync/engine';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type UseAutosaveParams = {
  noteId: string;
  userId: string;
  delay?: number;
};

type AutosaveState = {
  save: (data: { title: string; content: NoteContent }) => void;
  saveNow: () => Promise<void>;
  status: ReturnType<typeof useUiStore.getState>['saveStatus'];
  lastSavedAt: string | null;
};

const AUTOSAVE_DELAY = 700;

export function useAutosave({ noteId, userId, delay = AUTOSAVE_DELAY }: UseAutosaveParams): AutosaveState {
  const setSaveStatus = useUiStore((state) => state.setSaveStatus);
  const status = useUiStore((state) => state.saveStatus);
  const pending = React.useRef<{ title: string; content: NoteContent } | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastSavedAt, setLastSavedAt] = React.useState<string | null>(null);
  const inFlight = React.useRef(false);

  const persist = React.useCallback(async () => {
    if (!pending.current || inFlight.current) return;
    const snapshot = pending.current;
    pending.current = null;
    inFlight.current = true;

    try {
      const existing = await getNote(noteId);
      const localNote = buildLocalNote(
        {
          id: noteId,
          userId,
          title: snapshot.title,
          content: snapshot.content,
          folderId: existing?.folder_id ?? null,
        },
        existing,
      );

      await saveNoteLocally({
        note: localNote,
        op: 'upsert',
        payload: {
          id: localNote.id,
          folder_id: localNote.folder_id,
          title: localNote.title,
          content: localNote.content,
          icon: localNote.icon,
          is_pinned: localNote.is_pinned,
          is_favorite: localNote.is_favorite,
          is_archived: localNote.is_archived,
          deleted_at: localNote.deleted_at,
          daily_date: localNote.daily_date,
        },
      });

      useNotesStore.getState().upsertNote(localNote);

      const online = typeof navigator === 'undefined' ? true : navigator.onLine;
      if (!online) {
        setSaveStatus('offline');
        useSyncStore.getState().setPending(await countPending());
      } else {
        setSaveStatus('saving');
        const engine = getSyncEngine(getSupabaseBrowserClient(), userId);
        await engine.sync();
        setSaveStatus('saved');
        setLastSavedAt(new Date().toISOString());
      }
    } catch {
      setSaveStatus('error');
    } finally {
      inFlight.current = false;
      if (pending.current) {
        // Changes arrived while saving: schedule another pass.
        timer.current = setTimeout(() => void persist(), 150);
      }
    }
  }, [noteId, setSaveStatus, userId]);

  const save = React.useCallback(
    (data: { title: string; content: NoteContent }) => {
      pending.current = data;
      setSaveStatus('dirty');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void persist(), delay);
    },
    [delay, persist, setSaveStatus],
  );

  const saveNow = React.useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    await persist();
  }, [persist]);

  React.useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (pending.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { save, saveNow, status, lastSavedAt };
}

async function countPending(): Promise<number> {
  const { getDb } = await import('@/lib/db/local-db');
  return getDb().outbox.count();
}
