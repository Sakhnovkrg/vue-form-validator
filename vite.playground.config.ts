import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// Playground configuration
export default defineConfig({
  plugins: [vue()],
  root: resolve(__dirname, 'playground'),
  base: '/vue-form-validator/playground/',
  build: {
    outDir: '../dist-playground',
  },
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/index.ts'),
    },
  },
})
