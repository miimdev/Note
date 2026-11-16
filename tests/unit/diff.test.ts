import { describe, expect, it } from 'vitest';
import { countChanges, diffLines, diffWords, splitLines } from '@/lib/diff';

describe('splitLines', () => {
  it('splits on newlines and drops a trailing newline', () => {
    expect(splitLines('a\nb\n')).toEqual(['a', 'b']);
  });

  it('normalises CRLF', () => {
    expect(splitLines('a\r\nb')).toEqual(['a', 'b']);
  });

  it('returns nothing for empty text', () => {
    expect(splitLines('')).toEqual([]);
  });
});

describe('diffLines', () => {
  it('marks unchanged lines as equal', () => {
    const result = diffLines('سلام\nدنیا', 'سلام\nدنیا');
    expect(result.every((line) => line.op === 'equal')).toBe(true);
  });

  it('detects an added line', () => {
    const result = diffLines('یک', 'یک\nدو');
    expect(result).toEqual([
      { op: 'equal', text: 'یک' },
      { op: 'added', text: 'دو' },
    ]);
  });

  it('detects a removed line', () => {
    const result = diffLines('یک\nدو', 'یک');
    expect(countChanges(result)).toEqual({ added: 0, removed: 1 });
  });

  it('detects a modified line as remove + add', () => {
    const result = diffLines('عنوان قدیمی', 'عنوان تازه');
    expect(result.map((line) => line.op)).toEqual(['removed', 'added']);
  });

  it('ignores Arabic/Persian letter variants', () => {
    const result = diffLines('كتاب علي', 'کتاب علی');
    expect(result).toHaveLength(1);
    expect(result[0]?.op).toBe('equal');
  });

  it('keeps the text of the newer side for equal lines', () => {
    const result = diffLines('كتاب', 'کتاب');
    expect(result[0]?.text).toBe('کتاب');
  });

  it('handles completely different documents', () => {
    const stats = countChanges(diffLines('الف\nب', 'ج\nد'));
    expect(stats).toEqual({ added: 2, removed: 2 });
  });
});

describe('diffWords', () => {
  it('highlights only the changed words', () => {
    const { before, after } = diffWords('جلسه با تیم طراحی', 'جلسه با تیم بازاریابی');
    expect(before.map((part) => part.text).join('')).toBe('جلسه با تیم طراحی');
    expect(after.map((part) => part.text).join('')).toBe('جلسه با تیم بازاریابی');
    expect(before.filter((part) => part.op === 'removed').map((p) => p.text.trim())).toEqual([
      'طراحی',
    ]);
    expect(after.filter((part) => part.op === 'added').map((p) => p.text.trim())).toEqual([
      'بازاریابی',
    ]);
  });

  it('reports no changes for identical text', () => {
    const { before, after } = diffWords('همان متن', 'همان متن');
    expect(before.every((part) => part.op === 'equal')).toBe(true);
    expect(after.every((part) => part.op === 'equal')).toBe(true);
  });

  it('handles pure insertions', () => {
    const { before, after } = diffWords('یک', 'یک دو');
    expect(before.every((p) => p.op === 'equal')).toBe(true);
    expect(after.some((p) => p.op === 'added' && p.text.includes('دو'))).toBe(true);
  });
});
