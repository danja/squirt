import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8', // Modern, fast, built-in
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: ['**/node_modules/**', '**/dist/**', '**/test/**', '**/tests/**'],
    },
    include: ['src/**/*.{test,spec}.{js,mjs}'],
  },
});
