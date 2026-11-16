import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SharedNoteView } from '@/features/share/shared-note-view';

export const metadata: Metadata = {
  title: 'یادداشت اشتراکی',
  robots: { index: false, follow: false },
};

/**
 * Static host version of the public share page. The token travels in the query
 * string (`/s?id=<token>`) because GitHub Pages cannot route `/s/<token>`.
 */
export default function SharedNotePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <SharedNoteView />
    </Suspense>
  );
}
