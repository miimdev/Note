import { HomeRedirect } from '@/components/home-redirect';

/**
 * Landing page. Keeping it a client redirect means the same file works with a
 * server and as a static export (GitHub Pages) — see components/home-redirect.
 */
export default function HomePage() {
  return <HomeRedirect />;
}
