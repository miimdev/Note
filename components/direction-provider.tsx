'use client';

import * as React from 'react';
import { getClientLocale } from '@/lib/i18n/client';

type Direction = 'rtl' | 'ltr';

const DirectionContext = React.createContext<Direction>('rtl');

export function DirectionProvider({
  dir,
  children,
}: {
  /** Server build: the direction comes from the locale cookie. */
  dir?: Direction;
  children: React.ReactNode;
}) {
  const [direction, setDirection] = React.useState<Direction>(dir ?? 'rtl');

  // Static build: no server to read the cookie, so sync it on mount and keep
  // <html dir> in step (the server version already renders the right value).
  React.useEffect(() => {
    if (dir) return;
    const next = getClientLocale() === 'fa' ? 'rtl' : 'ltr';
    setDirection(next);
    document.documentElement.dir = next;
    document.documentElement.lang = next === 'rtl' ? 'fa' : 'en';
  }, [dir]);

  return <DirectionContext.Provider value={direction}>{children}</DirectionContext.Provider>;
}

export function useDirection(): Direction {
  return React.useContext(DirectionContext);
}
