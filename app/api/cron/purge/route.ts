import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Daily maintenance, protected by CRON_SECRET (Vercel Cron sends
 * `Authorization: Bearer $CRON_SECRET`):
 *  - permanently deletes notes trashed more than 30 days ago
 *  - deactivates expired public share links
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceKey || !url) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  // Service role is required because these functions are revoked from clients.
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const [purged, expired] = await Promise.all([
    supabase.rpc('purge_trashed_notes'),
    supabase.rpc('expire_shared_notes'),
  ]);

  if (purged.error || expired.error) {
    return NextResponse.json(
      { error: purged.error?.message ?? expired.error?.message ?? 'rpc_failed' },
      { status: 500 },
    );
  }

  return NextResponse.json({ purged_notes: purged.data ?? 0, expired_shares: expired.data ?? 0 });
}
