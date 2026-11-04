/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  // .env lives in the monorepo root; only VITE_* variables reach the browser bundle.
  const env = loadEnv(mode, fileURLToPath(new URL('..', import.meta.url)), 'VITE_');
  const backend = env.VITE_DEV_PROXY_TARGET || 'http://127.0.0.1:8000';
  return {
    envDir: '..',
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { port: 5173, proxy: { '/api': { target: backend, changeOrigin: true } } },
    preview: { port: 4173, proxy: { '/api': { target: backend, changeOrigin: true } } },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            leaflet: ['leaflet', 'react-leaflet'],
            data: ['@tanstack/react-query', 'zustand', 'zod', 'idb'],
          },
        },
      },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.svg', 'icons/*.png'],
        manifest: {
          name: 'Locate U — Travel companion for India',
          short_name: 'Locate U',
          description: 'Explore maps, search places and discover every Indian state and union territory.',
          theme_color: '#0b1220',
          background_color: '#0b1220',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          categories: ['travel', 'navigation'],
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
          shortcuts: [
            { name: 'World map', url: '/map', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
            { name: 'India explorer', url: '/india', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
            { name: 'Saved places', url: '/saved', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              // Local India dataset & boundaries: fast from cache, refreshed in the background.
              urlPattern: ({ url }) => url.pathname.startsWith('/api/v1/india/'),
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'locate-u-india', expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 } },
            },
            {
              urlPattern: ({ url }) => url.pathname === '/api/v1/config',
              handler: 'NetworkFirst',
              options: { cacheName: 'locate-u-config', networkTimeoutSeconds: 4 },
            },
            // Map tiles are intentionally NOT cached by the service worker (OSM tile usage policy);
            // they rely on normal HTTP caching only.
          ],
        },
        devOptions: { enabled: false },
      }),
    ],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      include: ['src/**/*.test.{ts,tsx}'],
    },
  };
});
