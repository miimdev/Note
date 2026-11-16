'use client';

import { useNotesStore } from '@/store/notes-store';
import { NotesView } from '@/features/notes/notes-view';
import { TagsManager } from './tags-manager';

export function TagScreen({ slug }: { slug: string }) {
  const tags = useNotesStore((state) => state.tags);
  const tag = tags.find((item) => item.slug === slug);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <NotesView
        title={tag ? `#${tag.name}` : `#${slug}`}
        scope="tag"
        tagId={tag?.id ?? null}
        emptyTitle="یادداشتی با این برچسب نیست"
        emptyDescription="برچسب‌ها را از پنل کنار هر یادداشت اضافه کنید."
      />
    </div>
  );
}

export function TagsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <TagsManager />
    </div>
  );
}
