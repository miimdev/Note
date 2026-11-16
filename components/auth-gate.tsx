'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useSync } from '@/features/sync/sync-provider';
import { stripBasePath } from '@/lib/paths';

/**
 * Client-side replacement for the middleware guard in static builds. It waits
 * for the session to restore (no flash of protected content), then redirects
 * anonymous visitors to /login with a `next` parameter.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, ready } = useSync();
  const router = useRouter();
  const [waited, setWaited] = React.useState(false);

  React.useEffect(() => {
    if (!ready) return;
    // Give the sync provider one tick to hydrate before bouncing anyone.
    const timer = setTimeout(() => setWaited(true), 0);
    return () => clearTimeout(timer);
  }, [ready]);

  React.useEffect(() => {
    if (!ready || !waited || user) return;
    // window.location.pathname already contains the deployment base path (e.g.
    // /Note/notes/), but router.push adds basePath itself, so strip it here.
    const next = stripBasePath(`${window.location.pathname}${window.location.search}`);
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [ready, router, user, waited]);

  if (!user) {
    return (
      <main className="flex min-h-dvh items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> در حال بارگذاری…
      </main>
    );
  }

  return <>{children}</>;
}
