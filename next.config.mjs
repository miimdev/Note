/** @type {import('next').NextConfig} */
const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : '*.supabase.co';
  } catch {
    return '*.supabase.co';
  }
})();

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
    remotePatterns: [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/**' }],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
