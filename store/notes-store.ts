'use client';

import { create } from 'zustand';
import type { Folder, NoteContent, Tag, Template } from '@/types/database.types';
import type { ConflictInfo, LocalNote } from '@/types/domain';

type NotesState = {
  userId: string | null;
  notes: LocalNote[];
  folders: Folder[];
  tags: Tag[];
  templates: Template[];
  noteTags: Map<string, string[]>;
  hydrated: boolean;
  loading: boolean;
  conflict: ConflictInfo | null;
  setUserId: (userId: string | null) => void;
  setNotes: (notes: LocalNote[]) => void;
  upsertNote: (note: LocalNote) => void;
  patchNote: (id: string, patch: Partial<LocalNote> & { content?: NoteContent }) => void;
  removeNote: (id: string) => void;
  setFolders: (folders: Folder[]) => void;
  setTags: (tags: Tag[]) => void;
  setTemplates: (templates: Template[]) => void;
  setNoteTags: (map: Map<string, string[]>) => void;
  setHydrated: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setConflict: (conflict: ConflictInfo | null) => void;
  reset: () => void;
};

export const useNotesStore = create<NotesState>((set) => ({
  userId: null,
  notes: [],
  folders: [],
  tags: [],
  templates: [],
  noteTags: new Map(),
  hydrated: false,
  loading: false,
  conflict: null,
  setUserId: (userId) => set({ userId }),
  setNotes: (notes) => set({ notes }),
  upsertNote: (note) =>
    set((state) => {
      const index = state.notes.findIndex((item) => item.id === note.id);
      if (index === -1) return { notes: [note, ...state.notes] };
      const next = [...state.notes];
      next[index] = note;
      return { notes: next };
    }),
  patchNote: (id, patch) =>
    set((state) => ({
      notes: state.notes.map((note) => (note.id === id ? { ...note, ...patch } : note)),
    })),
  removeNote: (id) => set((state) => ({ notes: state.notes.filter((note) => note.id !== id) })),
  setFolders: (folders) => set({ folders }),
  setTags: (tags) => set({ tags }),
  setTemplates: (templates) => set({ templates }),
  setNoteTags: (noteTags) => set({ noteTags }),
  setHydrated: (hydrated) => set({ hydrated }),
  setLoading: (loading) => set({ loading }),
  setConflict: (conflict) => set({ conflict }),
  reset: () =>
    set({
      notes: [],
      folders: [],
      tags: [],
      templates: [],
      noteTags: new Map(),
      hydrated: false,
      conflict: null,
    }),
}));
