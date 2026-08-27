import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    allowedHosts: ['jm2.tail59251.ts.net']
  },
  build: {
    copyPublicDir: false,
  },
});
