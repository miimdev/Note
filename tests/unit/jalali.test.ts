import { describe, expect, it } from 'vitest';
import {
  formatDailyTitle,
  formatJalaliDate,
  isoToday,
  jalaliMonthGrid,
  jalaliWeekdayLabel,
  relativeTime,
  toJalali,
  toGregorian,
  toLatinDigits,
  toPersianDigits,
  daysUntilPurge,
  isLeapJalaliYear,
  jalaliMonthLength,
} from '@/lib/jalali';

describe('toJalali / toGregorian', () => {
  it('converts known dates', () => {
    expect(toJalali(new Date(2026, 10, 16))).toEqual({ year: 1405, month: 8, day: 25 });
    expect(toJalali(new Date(2024, 2, 20))).toEqual({ year: 1403, month: 1, day: 1 });
    expect(toJalali(new Date(2025, 2, 21))).toEqual({ year: 1404, month: 1, day: 1 });
  });

  it('round-trips', () => {
    const date = new Date(2025, 5, 15);
    const { year, month, day } = toJalali(date);
    expect(toGregorian({ year, month, day })).toEqual(date);
  });
});

describe('jalali helpers', () => {
  it('knows leap years and month lengths', () => {
    expect(isLeapJalaliYear(1403)).toBe(true);
    expect(jalaliMonthLength(1403, 12)).toBe(30);
    expect(jalaliMonthLength(1404, 12)).toBe(29);
    expect(jalaliMonthLength(1404, 1)).toBe(31);
    expect(jalaliMonthLength(1404, 7)).toBe(30);
  });

  it('formats dates in Persian', () => {
    expect(formatJalaliDate(new Date(2026, 10, 16))).toBe('۲۵ آبان ۱۴۰۵');
  });

  it('builds a month grid with complete weeks', () => {
    const grid = jalaliMonthGrid(1404, 1);
    expect(grid.length % 7).toBe(0);
    expect(grid.filter(Boolean)).toHaveLength(31);
  });

  it('labels weekdays starting on Saturday', () => {
    expect(jalaliWeekdayLabel(new Date(2025, 2, 22))).toBe('شنبه');
  });

  it('creates daily note titles', () => {
    expect(formatDailyTitle(new Date(2026, 10, 16))).toBe('یادداشت روزانه ۲۵ آبان ۱۴۰۵');
  });
});

describe('digits', () => {
  it('converts between Persian and latin digits', () => {
    expect(toPersianDigits(1405)).toBe('۱۴۰۵');
    expect(toLatinDigits('۱۴۰۵')).toBe('1405');
  });
});

describe('time helpers', () => {
  it('formats relative time', () => {
    expect(relativeTime(new Date().toISOString())).toBe('همین حالا');
    expect(relativeTime(new Date(Date.now() - 5 * 60_000).toISOString())).toContain('دقیقه');
  });

  it('computes days left before purge', () => {
    const trashed = new Date(Date.now() - 10 * 86_400_000).toISOString();
    expect(daysUntilPurge(trashed)).toBe(20);
    expect(daysUntilPurge(new Date(Date.now() - 40 * 86_400_000).toISOString())).toBe(0);
  });

  it('produces a local ISO date', () => {
    expect(isoToday(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});
