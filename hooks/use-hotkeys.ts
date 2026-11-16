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
      const parts: string[] = [];
      if (mod) parts.push('mod');
      if (event.altKey) parts.push('alt');
      if (event.shiftKey) parts.push('shift');
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase();
      parts.push(key);
      const combo = parts.join('+');

      const callback = ref.current[combo];
      if (!callback) return;

      const allowedInEditor = options.allowInEditor?.includes(combo);
      if (!event.metaKey && !event.ctrlKey && !event.altKey && isEditableTarget(event.target) && !allowedInEditor) {
        return;
      }

      if (event.shiftKey && event.key === '/' && !callback) return;
      event.preventDefault();
      callback(event);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [options.allowInEditor]);
}
