'use client';

import { useRouter } from 'next/navigation';
import { useHotkeys } from '@/hooks/use-hotkeys';
import { useUiStore } from '@/store/ui-store';
import { useNoteActions } from '@/features/notes/use-note-actions';

export function GlobalHotkeys() {
  const router = useRouter();
  const { setCommandPaletteOpen, toggleFocusMode, setShortcutsDialogOpen } = useUiStore();
  const { createNote } = useNoteActions();

  useHotkeys(
    {
      'mod+k': () => setCommandPaletteOpen(true),
      'mod+n': () => {
        void createNote({}).then((id) => id && router.push(`/notes/${id}`));
      },
      'mod+shift+f': () => toggleFocusMode(),
      'mod+shift+e': () => router.push('/search'),
      '?': () => setShortcutsDialogOpen(true),
      'mod+/': () => setShortcutsDialogOpen(true),
      'mod+shift+d': () => router.push('/daily'),
      'mod+shift+t': () => router.push('/trash'),
    },
    { allowInEditor: ['mod+k', 'mod+shift+f', 'mod+n'] },
  );

  return null;
}
