'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from './client';
import { withBasePath } from '@/lib/paths';

/**
 * Auth callbacks for the static build. GitHub Pages has no server, so the
 * one-time `code` (PKCE) or `token_hash` from an email link is exchanged for a
 * session directly in the browser instead of inside a route handler.
 *
 * Supabase always returns these values to `/callback`; the static export turns
 * that into `/callback/index.html` (see `next.config.mjs`), so the browser
 * lands on a real page and this module finishes the job.
 */
export type CallbackResult = { status: 'ok'; next: string } | { status: 'error'; message: string };

export async function completeAuthCallback(
  client: SupabaseClient = getSupabaseBrowserClient(),
): Promise<CallbackResult> {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));

  // `next` must stay a same-origin app path; anything else falls back to /notes.
  const rawNext = params.get('next') ?? '/notes';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/notes';

  // Supabase sometimes reports the failure in the URL itself (expired link).
  const urlError = params.get('error_description') ?? params.get('error');
  if (urlError) return { status: 'error', message: urlError };

  const code = params.get('code');
  const tokenHash = params.get('token_hash');
  const type = params.get('type');

  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) return { status: 'error', message: error.message };
    return { status: 'ok', next };
  }

  if (tokenHash && type) {
    const { error } = await client.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'signup' | 'recovery' | 'email' | 'email_change' | 'invite' | 'magiclink',
    });
    if (error) return { status: 'error', message: error.message };
    return { status: 'ok', next };
  }

  // Implicit flow providers put the tokens in the fragment; let the client parse
  // them, then confirm a session actually exists.
  if (hash.get('access_token')) {
    const { data } = await client.auth.getSession();
    if (data.session) return { status: 'ok', next };
    return { status: 'error', message: 'ورود کامل نشد. لینک را دوباره باز کنید.' };
  }

  return { status: 'error', message: 'لینک ورود ناقص است (کد نداشت).' };
}

/** Where Supabase should send the user back after an email/OAuth round-trip. */
export function authCallbackUrl(next = '/notes'): string {
  return `${window.location.origin}${withBasePath('/callback')}?next=${encodeURIComponent(next)}`;
}
