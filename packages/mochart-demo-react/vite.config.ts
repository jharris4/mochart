import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Ancient deps replaced with tiny local shims.
      'react-sizer': fileURLToPath(new URL('./src/shims/react-sizer.tsx', import.meta.url)),
      'react-fontawesome': fileURLToPath(new URL('./src/shims/react-fontawesome.tsx', import.meta.url))
    }
  }
});
