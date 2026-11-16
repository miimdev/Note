import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TagsRoute } from '@/features/routing/static-routes';

export const metadata: Metadata = { title: 'برچسب‌ها' };

/** Tag manager, or the filtered note list for `?id=<slug>` on a static host. */
export default function TagsRoutePage() {
  return (
    <Suspense
      fallback={<div className="mx-auto h-64 w-full max-w-6xl animate-pulse rounded-xl bg-muted" />}
    >
      <TagsRoute />
    </Suspense>
  );
}
