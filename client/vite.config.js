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
  ],
  server: {
    port: Number(process.env.CLIENT_PORT) || 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_API_BASE_URL || `http://localhost:${process.env.PORT || process.env.SERVER_PORT || 3001}`,
        changeOrigin: true,
      },
    },
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
