import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      // Type-only and generated modules carry no runtime behaviour to exercise.
      exclude: ['src/types/**', 'src/**/*.d.ts'],
      reporter: ['text', 'html']
    }
  }
});
