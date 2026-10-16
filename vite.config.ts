import { defineConfig, type ESBuildOptions } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from 'vite-plugin-pwa';

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async ({ command }) => {
  const isBuild = command === 'build';

  return {
    esbuild: isBuild ? ({ drop: ['console', 'debugger'] } as ESBuildOptions) : undefined,
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: false,
        disable: !!process.env.VITE_TARGET || process.env.VITE_PROFILE_STARTUP === 'true', // Hosts own their lifecycle; never install a worker in their iframe.
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-icon.png'],
        manifest: {
          name: 'YADA',
          short_name: 'YADA',
          description: 'A powerful architecture diagramming tool',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-icon.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-icon.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          skipWaiting: false,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
          // Optional icons are cached on use; installing the shell must not fetch every SVG.
          globPatterns: ['**/*.{js,css,html,woff2}'],
          globIgnores: ['**/devicon-*.js', '**/fonts/caveat-*', '**/fonts/kalam-*', '**/fonts/sketch.css'],
          runtimeCaching: [{
            urlPattern: /\/fonts\/(?:sketch\.css|(?:caveat|kalam)-[^/]+\.woff2)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'yada-drawing-fonts-v1', expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          }, {
            urlPattern: /\/assets\/devicon-[^/]+\.js$/,
            handler: 'CacheFirst',
            options: { cacheName: 'yada-devicons', expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          }],
          navigateFallbackDenylist: [/\.(?:json|svg|png|jpe?g|gif|webp|ico|mp4|webm|dproj|zip|woff2?|css|js)(?:\?.*)?$/i]
        }
      })
    ],
    base: (process.env.VITE_TARGET === 'forge' || process.env.VITE_TARGET === 'confluence-dc') ? './' : (process.env.VITE_BASE || '/'),

    // ── Build Optimization: Split heavy dependencies into separate chunks ───
    build: {
      rollupOptions: {
        output: {
          onlyExplicitManualChunks: true,
          manualChunks(id: string) {
            // React core — cached across all pages
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
              return 'react-vendor';
            }
            // Diagram engine — needed for both view and edit
            if (id.includes('node_modules/@xyflow/')) {
              return 'flow-engine';
            }
            // Export tools — only needed when user exports GIF/MP4/WebM
            if (id.includes('gif.js') || id.includes('gifenc') || id.includes('webm-muxer') || id.includes('mp4-muxer') || id.includes('html-to-image')) {
              return 'export-tools';
            }
            // Archive/compression — only for .dproj import/export and sharing
            if (id.includes('jszip') || id.includes('lz-string')) {
              return 'archive';
            }
            // Technology icon set — only for editor sidebar
            if (id.includes('devicons-react')) {
              return `devicon-${id.split('/').pop()?.replace(/\.[^.]+$/, '')}`;
            }
            // Lucide icons — used across many components
            if (id.includes('lucide-react')) {
              return 'icons-lucide';
            }
            // Tauri desktop plugins — never used in Confluence
            if (id.includes('@tauri-apps/') || id.includes('tauri-plugin-oauth')) {
              return 'tauri-plugins';
            }
          }
        }
      }
    },

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent Vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
            protocol: "ws",
            host,
            port: 1421,
          }
        : undefined,
      watch: {
        // 3. tell Vite to ignore watching `src-tauri`
        ignored: ["**/src-tauri/**"],
      },
    },
  };
});
