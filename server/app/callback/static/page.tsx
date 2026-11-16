import type { Metadata } from 'next';
import { CallbackScreen } from '@/features/auth/callback-screen';

/**
 * Static-build auth callback.
 *
 * GitHub Pages has no route handler, so `/callback` must be a real page and the
 * one-time code is exchanged for a session in the browser
 * (`lib/supabase/auth-callback.ts`). The server build uses
 * `server/app/callback/route.ts` instead; the two files swap places in
 * `scripts/prepare-server-build.mjs` because Next.js cannot have both in the
 * same segment, and Supabase's redirect URL is the same either way.
 */
export const metadata: Metadata = {
  // app/layout.tsx already appends ' | Note'.
  title: 'ورود',
  robots: { index: false, follow: false },
};

export default function CallbackPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <CallbackScreen />
    </main>
  );
}
