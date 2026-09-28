import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import os from "node:os";

const availableCpus = typeof os.availableParallelism === "function" ? os.availableParallelism() : os.cpus().length;
const maxTestWorkers = Math.max(2, Math.min(4, Math.floor(availableCpus / 2)));

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./client/src", import.meta.url)),
    },
  },
  plugins: [react()],
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
});
