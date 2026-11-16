import { toJalali, toGregorian, isLeapJalaliYear, jalaliMonthLength } from './jalali-convert';

export type CalendarKind = 'jalali' | 'gregorian';

export const FA_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

export const EN_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export const FA_WEEKDAYS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
] as const;

export function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Persian digits for a latin number. */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)] ?? d);
}

export function toLatinDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function jalaliParts(value: string | Date) {
  return toJalali(toDate(value));
}

export function formatJalaliDate(value: string | Date): string {
  const { year, month, day } = jalaliParts(value);
  return `${toPersianDigits(day)} ${FA_MONTHS[month - 1]} ${toPersianDigits(year)}`;
}

export function formatJalaliNumeric(value: string | Date): string {
  const { year, month, day } = jalaliParts(value);
  return toPersianDigits(`${year}/${pad2(month)}/${pad2(day)}`);
}

export function formatJalaliTime(value: string | Date): string {
  const date = toDate(value);
  return toPersianDigits(`${pad2(date.getHours())}:${pad2(date.getMinutes())}`);
}

export function formatJalaliDateTime(value: string | Date): string {
  return `${formatJalaliDate(value)} · ${formatJalaliTime(value)}`;
}

export function formatGregorianDate(value: string | Date): string {
  const date = toDate(value);
  return `${date.getDate()} ${EN_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatGregorianNumeric(value: string | Date): string {
  const date = toDate(value);
  return `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`;
}

export function formatDate(
  value: string | Date,
  calendar: CalendarKind = 'jalali',
  withTime = false,
): string {
  if (calendar === 'gregorian') {
    const date = toDate(value);
    return withTime
      ? `${formatGregorianDate(date)} · ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
      : formatGregorianDate(date);
  }
  return withTime ? formatJalaliDateTime(value) : formatJalaliDate(value);
}

/** Today as an ISO date string (yyyy-MM-dd) in the user's local timezone. */
export function isoToday(now = new Date()): string {
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function jalaliWeekdayLabel(value: string | Date): string {
  const date = toDate(value);
  // JS: 0=Sunday .. 6=Saturday -> Persian week starts on Saturday
  const index = (date.getDay() + 1) % 7;
  return FA_WEEKDAYS[index];
}

export function formatDailyTitle(value: string | Date, calendar: CalendarKind = 'jalali'): string {
  if (calendar === 'gregorian') {
    return `Daily note — ${formatGregorianDate(value)}`;
  }
  const { year, month, day } = jalaliParts(value);
  return `یادداشت روزانه ${toPersianDigits(day)} ${FA_MONTHS[month - 1]} ${toPersianDigits(year)}`;
}

export function relativeTime(value: string | Date, locale: 'fa' | 'en' = 'fa'): string {
  const then = toDate(value).getTime();
  const diff = Date.now() - then;
  const abs = Math.abs(diff);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const fa = locale === 'fa';

  if (abs < minute) return fa ? 'همین حالا' : 'just now';
  if (abs < hour) {
    const n = Math.round(abs / minute);
    return fa ? `${toPersianDigits(n)} دقیقه پیش` : `${n}m ago`;
  }
  if (abs < day) {
    const n = Math.round(abs / hour);
    return fa ? `${toPersianDigits(n)} ساعت پیش` : `${n}h ago`;
  }
  if (abs < 30 * day) {
    const n = Math.round(abs / day);
    return fa ? `${toPersianDigits(n)} روز پیش` : `${n}d ago`;
  }
  return formatDate(value, fa ? 'jalali' : 'gregorian');
}

/** Days left before a note is permanently deleted from the trash. */
export function daysUntilPurge(deletedAt: string | Date, retentionDays = 30): number {
  const elapsed = Math.floor((Date.now() - toDate(deletedAt).getTime()) / 86_400_000);
  return Math.max(0, retentionDays - elapsed);
}

/** Builds a 6x7 jalali month grid (used by the date picker). */
export function jalaliMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = toGregorian({ year, month, day: 1 });
  const length = jalaliMonthLength(year, month);
  const startOffset = (firstDay.getDay() + 1) % 7;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let day = 1; day <= length; day += 1) cells.push(toGregorian({ year, month, day }));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export { toJalali, toGregorian, isLeapJalaliYear, jalaliMonthLength };
