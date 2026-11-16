import type { Metadata } from 'next';
import { Suspense } from 'react';
import { NotesRoute } from '@/features/routing/static-routes';

export const metadata: Metadata = { title: 'همه یادداشت‌ها' };

/**
 * List view, plus the editor when `?id=` is present. Static hosts cannot route
 * `/notes/<id>`, and the server build keeps its own `/notes/[id]` route.
 */
export default function NotesPage() {
  return (
    <Suspense
      fallback={<div className="mx-auto h-64 w-full max-w-6xl animate-pulse rounded-xl bg-muted" />}
    >
      <NotesRoute />
    </Suspense>
  );
}
