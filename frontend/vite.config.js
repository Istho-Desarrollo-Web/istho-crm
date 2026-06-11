import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@context': path.resolve(__dirname, './src/context'),
      '@api': path.resolve(__dirname, './src/api'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@assets': path.resolve(__dirname, './src/assets')
    }
  },
  
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true
      }
    }
  },
  
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // React + MUI en un solo chunk para eliminar el ciclo vendor ↔ mui.
            // Ambos ecosistemas se importan mutuamente (React internals ↔ emotion/MUI),
            // y separarlos causa TDZ errors en producción.
            if (
              id.includes('/react/') ||
              id.includes('react-dom') ||
              id.includes('react-router') ||
              id.includes('@remix-run') ||
              id.includes('/scheduler/') ||
              id.includes('react-is') ||
              id.includes('react-transition-group') ||
              id.includes('@mui/') ||
              id.includes('@emotion/') ||
              id.includes('@popperjs')
            ) {
              return 'vendor';
            }
            // Íconos
            if (id.includes('lucide-react')) return 'icons';
            // Gráficas
            if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-')) return 'charts';
            // WebSocket
            if (id.includes('socket.io-client') || id.includes('engine.io-client')) return 'realtime';
            // Tutorial interactivo
            if (id.includes('driver.js')) return 'tutorial';
            // Formularios
            if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('yup')) return 'forms';
            // Fechas
            if (id.includes('date-fns') || id.includes('react-day-picker')) return 'dates';
            // Notificaciones
            if (id.includes('notistack')) return 'notifications';
            // Sin catch-all: Vite divide automáticamente el resto para evitar ciclos
          }
        }
      }
    }
  },

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
  },
});