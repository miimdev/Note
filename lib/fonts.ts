import localFont from 'next/font/local';

/**
 * Fonts are self-hosted (no runtime request to Google, works offline).
 * Vazirmatn covers Persian/Arabic script, Inter covers Latin.
 */
export const vazirmatn = localFont({
  src: [
    { path: '../public/fonts/Vazirmatn-arabic.woff2', weight: '100 900', style: 'normal' },
    { path: '../public/fonts/Vazirmatn-latin.woff2', weight: '100 900', style: 'normal' },
  ],
  variable: '--font-sans',
  display: 'swap',
  fallback: ['Inter', 'system-ui', 'sans-serif'],
  preload: true,
  adjustFontFallback: false,
});

export const inter = localFont({
  src: [{ path: '../public/fonts/Inter-latin.woff2', weight: '100 900', style: 'normal' }],
  variable: '--font-latin',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
  preload: false,
});
