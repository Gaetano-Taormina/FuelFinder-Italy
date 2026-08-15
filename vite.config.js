import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { compression } from 'vite-plugin-compression2'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    compression({ algorithm: 'brotliCompress', exclude: [/\.(br)$/, /\.(gz)$/] })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    },
    watch: {
      ignored: ['**/server/**']
    }
  },
  build: {
    chunkSizeWarningLimit: 1500, // Alza il limite a 1.5MB per evitare il warning
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('leaflet') || id.includes('react-leaflet')) {
              return 'vendor-leaflet';
            }
            return 'vendor-core'; // Tutti gli altri moduli esterni
          }
        }
      }
    }
  }
})
