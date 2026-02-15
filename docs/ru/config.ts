import { createRequire } from 'module'
import { defineAdditionalConfig, type DefaultTheme } from 'vitepress'

const require = createRequire(import.meta.url)
const pkg = require('../../package.json')

export default defineAdditionalConfig({
  description: 'Type-safe form validation library for Vue featuring powerful capabilities.',

  themeConfig: {
    nav: [
      {
        text: 'Справочник',
        link: '/ru/reference/api',
        activeMatch: '/reference/'
      },
      {
        text: 'Playground',
        link: '/playground'
      },
      {
        text: pkg.version,
        items: [
          {
            text: 'Изменения',
            link: 'https://github.com/sakhnovkrg/vue-form-validator/blob/main/CHANGELOG.md'
          },
          {
            text: 'Вклад',
            link: 'https://github.com/sakhnovkrg/vue-form-validator/blob/main/.github/contributing.md'
          }
        ]
      }
    ],

    sidebar: [
      {
        text: 'Введение',
        collapsed: false,
        items: [
          { text: 'Начало работы', link: '/ru/getting-started' },
          { text: 'Основные преимущества', link: '/ru/key-features' },
          { text: 'Разработка', link: '/ru/develop' }
        ]
      },
      {
        text: 'Справочник',
        collapsed: false,
        items: [
          { text: 'API', link: '/ru/reference/api' },
          { text: 'Интернационализация', link: '/ru/reference/i18n' },
          { text: 'Встроенные правила валидации', link: '/ru/reference/built-in-validation-rules' },
          { text: 'Работа с файлами', link: '/ru/reference/file-handling' }
        ]
      },
      {
        text: 'Расширенные возможности',
        collapsed: false,
        items: [
          { text: 'Вложенные структуры данных', link: '/ru/advanced-usage/nested-data-structures' },
          { text: 'Кэширование валидации', link: '/ru/advanced-usage/validation-caching' },
          { text: 'Продвинутые примеры', link: '/ru/advanced-usage/advanced-examples' },
        ]
      },
    ],

    editLink: {
      pattern: 'https://github.com/sakhnovkrg/vue-form-validator/edit/main/docs/:path',
      text: 'Предложить изменения'
    },

    footer: {
      message: 'Опубликовано под лицензией MIT.',
      copyright: '© 2026 – н.в.'
    },

    outline: { label: 'Содержание страницы' },

    docFooter: {
      prev: 'Предыдущая страница',
      next: 'Следующая страница'
    },

    lastUpdated: {
      text: 'Обновлено'
    },

    notFound: {
      title: 'СТРАНИЦА НЕ НАЙДЕНА',
      quote:
        'Но если ты не изменишь направление и продолжишь искать, ты можешь оказаться там, куда направляешься.',
      linkLabel: 'перейти на главную',
      linkText: 'Отведи меня домой'
    },

    darkModeSwitchLabel: 'Оформление',
    lightModeSwitchTitle: 'Переключить на светлую тему',
    darkModeSwitchTitle: 'Переключить на тёмную тему',
    sidebarMenuLabel: 'Меню',
    returnToTopLabel: 'Вернуться к началу',
    langMenuLabel: 'Изменить язык',
    skipToContentLabel: 'Перейти к содержимому'
  }
})
