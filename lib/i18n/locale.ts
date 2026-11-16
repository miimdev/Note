export type Locale = 'fa' | 'en';

export const LOCALE_COOKIE = 'note-locale';
export const DEFAULT_LOCALE: Locale = 'fa';

export function isLocale(value: string | undefined | null): value is Locale {
  return value === 'fa' || value === 'en';
}

export const dictionaries = {
  fa: {
    appName: 'دفترچه یادداشت هوشمند',
    loading: 'در حال بارگذاری…',
    save: 'ذخیره',
    cancel: 'انصراف',
    delete: 'حذف',
    confirm: 'تأیید',
    retry: 'تلاش دوباره',
    empty: 'هنوز چیزی اینجا نیست',
  },
  en: {
    appName: 'Smart Notebook',
    loading: 'Loading…',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    confirm: 'Confirm',
    retry: 'Try again',
    empty: 'Nothing here yet',
  },
} as const;

export type Dictionary = (typeof dictionaries)[Locale];
