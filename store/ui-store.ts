'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NoteSort, SaveStatus } from '@/types/domain';
import type { CalendarKind } from '@/lib/jalali';

export type SidebarState = 'expanded' | 'collapsed';

type UiState = {
  sidebar: SidebarState;
  focusMode: boolean;
  commandPaletteOpen: boolean;
  shortcutsDialogOpen: boolean;
  saveStatus: SaveStatus;
  sort: NoteSort;
  calendar: CalendarKind;
  editorFontSize: 'sm' | 'md' | 'lg';
  setSidebar: (state: SidebarState) => void;
  toggleSidebar: () => void;
  setFocusMode: (value: boolean) => void;
  toggleFocusMode: () => void;
  setCommandPaletteOpen: (value: boolean) => void;
  setShortcutsDialogOpen: (value: boolean) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setSort: (sort: NoteSort) => void;
  setCalendar: (calendar: CalendarKind) => void;
  setEditorFontSize: (size: 'sm' | 'md' | 'lg') => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebar: 'expanded',
      focusMode: false,
      commandPaletteOpen: false,
      shortcutsDialogOpen: false,
      saveStatus: 'idle',
      sort: 'updated_desc',
      calendar: 'jalali',
      editorFontSize: 'md',
      setSidebar: (sidebar) => set({ sidebar }),
      toggleSidebar: () => set((state) => ({ sidebar: state.sidebar === 'expanded' ? 'collapsed' : 'expanded' })),
      setFocusMode: (focusMode) => set({ focusMode }),
      toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
      setShortcutsDialogOpen: (shortcutsDialogOpen) => set({ shortcutsDialogOpen }),
      setSaveStatus: (saveStatus) => set({ saveStatus }),
      setSort: (sort) => set({ sort }),
      setCalendar: (calendar) => set({ calendar }),
      setEditorFontSize: (editorFontSize) => set({ editorFontSize }),
    }),
    {
      name: 'note-ui-preferences',
      partialize: (state) => ({
        sidebar: state.sidebar,
        calendar: state.calendar,
        sort: state.sort,
        editorFontSize: state.editorFontSize,
      }),
    },
  ),
);
