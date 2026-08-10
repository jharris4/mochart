import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    // Golden demos with 2000ms animations re-render hundreds of frames; slow CI runners exceed the 5s default.
    // The golden file raises this further for itself (test/golden/golden.test.ts) — coverage runs starve it.
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      // Type-only and generated modules carry no runtime behaviour to exercise.
      exclude: ['src/types/**', 'src/**/*.d.ts'],
      reporter: ['text', 'html'],
      // a whisker under the current numbers: real erosion fails, an incidental refactor does not
      thresholds: { statements: 97, branches: 90, functions: 97, lines: 97 }
    }
  }
});
