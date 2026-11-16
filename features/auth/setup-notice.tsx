'use client';

export function SupabaseSetupNotice() {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-dashed p-5 text-sm leading-6">
      <h2 className="mb-2 font-semibold">اتصال Supabase تنظیم نشده است</h2>
      <p className="text-muted-foreground">
        فایل <code className="rounded bg-muted px-1">.env.example</code> را به{' '}
        <code className="rounded bg-muted px-1">.env.local</code> کپی کنید و مقادیر زیر را پر کنید:
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-3 text-xs" dir="ltr">
        {`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...`}
      </pre>
      <p className="mt-3 text-xs text-muted-foreground">
        سپس سرور را دوباره اجرا کنید: <code className="rounded bg-muted px-1">npm run dev</code>
      </p>
    </div>
  );
}
