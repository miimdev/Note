#!/usr/bin/env node
/**
 * Post-processing for the GitHub Pages artifact.
 *
 * Next.js' static export produces the HTML/JS/CSS, but GitHub Pages still needs
 * two things that the exporter does not create:
 *   - `.nojekyll`, otherwise Jekyll strips the `_next/` directory and every
 *     asset 404s;
 *   - `404.html`, used by Pages for unknown paths (hard refresh on a deep link).
 */
import { copyFile, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'out');
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// 1. .nojekyll — keeps `_next/` and any dotted folder in the artifact.
await writeFile(join(outDir, '.nojekyll'), '');

// 2. 404.html — Next writes `404.html` for the not-found page; copy it to the
//    root so GitHub Pages finds it. Fall back to a minimal page if missing.
const candidates = [join(outDir, '404.html'), join(outDir, '404', 'index.html')];
let source = null;
for (const candidate of candidates) {
  if (await exists(candidate)) {
    source = candidate;
    break;
  }
}

if (source) {
  if (source !== join(outDir, '404.html')) {
    await copyFile(source, join(outDir, '404.html'));
  }
} else {
  const html = `<!doctype html>
<html lang="fa" dir="rtl">
<head><meta charset="utf-8" /><title>صفحه پیدا نشد</title></head>
<body style="font-family:system-ui;text-align:center;padding:4rem 1rem">
  <h1>صفحه پیدا نشد</h1>
  <p><a href="${basePath}/">بازگشت به برنامه</a></p>
</body>
</html>`;
  await writeFile(join(outDir, '404.html'), html);
}

// 3. Sanity check: the artifact must never contain a service-role key.
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (serviceKey) {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const run = promisify(execFile);
  try {
    await run('grep', ['-rIl', '--', serviceKey, outDir]);
    console.error('service role key found in the export — refusing to ship it');
    process.exit(1);
  } catch (error) {
    if (error.code !== 1) throw error; // exit code 1 = no match, which is good
  }
}

console.log(`static artifact ready: .nojekyll + 404.html in ${outDir}`);
