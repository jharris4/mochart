import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  // Resolve svelte's client-side (browser) build inside vitest's node process,
  // so `mount` works against jsdom instead of the server entry.
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
  test: {
    environment: 'jsdom'
  }
});
