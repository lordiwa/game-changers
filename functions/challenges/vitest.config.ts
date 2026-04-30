import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    root: __dirname,
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json'],
    },
  },
});
