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
        target: 'https://ec2-100-50-120-115.compute-1.amazonaws.com',
        changeOrigin: true,
        secure: false, // Ignorar certificado auto-firmado de AWS EC2
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/ws': {
        target: 'wss://ec2-100-50-120-115.compute-1.amazonaws.com',
        ws: true,
        changeOrigin: true,
        secure: false, // Ignorar certificado auto-firmado de AWS EC2
      },
    },
  },
});
