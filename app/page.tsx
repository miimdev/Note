import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // `redirect()` throws, so it must never run inside a try/catch: the catch
  // below would swallow the NEXT_REDIRECT for signed-in users.
  let signedIn = false;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  } catch {
    signedIn = false;
  }

  redirect(signedIn ? '/notes' : '/login');
}
