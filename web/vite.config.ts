import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks (bibliotecas grandes separadas para melhor cache)
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react'],
          'map-vendor': ['leaflet', 'react-leaflet'],
          'chart-vendor': ['recharts', 'd3'],
          'utils-vendor': ['axios', 'papaparse', 'xlsx'],

          // Páginas agrupadas por funcionalidade
          'routes-pages': [
            './src/pages/RoutePlanner.tsx',
            './src/pages/RouteList.tsx',
          ],
          'management-pages': [
            './src/pages/CustomerList.tsx',
            './src/pages/DriverList.tsx',
            './src/pages/VehicleList.tsx',
            './src/pages/SellerList.tsx',
          ],
          'operations-pages': [
            './src/pages/DeliveryList.tsx',
            './src/pages/OccurrenceList.tsx',
          ],
          'admin-pages': [
            './src/pages/admin/AdminDashboard.tsx',
            './src/pages/Settings.tsx',
            './src/pages/Reports.tsx',
          ],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // 1MB
    sourcemap: false, // Desabilitar sourcemaps em produção para reduzir tamanho
    minify: 'esbuild', // Minificação rápida com esbuild
    target: 'es2015', // Compatibilidade com navegadores modernos
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3333',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 5173,
    host: true,
  },
});
