import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          Note
        </Link>
        <Link href="/s/demo" className="text-xs text-muted-foreground hover:text-foreground">
          نمونه اشتراک عمومی
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8">{children}</main>
      <footer className="px-6 py-4 text-center text-[11px] text-muted-foreground">
        ساخته‌شده با Next.js، Supabase و TipTap
      </footer>
    </div>
  );
}
