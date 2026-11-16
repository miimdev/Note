'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getSyncEngine, type SyncEngine } from '@/lib/sync/engine';
import { useNotesStore } from '@/store/notes-store';
import { useSyncStore } from '@/store/sync-store';
import { getDb } from '@/lib/db/local-db';
import type { Note } from '@/types/database.types';
import { emptyDoc } from '@/lib/editor/content';

/** The conflict dialog only reads these fields; fill them for local rows. */
function toConflictNote(note: (Partial<Note> & { id: string }) | LocalNoteForConflict): Note {
  return {
    id: note.id,
    user_id: note.user_id ?? '',
    folder_id: note.folder_id ?? null,
    title: note.title ?? '',
    content: note.content ?? emptyDoc(),
    content_text: note.content_text ?? '',
    icon: note.icon ?? null,
    cover_url: note.cover_url ?? null,
    is_pinned: note.is_pinned ?? false,
    is_favorite: note.is_favorite ?? false,
    is_archived: note.is_archived ?? false,
    deleted_at: note.deleted_at ?? null,
    daily_date: note.daily_date ?? null,
    version: note.version ?? 1,
    last_edited_at: note.last_edited_at ?? note.updated_at ?? new Date().toISOString(),
    created_at: note.created_at ?? new Date().toISOString(),
    updated_at: note.updated_at ?? new Date().toISOString(),
  };
}

type LocalNoteForConflict = Partial<Note> & { id: string };

type SyncContextValue = {
  engine: SyncEngine | null;
  userId: string | null;
  user: User | null;
  ready: boolean;
  signedIn: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const SyncContext = React.createContext<SyncContextValue>({
  engine: null,
  userId: null,
  user: null,
  ready: false,
  signedIn: false,
  signOut: async () => {},
  refresh: async () => {},
});

export function useSync() {
  return React.useContext(SyncContext);
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [ready, setReady] = React.useState(false);
  const [engine, setEngine] = React.useState<SyncEngine | null>(null);
  const router = useRouter();
  const userId = user?.id ?? null;

  React.useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    async function boot() {
      let client;
      try {
        client = getSupabaseBrowserClient();
      } catch {
        if (active) setReady(true);
        return;
      }

      const {
        data: { session },
      } = await client.auth.getSession();
      if (!active) return;

      setUser(session?.user ?? null);
      setReady(true);

      const { data } = client.auth.onAuthStateChange(
        (_event: string, nextSession: { user: User | null } | null) => {
          setUser(nextSession?.user ?? null);
          if (!nextSession?.user) useNotesStore.getState().reset();
        },
      );
      unsubscribe = () => data.subscription.unsubscribe();
    }

    void boot();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const refresh = React.useCallback(async () => {
    const db = getDb();
    const [notes, folders, tags, noteTags, templates] = await Promise.all([
      db.notes.toArray(),
      db.folders.toArray(),
      db.tags.toArray(),
      db.noteTags.toArray(),
      db.templates.toArray(),
    ]);

    const store = useNotesStore.getState();
    store.setNotes(notes);
    store.setFolders(
      folders.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, 'fa')),
    );
    store.setTags(tags);
    store.setTemplates(templates);

    const tagMap = new Map<string, string[]>();
    for (const row of noteTags) {
      const list = tagMap.get(row.note_id) ?? [];
      list.push(row.tag_id);
      tagMap.set(row.note_id, list);
    }
    store.setNoteTags(tagMap);
  }, []);

  React.useEffect(() => {
    if (!userId) {
      setEngine(null);
      return;
    }

    let cancelled = false;
    let current: SyncEngine | null = null;

    async function hydrate(id: string) {
      const store = useNotesStore.getState();
      store.setUserId(id);
      store.setLoading(true);
      await refresh();
      store.setHydrated(true);
      store.setLoading(false);

      if (cancelled) return;

      const client = getSupabaseBrowserClient();
      current = getSyncEngine(client, id);
      current.subscribe(() => {
        void refresh();
      });
      current.onConflict(({ noteId, remote }) => {
        const local = useNotesStore.getState().notes.find((note) => note.id === noteId);
        if (!local) return;
        useNotesStore.getState().setConflict({
          noteId,
          local: toConflictNote({ ...local, content: local.content ?? emptyDoc() }),
          remote: toConflictNote(remote),
        });
      });

      setEngine(current);
      await current.start();
      await current.pullAll();
    }

    void hydrate(userId).catch(() => {
      useNotesStore.getState().setLoading(false);
      useNotesStore.getState().setHydrated(true);
    });

    return () => {
      cancelled = true;
      current?.stop();
    };
  }, [userId, refresh]);

  const signOut = React.useCallback(async () => {
    try {
      const client = getSupabaseBrowserClient();
      await client.auth.signOut();
    } finally {
      setUser(null);
      useNotesStore.getState().reset();
      router.push('/login');
    }
  }, [router]);

  // Keep the in-memory snapshot fresh when other tabs write to IndexedDB.
  React.useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => {
      void useSyncStore.getState().setOnline(navigator.onLine);
      void refresh();
    }, 60_000);
    return () => clearInterval(interval);
  }, [userId, refresh]);

  const value = React.useMemo<SyncContextValue>(
    () => ({ engine, userId, user, ready, signedIn: Boolean(user), signOut, refresh }),
    [engine, userId, user, ready, signOut, refresh],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
