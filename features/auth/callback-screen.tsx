'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { completeAuthCallback } from '@/lib/supabase/auth-callback';

/** Finishes the Supabase sign-in round-trip entirely in the browser. */
export function CallbackScreen() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;

    void completeAuthCallback().then((result) => {
      if (!active) return;
      if (result.status === 'ok') {
        toast.success('خوش آمدید');
        router.replace(result.next);
      } else {
        setError(result.message);
      }
    });

    return () => {
      active = false;
    };
  }, [router]);

  if (error) {
    return (
      <div className="surface w-full max-w-sm p-6 text-center">
        <h1 className="text-base font-semibold">ورود انجام نشد</h1>
        <p className="mt-2 text-xs text-muted-foreground">{error}</p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline"
        >
          بازگشت به صفحه ورود
        </Link>
      </div>
    );
  }

  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> در حال تکمیل ورود…
    </p>
  );
}
