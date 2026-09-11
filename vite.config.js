import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { compression } from "vite-plugin-compression2";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig(() => ({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    compression({
      algorithm: "brotliCompress",
      exclude: [/\.(br)$/, /\.(gz)$/],
    }),
    compression({
      algorithm: "gzip",
      exclude: [/\.(br)$/, /\.(gz)$/],
    }),
    {
      name: "defer-css",
      enforce: "post",
      transformIndexHtml(html) {
        return html.replace(
          /<link rel="stylesheet" crossorigin href="([^"]+)">/g,
          '<link rel="preload" href="$1" as="style" crossorigin onload="this.onload=null;this.rel=\'stylesheet\'"><noscript><link rel="stylesheet" crossorigin href="$1"></noscript>',
        );
      },
    },
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
    watch: {
      ignored: ["**/server/**"],
    },
  },
  test: {
    slowTestThreshold: 1000,
    fileParallelism: true,
    coverage: {
      provider: "v8",
      reportsDirectory: "tests/coverage",
      clean: false,
      cleanOnRerun: false,
      exclude: ["server/middlewares/analytics.js", "server/stats-cli.js", "scripts/**"],
      reporter: [
        ["text", { maxCols: 80 }]
      ],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'happy-dom',
          globals: true,
          isolate: false,
          slowTestThreshold: 1000,
          setupFiles: ['./tests/frontend/setupTests.js'],
          include: ['tests/frontend/**/*.{test,spec}.{js,jsx}', 'tests/backend/**/*.{test,spec}.{js,jsx}'],
        }
      },
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'happy-dom',
          globals: true,
          isolate: false,
          slowTestThreshold: 1000,
          setupFiles: ['./tests/frontend/setupTests.js'],
          include: ['tests/integration/**/*.{test,spec}.{js,jsx}'],
        }
      }
    ]
  },
  build: {
    target: "esnext",
    sourcemap: false,
    chunkSizeWarningLimit: 1500, // Alza il limite a 1.5MB per evitare il warning
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("leaflet") || id.includes("react-leaflet")) {
              return "maps";
            }
            if (id.includes("react") || id.includes("react-router-dom") || id.includes("swr") || id.includes("i18next")) {
              return "vendor";
            }
          }
        },
      },
      onwarn(warning, defaultHandler) {
        // Ignora il falso positivo di Tailwind v4 su Rolldown
        if (warning.message && warning.message.includes("SOURCEMAP_BROKEN"))
          return;
        defaultHandler(warning);
      },
    },
  },
}));
