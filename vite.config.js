import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { compression } from "vite-plugin-compression2";
import { fileURLToPath, URL } from "node:url";
import os from "node:os";

const availableCpus = typeof os.availableParallelism === "function" ? os.availableParallelism() : os.cpus().length;
const maxTestWorkers = Math.max(2, Math.min(4, Math.floor(availableCpus / 2)));

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
    pool: "forks",
    maxForks: maxTestWorkers,
    minForks: 1,
    isolate: true,
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
          isolate: true,
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
          isolate: true,
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
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("leaflet") || id.includes("react-leaflet") || id.includes("react-leaflet-cluster")) {
              return "maps";
            }
            if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("\\react\\") || id.includes("\\react-dom\\")) {
              return "react-core";
            }
            if (
              id.includes("react-router") ||
              id.includes("swr") ||
              id.includes("i18next")
            ) {
              return "vendor-state";
            }
            if (id.includes("qrcode")) {
              return "qrcode";
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
