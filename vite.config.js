import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { compression } from 'vite-plugin-compression2'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    compression({ algorithm: 'brotliCompress', exclude: [/\.(br)$/, /\.(gz)$/] }),
    {
      name: 'defer-css',
      enforce: 'post',
      transformIndexHtml(html) {
        return html.replace(
          /<link rel="stylesheet" crossorigin href="([^"]+)">/g,
          '<link rel="preload" href="$1" as="style" onload="this.onload=null;this.rel=\'stylesheet\'"><noscript><link rel="stylesheet" href="$1"></noscript>'
        );
      }
    }
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
  esbuild: {
    drop: ['console', 'debugger'],
    legalComments: 'none',
    treeShaking: true
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setupTests.js',
  },
  build: {
    target: 'esnext',
    sourcemap: false,
    chunkSizeWarningLimit: 1500, // Alza il limite a 1.5MB per evitare il warning
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        // Ignora il falso positivo di Tailwind v4 su Rolldown
        if (warning.message && warning.message.includes('SOURCEMAP_BROKEN')) return;
        defaultHandler(warning);
      }
    }
  }
})
