import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// An opt-in production profiler. Never part of the application/PWA build.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist-profile',
    rollupOptions: { input: 'scripts/playback-profile.html' },
  },
  preview: { host: '127.0.0.1', port: 1422, strictPort: true },
});
