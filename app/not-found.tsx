import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm font-medium text-muted-foreground">۴۰۴</p>
      <h1 className="text-xl font-semibold">این صفحه پیدا نشد</h1>
      <Link href="/notes" className="text-sm text-primary underline-offset-4 hover:underline">
        بازگشت به یادداشت‌ها
      </Link>
    </main>
  );
}
