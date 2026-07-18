import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  // Each demo gallery pins its own port so they can run side by side.
  server: { port: 5175 },
  preview: { port: 4175 },
  plugins: [svelte()]
});
