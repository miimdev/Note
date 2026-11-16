#!/usr/bin/env node
/**
 * The repo holds one source tree that has to build twice: `next dev`/`next start`
 * (server) and `output: 'export'` on GitHub Pages (no server at all).
 *
 * Everything that only works with a server — middleware, route handlers, the
 * auth callback, the SSR share/print pages — lives under `server/`. Static
 * builds ignore that directory; a server build needs those files back in the
 * places Next.js expects them, which is what this script does.
 *
 *   node scripts/prepare-server-build.mjs          # add the server files
 *   node scripts/prepare-server-build.mjs --clean  # remove them again
 */
import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const clean = process.argv.includes('--clean');

/** Every entry is relative to the repo root. */
const SERVER_FILES = [
  ['server/middleware.ts', 'middleware.ts'],
  // `static/` inside this directory holds the *page* version, see below.
  ['server/app/callback/route.ts', 'app/(auth)/callback/route.ts'],
  ['server/app/api/ai', 'app/api/ai'],
  ['server/app/api/cron/purge', 'app/api/cron/purge'],
  ['server/app/api/export/zip', 'app/api/export/zip'],
  ['server/app/api/share/[token]', 'app/api/share/[token]'],
  ['server/app/print-id/page.tsx', 'app/print/[id]/page.tsx'],
  ['server/app/s-token/page.tsx', 'app/s/[token]/page.tsx'],
  ['server/app/s-token/not-found.tsx', 'app/s/[token]/not-found.tsx'],
  ['server/app/workspace-dynamic/notes-id', 'app/(workspace)/notes/[id]'],
  ['server/app/workspace-dynamic/folders-id', 'app/(workspace)/folders/[id]'],
  ['server/app/workspace-dynamic/tags-slug', 'app/(workspace)/tags/[slug]'],
];

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

for (const [from, to] of SERVER_FILES) {
  const source = join(root, from);
  const target = join(root, to);

  if (clean) {
    await rm(target, { recursive: true, force: true });
    continue;
  }

  if (!(await exists(source))) {
    console.error(`missing: ${from}`);
    process.exitCode = 1;
    continue;
  }

  await mkdir(dirname(target), { recursive: true });
  await cp(source, target, { recursive: true });
}

/**
 * `/callback` is the one URL that needs a different *kind* of file per build:
 * a route handler when there is a server, and a page in a static export (Next
 * forbids both in the same segment). The page is the tracked default, so a
 * server build swaps it out and `--clean` puts it back.
 */
const CALLBACK_HANDLER = 'app/(auth)/callback/route.ts';
const CALLBACK_PAGE = 'app/(auth)/callback/page.tsx';
const CALLBACK_PAGE_SOURCE = 'server/app/callback/static/page.tsx';

if (clean) {
  await rm(join(root, CALLBACK_HANDLER), { force: true });
  await mkdir(dirname(join(root, CALLBACK_PAGE)), { recursive: true });
  await cp(join(root, CALLBACK_PAGE_SOURCE), join(root, CALLBACK_PAGE));
} else {
  await rm(join(root, CALLBACK_PAGE), { force: true });
}

console.log(clean ? 'server files removed' : 'server files restored');
