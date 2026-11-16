import Link from 'next/link';
import { LinkIcon } from 'lucide-react';

export default function SharedNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <LinkIcon className="h-5 w-5 text-muted-foreground" />
      </span>
      <h1 className="text-lg font-semibold">این لینک معتبر نیست</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        ممکن است لینک منقضی شده یا توسط صاحب یادداشت غیرفعال شده باشد.
      </p>
      <Link href="/" className="text-sm text-primary underline-offset-4 hover:underline">
        رفتن به صفحه اصلی
      </Link>
    </main>
  );
}
