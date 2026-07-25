import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from 'vite-plugin-pwa';

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
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
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024
      }
    })
  ],
  base: process.env.VITE_TARGET === 'forge' ? './' : (process.env.VITE_BASE || '/'),

  // ── Build Optimization: Split heavy dependencies into separate chunks ───
  build: {
    rollupOptions: {
      output: {
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
            return 'icons-devicons';
          }
          // Lucide icons — used across many components
          if (id.includes('lucide-react')) {
            return 'icons-lucide';
          }
          // Graph layout — only for auto-layout in editor
          if (id.includes('dagre')) {
            return 'graph-layout';
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
}));
