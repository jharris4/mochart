import { defineConfig } from 'vite';

export default defineConfig({
  // Each demo gallery pins its own port so they can run side by side.
  server: { port: 5179 },
  preview: { port: 4179 },
  build: { sourcemap: true }
});
