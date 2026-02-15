import { createRequire } from 'module'
import { defineAdditionalConfig, type DefaultTheme } from 'vitepress'

const require = createRequire(import.meta.url)
const pkg = require('../package.json')

export default defineAdditionalConfig({
  description: 'Type-safe form validation library for Vue featuring powerful capabilities.',

  themeConfig: {
    nav: [
      {
        text: 'Reference',
        link: '/reference/api',
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
            text: 'Changelog',
            link: 'https://github.com/vuejs/vitepress/blob/main/CHANGELOG.md'
          },
          {
            text: 'Contributing',
            link: 'https://github.com/vuejs/vitepress/blob/main/.github/contributing.md'
          }
        ]
      }
    ],

    sidebar: [
      {
        text: 'Introduction',
        collapsed: false,
        items: [
          { text: 'Getting Started', link: 'getting-started' },
          { text: 'Key Features', link: 'key-features' },
          { text: 'Develop', link: 'develop' }
        ]
      },
      {
        text: 'Reference',
        collapsed: false,
        items: [
          { text: 'API', link: '/reference/api' },
          { text: 'Internationalization', link: '/reference/i18n' },
          { text: 'Built-in Validation Rules', link: '/reference/built-in-validation-rules' },
          { text: 'File Handling', link: '/reference/file-handling' }
        ]
      },
      {
        text: 'Advanced Usage',
        collapsed: false,
        items: [
          { text: 'Nested Data Structures', link: '/advanced-usage/nested-data-structures' },
          { text: 'Validation Caching', link: '/advanced-usage/validation-caching' },
          { text: 'Advanced Examples', link: '/advanced-usage/advanced-examples' },
        ]
      },
    ],

    editLink: {
      pattern: 'https://github.com/sakhnovkrg/vue-form-validator/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: '© 2026-present'
    }
  }
})
