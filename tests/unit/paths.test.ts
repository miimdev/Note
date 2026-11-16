import { describe, expect, it, vi } from 'vitest';

/**
 * The helpers read their environment at module load, so each case re-imports the
 * module with a fresh env (vitest resets modules between `resetModules` calls).
 */
async function loadPaths(env: { base?: string; static?: string }) {
  process.env.NEXT_PUBLIC_BASE_PATH = env.base ?? '';
  process.env.NEXT_PUBLIC_STATIC_EXPORT = env.static ?? 'false';
  vi.resetModules();
  return (await import('@/lib/paths')) as typeof import('@/lib/paths');
}

describe('path helpers', () => {
  it('keeps dynamic routes on the path when a server is available', async () => {
    const { noteHref, folderHref, tagHref, sharedNoteHref, printHref } = await loadPaths({});
    expect(noteHref('abc')).toBe('/notes/abc');
    expect(folderHref('f1')).toBe('/folders/f1');
    expect(tagHref('persian')).toBe('/tags/persian');
    expect(sharedNoteHref('tok')).toBe('/s/tok');
    expect(printHref('n1')).toBe('/print/n1');
    expect(printHref('n1', true)).toBe('/print/n1?auto=1');
  });

  it('switches to query parameters in a static export', async () => {
    const { noteHref, tagHref, sharedNoteHref, printHref } = await loadPaths({ static: 'true' });
    expect(noteHref('abc')).toBe('/notes?id=abc');
    expect(tagHref('e')).toBe('/tags?id=e');
    expect(sharedNoteHref('tok')).toBe('/s?id=tok');
    expect(printHref('n1', true)).toBe('/print?id=n1&auto=1');
  });

  it('encodes values that contain reserved characters', async () => {
    const { noteHref } = await loadPaths({ static: 'true' });
    expect(noteHref('a b&c')).toBe('/notes?id=a%20b%26c');
  });

  it('leaves Next-managed hrefs root-relative on a base path', async () => {
    const { noteHref, BASE_PATH } = await loadPaths({ base: '/Note' });
    expect(BASE_PATH).toBe('/Note');
    // <Link> adds basePath itself; adding it here would double the prefix.
    expect(noteHref('abc')).toBe('/notes/abc');
  });

  it('prefixes only URLs Next does not rewrite', async () => {
    const { withBasePath } = await loadPaths({ base: '/Note' });
    expect(withBasePath('/sw.js')).toBe('/Note/sw.js');
    expect(withBasePath('/Note/sw.js')).toBe('/Note/sw.js');
    expect(withBasePath('https://x.dev/a')).toBe('https://x.dev/a');
  });
});
