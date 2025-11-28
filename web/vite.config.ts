import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Aponta para src
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Conecta com seu NestJS
        changeOrigin: true,
        secure: false,
      }
    }
  }
});