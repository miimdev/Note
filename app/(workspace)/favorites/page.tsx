import type { Metadata } from 'next';
import { NotesView } from '@/features/notes/notes-view';

export const metadata: Metadata = { title: 'علاقه‌مندی‌ها' };

export default function FavoritesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <NotesView
        title="علاقه‌مندی‌ها"
        scope="favorites"
        emptyTitle="هنوز یادداشتی را ستاره نکرده‌اید"
        emptyDescription="با ستاره کردن یادداشت‌ها، سریع‌تر به آن‌ها دسترسی داشته باشید."
      />
    </div>
  );
}
