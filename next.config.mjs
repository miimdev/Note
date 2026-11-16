/** @type {import('next').NextConfig} */

// GitHub Pages can only serve files, so the Pages build switches Next.js to a
// static export deployed under the repository name. Local `dev`/`start` keep the
// server build (middleware, route handlers, SSR) — see scripts/prepare-server-build.mjs.
const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : '*.supabase.co';
  } catch {
    return '*.supabase.co';
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // `isomorphic-dompurify` pulls jsdom into the server bundle. When webpack
  // inlines jsdom's sync-XHR worker, that worker's 5s idle timer ends up running
  // in the *main* process and calls process.exit(0), so `next start` silently
  // died a few seconds after "Ready". Keeping the package external makes Node
  // require the real module at runtime, where the worker is a separate thread.
  serverExternalPackages: ['isomorphic-dompurify'],
  experimental: {
    optimizePackageImports: ['lucide-react', '@tiptap/react'],
  },
  images: {
    unoptimized: isStaticExport,
    remotePatterns: [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/**' }],
  },
  ...(isStaticExport
    ? {
        output: 'export',
        basePath,
        assetPrefix: basePath || undefined,
        // Emit `route/index.html` so a hard refresh on any page resolves to a
        // real file on GitHub Pages.
        trailingSlash: true,
      }
    : {}),
  // `headers()` is unsupported with `output: 'export'`; Pages gets its security
  // headers from the host instead.
  ...(isStaticExport
    ? {}
    : {
        async headers() {
          return [
            {
              source: '/(.*)',
              headers: [
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
                {
                  key: 'Permissions-Policy',
                  value: 'camera=(), microphone=(), geolocation=()',
                },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;
