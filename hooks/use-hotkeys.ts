'use client';

import { useEffect, useRef } from 'react';

export type HotkeyMap = Record<string, (event: KeyboardEvent) => void>;

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
};

/**
 * Registers global shortcuts such as "mod+k", "mod+shift+f" or "?".
 * `mod` maps to Cmd on macOS and Ctrl elsewhere.
 * Shortcuts never fire while the user types, unless marked with `allowInEditor`.
 */
export function useHotkeys(map: HotkeyMap, options: { allowInEditor?: string[] } = {}) {
  const ref = useRef(map);
  ref.current = map;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      const base: string[] = [];
      if (mod) base.push('mod');
      if (event.altKey) base.push('alt');

      // Punctuation such as `?` needs Shift on most layouts, but is registered
      // as a plain key. Try the explicit combo first, then the shift-less one.
      const combos: string[] = [];
      if (event.shiftKey) combos.push([...base, 'shift', key].join('+'));
      combos.push([...base, key].join('+'));

      const combo = combos.find((candidate) => ref.current[candidate]);
      if (!combo) return;
      const callback = ref.current[combo]!;

      const allowedInEditor = options.allowInEditor?.includes(combo);
      if (!mod && !event.altKey && isEditableTarget(event.target) && !allowedInEditor) {
        return;
      }

      event.preventDefault();
      callback(event);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [options.allowInEditor]);
}
