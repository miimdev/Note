/**
 * Client-side helpers that mirror the SQL `normalize_fa()` behaviour so search
 * highlighting and local (offline) filtering agree with the database.
 */

const CHAR_MAP: Record<string, string> = {
  ي: 'ی',
  ك: 'ک',
  ة: 'ه',
  ۀ: 'ه',
  أ: 'ا',
  إ: 'ا',
  آ: 'ا',
  ؤ: 'و',
  ئ: 'ی',
};

const DIACRITICS = /[\u064B-\u065F\u0670\u0640\u200c]/g;

export function normalizeFa(input: string): string {
  return input
    .replace(DIACRITICS, '')
    .replace(/[يكةۀأإآؤئ]/g, (ch) => CHAR_MAP[ch] ?? ch)
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(query: string): string[] {
  return normalizeFa(query)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

/** Escapes a string for use inside a Postgres `ILIKE` pattern. */
export function escapeLike(input: string): string {
  return input.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

/** Builds the `q` value passed to the `search_notes` RPC. */
export function buildSearchParam(raw: string): string {
  return normalizeFa(raw).slice(0, 200);
}

/** Cheap Levenshtein distance with early exit, used for offline fuzzy search. */
export function levenshtein(a: string, b: string, max = 3): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min((prev[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
      row[j] = value;
      if (value < best) best = value;
    }
    if (best > max) return max + 1;
    prev = row;
  }
  return prev[b.length] ?? max + 1;
}

/** Offline matcher: every token must appear in the haystack (fuzzy tolerated). */
export function matchesQuery(haystack: { title: string; text: string }, query: string): boolean {
  const tokens = tokenize(query);
  if (tokens.length === 0) return true;

  const title = normalizeFa(haystack.title);
  const text = normalizeFa(haystack.text);

  return tokens.every((token) => {
    if (title.includes(token) || text.includes(token)) return true;
    if (token.length < 4) return false;
    const maxDistance = token.length > 6 ? 2 : 1;
    const words = `${title} ${text}`.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    return words.some((word) => {
      // Only compare words of a similar length: avoids matching unrelated terms.
      if (Math.abs(word.length - token.length) > maxDistance) return false;
      return levenshtein(word, token, maxDistance) <= maxDistance;
    });
  });
}

/**
 * Splits `text` into parts so the UI can highlight query matches.
 * Works on the normalised form while returning the original slices.
 */
export function highlightParts(text: string, query: string): { text: string; match: boolean }[] {
  const tokens = tokenize(query).filter((token) => token.length > 1);
  if (tokens.length === 0 || !text) return [{ text, match: false }];

  const normalised = normalizeFa(text);
  if (normalised.length !== text.length) {
    // Normalisation changed lengths (diacritics/digits): fall back to a simple scan.
    return [{ text, match: false }];
  }

  const ranges: [number, number][] = [];
  for (const token of tokens) {
    let index = normalised.indexOf(token);
    while (index !== -1) {
      ranges.push([index, index + token.length]);
      index = normalised.indexOf(token, index + token.length);
    }
  }

  if (ranges.length === 0) return [{ text, match: false }];
  ranges.sort((a, b) => a[0] - b[0]);

  const merged: [number, number][] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) {
      last[1] = Math.max(last[1], range[1]);
    } else {
      merged.push([...range]);
    }
  }

  const parts: { text: string; match: boolean }[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) parts.push({ text: text.slice(cursor, start), match: false });
    parts.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false });
  return parts;
}

/** Builds a short snippet around the first match. */
export function buildSnippet(text: string, query: string, radius = 90): string {
  const tokens = tokenize(query);
  const flat = text.replace(/\s+/g, ' ').trim();
  if (tokens.length === 0) return flat.slice(0, radius * 2);

  const normalised = normalizeFa(flat);
  const index = tokens
    .map((token) => normalised.indexOf(token))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b)[0];

  if (index === undefined) return flat.slice(0, radius * 2);

  const start = Math.max(0, index - radius);
  const end = Math.min(flat.length, index + radius);
  return `${start > 0 ? '…' : ''}${flat.slice(start, end)}${end < flat.length ? '…' : ''}`;
}
