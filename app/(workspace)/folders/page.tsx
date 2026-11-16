import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FoldersRoute } from '@/features/routing/static-routes';

export const metadata: Metadata = { title: 'پوشه' };

/** Static host entry point for folders (`/folders?id=<folder-id>`). */
export default function FoldersPage() {
  return (
    <Suspense
      fallback={<div className="mx-auto h-64 w-full max-w-6xl animate-pulse rounded-xl bg-muted" />}
    >
      <FoldersRoute />
    </Suspense>
  );
}
