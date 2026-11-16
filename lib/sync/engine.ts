'use client';

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { Note } from '@/types/database.types';
import type { LocalNote, OutboxEntry } from '@/types/domain';
import { getDb, getLastSyncAt, setLastSyncAt } from '@/lib/db/local-db';
import { toSummary } from '@/lib/db/notes-repo';
import { useSyncStore } from '@/store/sync-store';
import { useNotesStore } from '@/store/notes-store';
import { backoffDelay, mergeNote } from '@/lib/sync-merge';
import {
  NOTE_COLUMNS,
  pullFolders,
  pullNotes,
  pullReminders,
  pullTags,
  pullTemplates,
} from './pull';

type ConflictListener = (info: { noteId: string }) => void;
type ChangeListener = () => void;

/**
 * Offline-first synchronisation:
 *  1. `flush()` drains the Dexie outbox into Supabase.
 *  2. `pullIncremental()` fetches notes updated since the last successful pull.
 *  3. Realtime pushes individual row changes for instant multi-device sync.
 * Conflicts (both sides edited) are surfaced to the UI instead of being lost.
 */
export class SyncEngine {
  readonly userId: string;
  private client: SupabaseClient;
  private channel: RealtimeChannel | null = null;
  private running = false;
  private scheduled: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<ChangeListener>();
  private conflictListeners = new Set<ConflictListener>();
  private started = false;

  constructor(client: SupabaseClient, userId: string) {
    this.client = client;
    this.userId = userId;
  }

  subscribe(listener: ChangeListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  onConflict(listener: ConflictListener) {
    this.conflictListeners.add(listener);
    return () => {
      this.conflictListeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  async start() {
    if (this.started) return;
    this.started = true;

    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    document.addEventListener('visibilitychange', this.handleVisibility);

    await this.sync();
    this.connectRealtime();
    this.loop();
  }

  stop() {
    this.started = false;
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    if (this.scheduled) clearTimeout(this.scheduled);
    this.channel?.unsubscribe();
    this.channel = null;
  }

  private handleOnline = () => {
    useSyncStore.getState().setOnline(true);
    void this.sync();
  };

  private handleOffline = () => {
    useSyncStore.getState().setOnline(false);
  };

  private handleVisibility = () => {
    if (document.visibilityState === 'visible') void this.sync();
  };

  private loop() {
    if (this.scheduled) clearTimeout(this.scheduled);
    this.scheduled = setTimeout(async () => {
      await this.sync();
      if (this.started) this.loop();
    }, 20_000);
  }

  /** Push then pull. Safe to call as often as you like. */
  async sync() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      useSyncStore.getState().setOnline(false);
      return;
    }
    useSyncStore.getState().setOnline(true);
    await this.flush();
    await this.pullIncremental();
  }

  async refreshPending() {
    const count = await getDb().outbox.count();
    useSyncStore.getState().setPending(count);
    return count;
  }

  private async flush() {
    if (this.running) return;
    const db = getDb();
    const items = await db.outbox.orderBy('createdAt').toArray();
    if (items.length === 0) {
      await this.refreshPending();
      return;
    }

    this.running = true;
    useSyncStore.getState().setSyncing(true);

    try {
      for (const item of items) {
        if (!navigator.onLine) break;
        try {
          await this.push(item);
          if (item.id !== undefined) await db.outbox.delete(item.id);
          useSyncStore.getState().setError(null);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          await db.outbox.update(item.id!, { attempts: item.attempts + 1, lastError: message });
          useSyncStore.getState().setError(message);
          if (item.attempts + 1 >= 5) {
            await db.outbox.delete(item.id!);
          } else {
            await new Promise((resolve) =>
              setTimeout(resolve, Math.min(backoffDelay(item.attempts), 4000)),
            );
          }
        }
      }
      useSyncStore.getState().markSynced();
    } finally {
      this.running = false;
      useSyncStore.getState().setSyncing(false);
      await this.refreshPending();
      this.notify();
    }
  }

  private async push(item: OutboxEntry) {
    if (item.entity !== 'note') return;

    if (item.op === 'delete') {
      const { error } = await this.client.from('notes').delete().eq('id', item.entityId);
      if (error) throw error;
      await getDb().notes.delete(item.entityId);
      return;
    }

    const payload = item.payload as Record<string, unknown>;
    const { data, error } = await this.client
      .from('notes')
      .upsert({ ...payload, user_id: this.userId }, { onConflict: 'id' })
      .select(NOTE_COLUMNS)
      .single();
    if (error) throw error;
    if (!data) return;

    const remote = data as Note;
    const db = getDb();
    const existing = await db.notes.get(item.entityId);
    await db.notes.put({
      ...toSummary(remote),
      content: remote.content,
      dirty: 0,
      pending_op: null,
      base_version: remote.version,
      server_updated_at: remote.updated_at,
      created_at: existing?.created_at ?? remote.created_at,
    });
    this.notify();
  }

  async pullIncremental(force = false) {
    const last = force ? null : await getLastSyncAt();
    try {
      const { newest } = await pullNotes(this.client, this.userId, last);
      if (newest) await setLastSyncAt(newest);
      useSyncStore.getState().markSynced();
      this.notify();
    } catch {
      /* offline or transient error: keep local state */
    }
  }

  async pullAll() {
    const results = await Promise.allSettled([
      this.pullIncremental(true),
      pullFolders(this.client, this.userId),
      pullTags(this.client, this.userId),
      pullTemplates(this.client),
      pullReminders(this.client, this.userId),
    ]);

    const store = useNotesStore.getState();
    const [notesResult, foldersResult, tagsResult, templatesResult] = results;

    if (foldersResult?.status === 'fulfilled') store.setFolders(foldersResult.value);
    if (tagsResult?.status === 'fulfilled') {
      store.setTags(tagsResult.value.tags);
      const map = new Map<string, string[]>();
      for (const row of tagsResult.value.links) {
        const list = map.get(row.note_id) ?? [];
        list.push(row.tag_id);
        map.set(row.note_id, list);
      }
      store.setNoteTags(map);
    }
    if (templatesResult?.status === 'fulfilled') store.setTemplates(templatesResult.value);
    void notesResult;

    const db = getDb();
    store.setNotes(await db.notes.toArray());
    this.notify();
  }

  private connectRealtime() {
    this.channel?.unsubscribe();
    this.channel = this.client
      .channel(`sync:${this.userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes', filter: `user_id=eq.${this.userId}` },
        (payload) => {
          void this.handleRemoteNote(
            payload.eventType,
            payload.new as Note,
            payload.old as Partial<Note>,
          );
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'folders', filter: `user_id=eq.${this.userId}` },
        () =>
          void pullFolders(this.client, this.userId).then((folders) =>
            useNotesStore.getState().setFolders(folders),
          ),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reminders', filter: `user_id=eq.${this.userId}` },
        () => void pullReminders(this.client, this.userId),
      )
      .on('system' as never, {} as never, () => undefined)
      .subscribe();
  }

  private async handleRemoteNote(eventType: string, remote: Note, _old: Partial<Note>) {
    const db = getDb();
    const local = await db.notes.get(remote.id);

    if (eventType === 'DELETE') {
      if (local && !local.dirty) {
        await db.notes.delete(remote.id);
        this.notify();
      }
      return;
    }

    // Our own write echoed back: nothing to do.
    if (local && !local.dirty && local.version >= remote.version) return;

    const outcome = mergeNote({
      local: local
        ? {
            id: local.id,
            title: local.title,
            content: local.content ?? { type: 'doc', content: [] },
            updated_at: local.updated_at,
            version: local.version,
            dirty: Boolean(local.dirty),
          }
        : null,
      remote,
      baseVersion: local?.base_version ?? null,
    });

    if (outcome.kind === 'conflict') {
      this.conflictListeners.forEach((listener) => listener({ noteId: remote.id }));
      return;
    }

    if (outcome.kind === 'local-newer') return;

    const merged: LocalNote = {
      ...toSummary(remote),
      content: remote.content,
      dirty: 0,
      pending_op: null,
      base_version: remote.version,
      server_updated_at: remote.updated_at,
    };
    await db.notes.put(merged);
    useNotesStore.getState().upsertNote(merged);
  }

  /** Keeps the local copy (`local`) or the server copy (`remote`) for a conflicted note. */
  async resolveConflict(noteId: string, choice: 'local' | 'remote') {
    const db = getDb();
    // Uses a modifier function: Dexie's UpdateSpec cannot express the recursive
    // TipTap `content` type.
    const clearDirty = async (id: string) => {
      await db.notes
        .where('id')
        .equals(id)
        .modify((row) => {
          row.dirty = 0;
          row.pending_op = null;
        });
    };
    const local = await db.notes.get(noteId);

    if (choice === 'remote' || !local?.content) {
      await db.outbox.where('entityId').equals(noteId).delete();
      await clearDirty(noteId);
      await this.pullIncremental(true);
      this.notify();
      return;
    }

    const payload = {
      id: local.id,
      user_id: this.userId,
      folder_id: local.folder_id,
      title: local.title,
      content: local.content,
      icon: local.icon,
      is_pinned: local.is_pinned,
      is_favorite: local.is_favorite,
      is_archived: local.is_archived,
      deleted_at: local.deleted_at,
      daily_date: local.daily_date,
    };

    await db.outbox.where('entityId').equals(noteId).delete();
    const { data, error } = await this.client
      .from('notes')
      .upsert(payload, { onConflict: 'id' })
      .select(NOTE_COLUMNS)
      .single();

    if (error) throw error;
    if (data) {
      const remote = data as Note;
      await db.notes.put({
        ...toSummary(remote),
        content: remote.content,
        dirty: 0,
        pending_op: null,
        base_version: remote.version,
        server_updated_at: remote.updated_at,
      });
    }
    useNotesStore.getState().setConflict(null);
    this.notify();
  }
}

let engineInstance: SyncEngine | null = null;

export function getSyncEngine(client: SupabaseClient, userId: string): SyncEngine {
  if (!engineInstance || engineInstance.userId !== userId) {
    engineInstance?.stop();
    engineInstance = new SyncEngine(client, userId);
  }
  return engineInstance;
}

export function disposeSyncEngine() {
  engineInstance?.stop();
  engineInstance = null;
}
