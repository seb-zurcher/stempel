import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base: '/stempel/' when deploying to GitHub Pages (step 16)
export default defineConfig({
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
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#c73e3a',
        background_color: '#ffffff',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      workbox: {
        // Precache the full app shell on SW install
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [
          // Never intercept Google API calls
          /^https:\/\/.*\.googleapis\.com\//,
          /^https:\/\/accounts\.google\.com\//,
        ],
        runtimeCaching: [
          {
            // Google Fonts — stale-while-revalidate so they work offline
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            // Google Drive API — never cache (always network)
            urlPattern: /^https:\/\/www\.googleapis\.com\/drive\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },

      devOptions: {
        // Keep SW off in dev to avoid stale-cache confusion
        enabled: false,
      },
    }),
  ],

  base: '/',
})
