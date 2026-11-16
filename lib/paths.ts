/**
 * GitHub Pages serves the app from a sub-path (`https://user.github.io/Note/`)
 * while local development and other hosts serve it from the root.
 *
 * Next.js applies `basePath` automatically to `<Link>`/`router.push`, so the
 * href helpers below stay root-relative. `withBasePath` is only for URLs that
 * Next does not rewrite: `window.location`, clipboard links, the service worker
 * and the web manifest.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** True when the build has no server (GitHub Pages and any static host). */
export const IS_STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true';

/** Prefixes an absolute app path with the deployment base path. */
export function withBasePath(path: string): string {
  if (!path.startsWith('/')) return path;
  if (!BASE_PATH) return path;
  if (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`)) return path;
  return `${BASE_PATH}${path}`;
}

/** Absolute URL for the current origin, honouring the base path. */
export function appUrl(path: string): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}${withBasePath(path)}`;
}

/**
 * Static exports have no server to resolve dynamic segments, so those pages read
 * their identifier from the query string instead of the path.
 */
export const STATIC_ROUTE_PARAM = 'id';

function paramPath(route: string, value: string, extra = ''): string {
  return `${route}?${STATIC_ROUTE_PARAM}=${encodeURIComponent(value)}${extra}`;
}

/** `/notes/123` locally, `/notes?id=123` in a static build. */
export function noteHref(id: string): string {
  return IS_STATIC_EXPORT ? paramPath('/notes', id) : `/notes/${id}`;
}

export function folderHref(id: string): string {
  return IS_STATIC_EXPORT ? paramPath('/folders', id) : `/folders/${id}`;
}

export function tagHref(slug: string): string {
  return IS_STATIC_EXPORT ? paramPath('/tags', slug) : `/tags/${slug}`;
}

export function sharedNoteHref(token: string): string {
  return IS_STATIC_EXPORT ? paramPath('/s', token) : `/s/${token}`;
}

export function printHref(id: string, auto = false): string {
  if (!IS_STATIC_EXPORT) return auto ? `/print/${id}?auto=1` : `/print/${id}`;
  return paramPath('/print', id, auto ? '&auto=1' : '');
}
