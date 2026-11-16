import type { Metadata } from 'next';
import { TagScreen } from '@/features/tags/tag-screen';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  return { title: `#${decodeURIComponent(slug)}` };
}

export default async function TagPage({ params }: Params) {
  const { slug } = await params;
  return <TagScreen slug={decodeURIComponent(slug)} />;
}
