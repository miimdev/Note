'use client';

import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from './locale';

/**
 * Static builds have no server to read cookies, so the locale is resolved in the
 * browser. The cookie is still the source of truth (settings writes it), which
 * keeps the value identical to the server build.
 */
export function getClientLocale(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  const value = match?.[1] ? decodeURIComponent(match[1]) : undefined;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
