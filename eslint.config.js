import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import typescript from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import globals from 'globals'
import prettierConfig from 'eslint-config-prettier'

export default [
  js.configs.recommended,
  ...vue.configs['flat/recommended'],
  prettierConfig,
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      // TypeScript
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-redeclare': 'off', // Разрешить TypeScript overload'ы

      // General
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-unused-vars': 'off', // Отключить базовое правило в пользу TypeScript версии
      'no-redeclare': 'off', // Отключить базовое правило в пользу TypeScript версии
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        parser: typescriptParser,
        extraFileExtensions: ['.vue'],
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      // Vue specific
      'vue/multi-word-component-names': 'off',
      'vue/attributes-order': 'warn',

      // TypeScript
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-redeclare': 'off', // Разрешить TypeScript overload'ы

      // General
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-unused-vars': 'off', // Отключить базовое правило в пользу TypeScript версии
      'no-redeclare': 'off', // Отключить базовое правило в пользу TypeScript версии
    },
  },
  {
    ignores: [
      'dist/**',
      'dist-playground/**',
      'playground/dist-playground/**',
      'node_modules/**',
      '*.d.ts',
    ],
  },
]
