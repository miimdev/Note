import type { Metadata } from 'next';
import { NotesView } from '@/features/notes/notes-view';

export const metadata: Metadata = { title: 'آرشیو' };

export default function ArchivePage() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <NotesView
        title="آرشیو"
        scope="archive"
        emptyTitle="آرشیو خالی است"
        emptyDescription="یادداشت‌هایی که فعلاً لازمشان ندارید اینجا نگه دارید."
      />
    </div>
  );
}
