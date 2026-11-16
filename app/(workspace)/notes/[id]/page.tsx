import type { Metadata } from 'next';
import { NoteScreen } from '@/features/notes/note-screen';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  return { title: 'یادداشت', description: `یادداشت ${id.slice(0, 8)}` };
}

export default async function NotePage({ params }: Params) {
  const { id } = await params;
  return <NoteScreen noteId={id} />;
}
