import type { Metadata } from 'next';
import { NotesView } from '@/features/notes/notes-view';
import { ImportMarkdownButton } from '@/features/export/import-markdown';

export const metadata: Metadata = { title: 'همه یادداشت‌ها' };

export default function NotesPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div className="flex justify-end">
        <ImportMarkdownButton />
      </div>
      <NotesView title="همه یادداشت‌ها" scope="all" />
    </div>
  );
}
