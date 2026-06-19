/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['logo.png'],
      manifest: {
        name: 'Cream & Crust',
        short_name: 'Cream & Crust',
        description: 'Artisanal Bakery ERP',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'logo.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        // Exclude public menu template HTML from precache — they change
        // frequently and must always load fresh from the network.
        globIgnores: ['**/menu/**', '**/template/**'],
        // Force new SW to take over immediately
        skipWaiting: true,
        clientsClaim: true,
        // Clean old caches on activate
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Menu templates — always fetch fresh, fall back to cache
          {
            urlPattern: /\/menu\/|template/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'menu-templates',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 }, // 1 hour
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    // The Firestore rules isolation suite is emulator-gated and depends on
    // @firebase/rules-unit-testing + a running emulator. Exclude it from the
    // default jsdom run; invoke it explicitly when the emulator is up.
    exclude: ['**/node_modules/**', '**/dist/**', 'src/test/rules/**', 'tests/**'],
  },
  // Strip noisy debug logs from the production bundle while keeping
  // console.error / console.warn for real diagnostics (Req 16.2).
  esbuild: {
    pure: ['console.log', 'console.debug', 'console.info'],
  },
  build: {
    outDir: 'dist',
    // Emit source maps so production errors map back to source (Req 16.6).
    sourcemap: true,
    minify: 'esbuild',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core Firebase SDK — large but required on every page
          firebase: [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/storage',
            'firebase/messaging',
          ],
          // Core React + routing + animation — loaded on every page
          vendor: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
          // PDF generation — only needed when the user exports/downloads
          pdf: ['jspdf', 'html2canvas'],
          // Chart rendering — only needed on Analytics page
          charts: ['chart.js', 'react-chartjs-2'],
          // Capacitor browser plugin — only needed on native
          'cap-browser': ['@capacitor/browser'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
