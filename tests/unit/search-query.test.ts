import { describe, expect, it } from 'vitest';
import {
  buildSearchParam,
  buildSnippet,
  escapeLike,
  highlightParts,
  levenshtein,
  matchesQuery,
  normalizeFa,
  tokenize,
} from '@/lib/search-query';

describe('normalizeFa', () => {
  it('unifies Arabic/Persian letter variants', () => {
    expect(normalizeFa('علي')).toBe('علی');
    expect(normalizeFa('كتاب')).toBe('کتاب');
  });

  it('converts Persian and Arabic digits to ASCII', () => {
    expect(normalizeFa('۱۲۳٤٥')).toBe('12345');
  });

  it('removes diacritics and collapses whitespace', () => {
    expect(normalizeFa('مُحَمَّد   رضا')).toBe('محمد رضا');
  });
});

describe('tokenize', () => {
  it('splits on whitespace after normalisation', () => {
    expect(tokenize('  برنامه‌ريزي   پروژه ')).toEqual(['برنامهریزی', 'پروژه']);
  });

  it('returns an empty list for blank input', () => {
    expect(tokenize('   ')).toEqual([]);
  });
});

describe('escapeLike', () => {
  it('escapes wildcard characters', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
  });
});

describe('buildSearchParam', () => {
  it('normalises and trims the query', () => {
    expect(buildSearchParam('  سلام  دنیا ')).toBe('سلام دنیا');
  });
});

describe('levenshtein', () => {
  it('computes the edit distance', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('note', 'note')).toBe(0);
  });

  it('returns early above the max distance', () => {
    expect(levenshtein('abc', 'abcdef', 1)).toBeGreaterThan(1);
  });
});

describe('matchesQuery', () => {
  const note = { title: 'برنامه‌ریزی پروژه', text: 'کارهای این هفته و جلسه با تیم طراحی' };

  it('matches when every token is present', () => {
    expect(matchesQuery(note, 'پروژه تیم')).toBe(true);
  });

  it('is accent/variant insensitive', () => {
    expect(matchesQuery({ title: 'علي', text: '' }, 'علی')).toBe(true);
  });

  it('tolerates small typos in long words', () => {
    expect(matchesQuery(note, 'برنامه ريزی')).toBe(true);
  });

  it('rejects unrelated queries', () => {
    expect(matchesQuery(note, 'آشپزی')).toBe(false);
  });

  it('matches everything for an empty query', () => {
    expect(matchesQuery(note, '')).toBe(true);
  });
});

describe('highlightParts', () => {
  it('marks the matching ranges', () => {
    const parts = highlightParts('جلسه با تیم طراحی', 'تیم');
    expect(parts.filter((part) => part.match).map((part) => part.text)).toEqual(['تیم']);
    expect(parts.map((part) => part.text).join('')).toBe('جلسه با تیم طراحی');
  });

  it('returns a single part when nothing matches', () => {
    expect(highlightParts('متن', 'نامربوط')).toEqual([{ text: 'متن', match: false }]);
  });

  it('handles empty queries', () => {
    expect(highlightParts('متن', '')).toEqual([{ text: 'متن', match: false }]);
  });
});

describe('buildSnippet', () => {
  it('centres the snippet around the first match', () => {
    const text = `${'الف '.repeat(80)}پروژه مهم`;
    const snippet = buildSnippet(text, 'پروژه', 20);
    expect(snippet).toContain('پروژه');
    expect(snippet.length).toBeLessThan(text.length);
  });

  it('falls back to the head of the text', () => {
    expect(buildSnippet('متن کوتاه', '')).toBe('متن کوتاه');
  });
});
