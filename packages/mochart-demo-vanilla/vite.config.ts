import { defineConfig } from 'vite';
import { depSourcemaps } from '../../scripts/dep-sourcemaps';

export default defineConfig({
  // Each demo gallery pins its own port so they can run side by side.
  server: { port: 5179 },
  preview: { port: 4179 },
  build: { sourcemap: true },
  plugins: [depSourcemaps()]
});
