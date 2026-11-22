import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://54.82.137.170',
        changeOrigin: true,
        secure: false, // Ignorar certificado auto-firmado de AWS EC2
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/ws': {
        target: 'wss://54.82.137.170',
        ws: true,
        changeOrigin: true,
        secure: false, // Ignorar certificado auto-firmado de AWS EC2
      },
    },
  },
});
