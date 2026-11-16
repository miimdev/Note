'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[app-error]', error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-lg font-semibold">مشکلی پیش آمد</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        داده‌های محلی شما سالم هستند. یک‌بار دیگر امتحان کنید؛ اگر مشکل ادامه داشت صفحه را نوسازی کنید.
      </p>
      <Button onClick={reset}>تلاش دوباره</Button>
    </main>
  );
}
