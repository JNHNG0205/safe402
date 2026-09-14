import { defineConfig } from 'vitest/config';

// The Docker-backed integration files each run containers; running two of them at once starved
// the collector and flaked. One file at a time keeps the runs honest at the cost of wall time.
export default defineConfig({ test: { include: ['test/**/*.test.ts'], testTimeout: 180_000, hookTimeout: 180_000, fileParallelism: false } });
