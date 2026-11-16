import { describe, expect, it } from 'vitest';
import { detectDirection, isolateDirection } from '@/lib/text-direction';

describe('detectDirection', () => {
  it('detects Persian text', () => {
    expect(detectDirection('سلام دنیا')).toBe('rtl');
  });

  it('detects English text', () => {
    expect(detectDirection('Hello world')).toBe('ltr');
  });

  it('uses the first strong character for mixed text', () => {
    expect(detectDirection('Hello سلام')).toBe('ltr');
    expect(detectDirection('سلام Hello')).toBe('rtl');
  });

  it('defaults to rtl for empty or neutral content', () => {
    expect(detectDirection('')).toBe('rtl');
    expect(detectDirection('123 — 456')).toBe('rtl');
    expect(detectDirection(null)).toBe('rtl');
  });

  it('wraps text in bidirectional isolates', () => {
    expect(isolateDirection('سلام')).toMatch(/^\u2067.*\u2069$/);
    expect(isolateDirection('hello')).toMatch(/^\u2066.*\u2069$/);
  });
});
