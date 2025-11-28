import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/', // Garante caminhos absolutos
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'), // Melhora resolução de caminhos
    },
  },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
  },
});
