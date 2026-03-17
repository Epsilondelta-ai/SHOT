import type { Locale } from './locales';
import ko from './translations/ko';
import en from './translations/en';
import zhCn from './translations/zh-cn';
import ja from './translations/ja';
import es from './translations/es';
import ptBr from './translations/pt-br';
import fr from './translations/fr';
import ru from './translations/ru';
import de from './translations/de';

const translations = { ko, en, 'zh-cn': zhCn, ja, es, 'pt-br': ptBr, fr, ru, de };

export type Translations = typeof ko;

export function useTranslations(locale: Locale): Translations {
  return translations[locale] ?? translations.ko;
}
