import { defineConfig } from 'vite';

// Library build: bundles mochart together with all of its dependencies
// (d3-*, valide) into self-contained browser artifacts.
//   dist/mochart.js      — ES module, for <script type="module"> / bundlers
//   dist/mochart.iife.js — classic script, exposes the global `mochart`
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'mochart',
      formats: ['es', 'iife'],
      fileName: (format) => (format === 'es' ? 'mochart.js' : 'mochart.iife.js')
    },
    sourcemap: true
  }
});
