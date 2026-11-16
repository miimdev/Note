'use client';

import * as React from 'react';
import { highlightParts } from '@/lib/search-query';

export function HighlightText({ text, query }: { text: string; query: string }) {
  const parts = React.useMemo(() => highlightParts(text, query), [text, query]);

  if (!query.trim()) return <>{text}</>;

  return (
    <>
      {parts.map((part, index) =>
        part.match ? (
          <mark key={index} className="search-hit">
            {part.text}
          </mark>
        ) : (
          <React.Fragment key={index}>{part.text}</React.Fragment>
        ),
      )}
    </>
  );
}
