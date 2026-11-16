'use client';

import * as React from 'react';

type Direction = 'rtl' | 'ltr';

const DirectionContext = React.createContext<Direction>('rtl');

export function DirectionProvider({ dir, children }: { dir: Direction; children: React.ReactNode }) {
  return <DirectionContext.Provider value={dir}>{children}</DirectionContext.Provider>;
}

export function useDirection(): Direction {
  return React.useContext(DirectionContext);
}
