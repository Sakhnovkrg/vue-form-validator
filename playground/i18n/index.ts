import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import ru from './locales/ru.json'

export const i18n = createI18n({
  legacy: false,
  locale: 'ru',
  fallbackLocale: 'en',
  messages: {
    en,
    ru,
  },
})

export const availableLocales = [
  { code: 'ru', name: 'Русский' },
  { code: 'en', name: 'English' },
]
