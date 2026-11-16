import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { Providers } from '@/components/providers';
import { DirectionProvider } from '@/components/direction-provider';
import { getServerLocale } from '@/lib/i18n/server';
import { inter, vazirmatn } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Note — دفترچه یادداشت هوشمند',
    template: '%s | Note',
  },
  description:
    'دفترچه یادداشت هوشمند با ادیتور بلاکی، شبکه دانش، جستجوی دوزبانه، حالت آفلاین و همگام‌سازی لحظه‌ای.',
  applicationName: 'Note',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Note', statusBarStyle: 'default' },
  icons: {
    icon: [{ url: '/icons/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icons/icon-192.png' }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1117' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getServerLocale();
  const dir = locale === 'fa' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning className={`${vazirmatn.variable} ${inter.variable}`}>
      <body className="min-h-dvh">
        <DirectionProvider dir={dir}>
          <Providers>{children}</Providers>
        </DirectionProvider>
        <Toaster position="bottom-center" dir={dir} richColors closeButton />
      </body>
    </html>
  );
}
