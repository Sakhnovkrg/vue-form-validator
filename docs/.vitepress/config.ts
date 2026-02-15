import {
  defineConfig,
  resolveSiteDataByRoute,
  type HeadConfig
} from 'vitepress'
import {
  groupIconMdPlugin,
  groupIconVitePlugin,
  localIconLoader
} from 'vitepress-plugin-group-icons'
import llmstxt from 'vitepress-plugin-llms'

const prod = !!process.env.NETLIFY

export default defineConfig({
  title: 'Vue Form Validator',
  base: '/vue-form-validator/',

  rewrites: {
    'en/:rest*': ':rest*'
  },

  lastUpdated: true,
  cleanUrls: true,
  metaChunk: true,

  markdown: {
    math: true,
    codeTransformers: [
      // We use `[!!code` and `@@include` in demo to prevent transformation,
      // here we revert it back.
      {
        postprocess(code) {
          return code
            .replaceAll('[!!code', '[!code')
            .replaceAll('@@include', '@include')
        }
      }
    ],
    config(md) {
      // TODO: remove when https://github.com/vuejs/vitepress/issues/4431 is fixed
      const fence = md.renderer.rules.fence!
      md.renderer.rules.fence = function (tokens, idx, options, env, self) {
        const { localeIndex = 'root' } = env
        const codeCopyButtonTitle = (() => {
          switch (localeIndex) {
            case 'ru':
              return 'Скопировать код'
            default:
              return 'Copy code'
          }
        })()
        return fence(tokens, idx, options, env, self).replace(
          '<button title="Copy Code" class="copy"></button>',
          `<button title="${codeCopyButtonTitle}" class="copy"></button>`
        )
      }
      md.use(groupIconMdPlugin)
    }
  },

  sitemap: {
    hostname: 'https://sakhnovkrg.github.io',
    transformItems(items) {
      return items.filter((item) => !item.url.includes('migration'))
    }
  },

  head: [
    [
      'link',
      { rel: 'icon', type: 'image/svg+xml', href: '/logo-mini.svg' }
    ],
    [
      'link',
      { rel: 'icon', type: 'image/png', href: '/logo-mini.svg' }
    ],
    ['meta', { name: 'theme-color', content: '#42b883' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'vue-form-validator' }],
    [
      'meta',
      {
        property: 'og:image',
        content: 'https://vitepress.dev/og.jpg'
      }
    ],
    ['meta', { property: 'og:url', content: 'https://sakhnovkrg.github.io/vue-form-validator/' }]
  ],

  themeConfig: {
    logo: { src: '/logo-mini.svg', width: 24, height: 24 },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Sakhnovkrg/vue-form-validator' }
    ],

    // search: {
    //   provider: 'algolia',
    //   options: {
    //     appId: '8J64VVRP8K',
    //     apiKey: '52f578a92b88ad6abde815aae2b0ad7c',
    //     indexName: 'vitepress',
    //     askAi: {
    //       assistantId: 'YaVSonfX5bS8',
    //       sidePanel: true
    //     }
    //   }
    // },
  },

  locales: {
    root: { label: 'English', lang: 'en-US', dir: 'ltr' },
    ru: { label: 'Русский', lang: 'ru-RU', dir: 'ltr' }
  },

  vite: {
    plugins: [
      groupIconVitePlugin({
        customIcon: {
          vitepress: localIconLoader(
            import.meta.url,
            '../public/logo-mini.svg'
          ),
          firebase: 'logos:firebase'
        }
      }),
      prod &&
        llmstxt({
          workDir: 'en',
          ignoreFiles: ['index.md']
        })
    ]
  },

  transformPageData: prod
    ? (pageData, ctx) => {
        const site = resolveSiteDataByRoute(
          ctx.siteConfig.site,
          pageData.relativePath
        )
        const title = `${pageData.title || site.title} | ${pageData.description || site.description}`
        ;((pageData.frontmatter.head ??= []) as HeadConfig[]).push(
          ['meta', { property: 'og:locale', content: site.lang }],
          ['meta', { property: 'og:title', content: title }]
        )
      }
    : undefined
})
