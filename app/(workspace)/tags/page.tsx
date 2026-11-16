import type { Metadata } from 'next';
import { TagsPage as TagsManagerPage } from '@/features/tags/tag-screen';

export const metadata: Metadata = { title: 'برچسب‌ها' };

export default function TagsRoutePage() {
  return <TagsManagerPage />;
}
