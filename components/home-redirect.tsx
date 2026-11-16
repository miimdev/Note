'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * The landing page used to redirect on the server. A static host has no server,
 * so the same decision (signed in → /notes, otherwise → /login) is made in the
 * browser from the persisted session.
 */
export function HomeRedirect() {
  const router = useRouter();

  React.useEffect(() => {
    let active = true;

    async function decide() {
      let signedIn = false;
      try {
        const {
          data: { session },
        } = await getSupabaseBrowserClient().auth.getSession();
        signedIn = Boolean(session?.user);
      } catch {
        signedIn = false;
      }
      if (active) router.replace(signedIn ? '/notes' : '/login');
    }

    void decide();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="flex min-h-dvh items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> در حال بارگذاری…
    </main>
  );
}
