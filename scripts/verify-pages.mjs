#!/usr/bin/env node
/**
 * Post-deploy smoke test for the GitHub Pages build.
 *
 *   node scripts/verify-pages.mjs https://<user>.github.io/<repo>/
 *
 * Checks what a static host can actually get wrong: the page loads, assets are
 * served from the base path (no 404s), the manifest/service worker exist, and the
 * Supabase project is reachable from the deployed origin.
 */
const base = (process.argv[2] || '').replace(/\/$/, '');
if (!base) {
  console.error('usage: node scripts/verify-pages.mjs https://user.github.io/repo');
  process.exit(2);
}

const checks = [
  ['home page', '/', 200],
  ['login page', '/login/', 200],
  ['offline page', '/offline/', 200],
  ['web manifest', '/manifest.webmanifest', 200],
  ['service worker', '/sw.js', 200],
  ['404 page', '/this-path-does-not-exist/', 404],
];

let failed = 0;
for (const [label, path, expected] of checks) {
  try {
    const response = await fetch(`${base}${path}`, { redirect: 'manual' });
    const ok = response.status === expected;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${response.status} (expected ${expected})`);
    if (!ok) failed += 1;
  } catch (error) {
    console.log(`FAIL ${label}: ${error.message}`);
    failed += 1;
  }
}

// Assets referenced by the home page must resolve under the base path.
try {
  const html = await (await fetch(`${base}/`)).text();
  const assets = [...html.matchAll(/(?:src|href)="([^"]*_next\/[^"]+)"/g)].map((m) => m[1]);
  const unique = [...new Set(assets)].slice(0, 6);
  for (const asset of unique) {
    const url = asset.startsWith('http') ? asset : `${base}${asset}`;
    const status = (await fetch(url)).status;
    const ok = status === 200;
    console.log(`${ok ? 'ok  ' : 'FAIL'} asset ${asset}: ${status}`);
    if (!ok) failed += 1;
  }
} catch (error) {
  console.log(`FAIL assets: ${error.message}`);
  failed += 1;
}

// The browser talks to Supabase directly on a static host.
const supabase = process.env.SUPABASE_URL;
if (supabase) {
  const status = (await fetch(`${supabase}/auth/v1/health`)).status;
  console.log(`${status < 500 ? 'ok  ' : 'FAIL'} supabase health: ${status}`);
  if (status >= 500) failed += 1;
}

console.log(failed === 0 ? '\nall checks passed' : `\n${failed} check(s) failed`);
process.exit(failed === 0 ? 0 : 1);
