import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SearchScreen } from '@/features/search/search-screen';

export const metadata: Metadata = { title: 'جستجو' };

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
      <SearchScreen />
    </Suspense>
  );
}
