import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// When running in GitHub Actions the GITHUB_ACTIONS env var is set to 'true'.
// All other environments (local dev, local preview) use the root.
const base = process.env.GITHUB_ACTIONS ? '/stempel/' : '/'

export default defineConfig({
  base,

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/*.png', 'icons/*.svg'],

      manifest: {
        name: 'Stempel',
        short_name: 'Stempel',
        description: 'Persönliche Zeiterfassung — auch offline',
        lang: 'de',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#c73e3a',
        background_color: '#ffffff',
        icons: [
          { src: 'icons/icon-192x192.png',       sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512x512.png',        sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },

      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [
          /^https:\/\/.*\.googleapis\.com\//,
          /^https:\/\/accounts\.google\.com\//,
        ],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/www\.googleapis\.com\/drive\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },

      devOptions: { enabled: false },
    }),
  ],
})
