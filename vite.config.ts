import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Relative base so the same build works at deazy55555.github.io/Earth_Build/
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
  // PREVIEW=1 builds a copy without the offline service worker (for hosted previews).
  plugins: (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.PREVIEW ? [] : [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-180.png'],
      manifest: {
        name: 'Earth Toy',
        short_name: 'Earth Toy',
        description: 'A little 3D world to spin, zoom and explore.',
        theme_color: '#0b1030',
        background_color: '#0b1030',
        display: 'fullscreen',
        orientation: 'any',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}', 'voice/index.json'],
        // voice clips are saved for offline use the first time they're played
        runtimeCaching: [
          {
            urlPattern: /\/voice\/.*\.mp3$/,
            handler: 'CacheFirst',
            options: { cacheName: 'voice', expiration: { maxEntries: 5000 } },
          },
        ],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
});
