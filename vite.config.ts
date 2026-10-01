import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// A production build must know where the API is: without this check a
// missing VITE_API_BASE_URL silently bakes the localhost default into the
// bundle and every request fails on the deployed site.
// A plugin hook (not a function config) because vitest.config.ts merges
// this file as an object.
const requireApiBaseUrl = (): Plugin => ({
  name: 'require-api-base-url',
  config(_config, { command, mode }) {
    if (command !== 'build' || mode !== 'production') return

    const url = loadEnv(mode, process.cwd(), '').VITE_API_BASE_URL ?? ''
    if (!url.startsWith('https://') && !url.startsWith('/')) {
      throw new Error(
        'VITE_API_BASE_URL must be an https:// URL or a same-origin path such as /api/ ' +
          `for production builds (got "${url}"). See .env.example.`,
      )
    }
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Leave absolute paths like "/postgradeLogo.jpg" as-is: they are served
    // from public/, and turning them into imports breaks the Vitest run.
    vue({ template: { transformAssetUrls: { includeAbsolute: false } } }),
    vueDevTools(),
    requireApiBaseUrl(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
