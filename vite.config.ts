import { defineConfig } from 'vitest/config'
import pkg from './package.json'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Относительные пути: сборка работает и в корне домена, и в подпапке GitHub Pages (/<репозиторий>/).
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // «prompt»: новая версия не подменяет старую молча — см. src/app/UpdateBanner.tsx
      registerType: 'prompt',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Трекер целей и задач',
        short_name: 'Трекер',
        description: 'Недельные цели и задачи на день',
        lang: 'ru',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        background_color: '#f2f2f7',
        theme_color: '#f2f2f7',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // Splash-экраны нужны только системе при запуске — в офлайн-кэш их не кладём.
        globIgnores: ['**/splash/**'],
      },
    }),
  ],
  server: { host: true },
  preview: { host: true },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
