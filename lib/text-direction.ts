export type TextDirection = 'rtl' | 'ltr';

const RTL_RE =
  /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/u;
const LTR_RE = /[A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF]/u;
const NEUTRAL_RE = /^[\s\d\p{P}\p{S}]*$/u;

/**
 * Detects the dominant text direction of a string.
 * Uses a first-strong-character heuristic with a word-count fallback, which
 * behaves well for mixed Persian/English notes.
 */
export function detectDirection(text: string | null | undefined): TextDirection {
  if (!text) return 'rtl';
  const sample = text.slice(0, 400);
  if (NEUTRAL_RE.test(sample)) return 'rtl';

  const firstStrong = sample.search(new RegExp(`${RTL_RE.source}|${LTR_RE.source}`, 'u'));
  if (firstStrong >= 0) {
    return RTL_RE.test(sample[firstStrong] ?? '') ? 'rtl' : 'ltr';
  }

  const rtlCount = (sample.match(new RegExp(RTL_RE.source, 'gu')) ?? []).length;
  const ltrCount = (sample.match(new RegExp(LTR_RE.source, 'gu')) ?? []).length;
  return rtlCount >= ltrCount ? 'rtl' : 'ltr';
}

export function dirProps(text: string | null | undefined) {
  const dir = detectDirection(text);
  return { dir, className: dir === 'rtl' ? 'text-right' : 'text-left' };
}

/** Adds Unicode bidi isolates so mixed-direction snippets render correctly. */
export function isolateDirection(text: string): string {
  if (!text) return '';
  return detectDirection(text) === 'rtl' ? `\u2067${text}\u2069` : `\u2066${text}\u2069`;
}
