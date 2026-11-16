'use client';

import { useEffect } from 'react';
import { withBasePath } from '@/lib/paths';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = () => {
      // The scope has to match the deployment path, otherwise GitHub Pages
      // rejects a worker registered from `/Note/sw.js` with scope `/`.
      const swUrl = withBasePath('/sw.js');
      navigator.serviceWorker.register(swUrl, { scope: withBasePath('/') }).catch(() => {
        /* registration failures are non-fatal: the app still works online */
      });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  return null;
}
