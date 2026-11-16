import type { Metadata } from 'next';
import { NotesView } from '@/features/notes/notes-view';

export const metadata: Metadata = { title: 'سطل زباله' };

export default function TrashPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
      <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        یادداشت‌های سطل زباله بعد از ۳۰ روز به‌صورت خودکار برای همیشه حذف می‌شوند. تا آن زمان
        می‌توانید بازیابی کنید.
      </div>
      <NotesView
        title="سطل زباله"
        scope="trash"
        emptyTitle="سطل زباله خالی است"
        emptyDescription="یادداشت‌های حذف‌شده تا ۳۰ روز اینجا می‌مانند."
      />
    </div>
  );
}
