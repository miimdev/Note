'use client';

import { create } from 'zustand';

export type SyncState = {
  online: boolean;
  syncing: boolean;
  pending: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setPending: (pending: number) => void;
  markSynced: () => void;
  setError: (error: string | null) => void;
};

export const useSyncStore = create<SyncState>((set) => ({
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  syncing: false,
  pending: 0,
  lastSyncedAt: null,
  lastError: null,
  setOnline: (online) => set({ online }),
  setSyncing: (syncing) => set({ syncing }),
  setPending: (pending) => set({ pending }),
  markSynced: () => set({ lastSyncedAt: new Date().toISOString(), lastError: null }),
  setError: (lastError) => set({ lastError }),
}));
