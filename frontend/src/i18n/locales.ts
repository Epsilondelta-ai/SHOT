export const locales = ['ko', 'en', 'zh-cn', 'ja', 'es', 'pt-br', 'fr', 'ru', 'de'] as const;
export type Locale = typeof locales[number];

export const localeLabels: Record<Locale, string> = {
  ko: '한국어',
  en: 'English',
  'zh-cn': '简体中文',
  ja: '日本語',
  es: 'Español',
  'pt-br': 'Português (BR)',
  fr: 'Français',
  ru: 'Русский',
  de: 'Deutsch',
};

export const defaultLocale: Locale = 'ko';
