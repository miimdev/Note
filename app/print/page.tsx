import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PrintNoteView } from '@/features/export/print-note-view';

export const metadata: Metadata = {
  title: 'چاپ یادداشت',
  robots: { index: false, follow: false },
};

/** Static host version of the print/PDF page (`/print?id=<note-id>`). */
export default function PrintPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <PrintNoteView />
    </Suspense>
  );
}
