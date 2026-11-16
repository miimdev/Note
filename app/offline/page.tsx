import Link from 'next/link';
import { CloudOff } from 'lucide-react';

export const metadata = { title: 'آفلاین' };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <CloudOff className="h-6 w-6 text-muted-foreground" />
      </span>
      <div>
        <h1 className="text-lg font-semibold">اتصال اینترنت قطع است</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          یادداشت‌های ذخیره‌شده روی این دستگاه در دسترس هستند. تغییرات بعد از وصل شدن اینترنت خودکار
          همگام می‌شوند.
        </p>
      </div>
      <Link href="/notes" className="text-sm text-primary underline-offset-4 hover:underline">
        رفتن به یادداشت‌ها
      </Link>
    </main>
  );
}
