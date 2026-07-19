import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Each demo gallery pins its own port so they can run side by side.
  server: { port: 5174 },
  preview: { port: 4174 },
  plugins: [react()]
});
