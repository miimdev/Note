import type { Metadata } from 'next';
import { FolderScreen } from '@/features/folders/folder-screen';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  void id;
  return { title: 'پوشه' };
}

export default async function FolderPage({ params }: Params) {
  const { id } = await params;
  return <FolderScreen folderId={id} />;
}
