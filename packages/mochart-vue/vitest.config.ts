import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Compile-time flags expected by vue's esm-bundler build.
  define: {
    __VUE_OPTIONS_API__: 'true',
    __VUE_PROD_DEVTOOLS__: 'false',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false'
  },
  test: {
    environment: 'jsdom'
  }
});
