import { defineConfig } from 'vite';

// Each demo gallery pins its own port so they can run side by side.
export default defineConfig({
  server: { port: 5178 },
  preview: { port: 4178 },
  build: { sourcemap: true }
});
