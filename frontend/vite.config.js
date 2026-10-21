import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server forwards /api and /uploads to the Express backend,
// so the browser never has to deal with CORS during development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
});
