import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Angular's virtual test modules are written to a short-lived Windows temp
    // directory. Running spec files serially prevents workers from racing that
    // directory in restricted Windows environments and keeps CI deterministic.
    fileParallelism: false,
    isolate: true,
    pool: 'vmThreads',
  },
});
