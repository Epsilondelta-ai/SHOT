import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()],
  output: 'static',
  i18n: {
    defaultLocale: 'ko',
    locales: ['ko', 'en', 'zh-cn', 'ja', 'es', 'pt-br', 'fr', 'ru', 'de'],
    routing: {
      prefixDefaultLocale: true,
    },
  },
});
