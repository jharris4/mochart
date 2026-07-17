import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The demo sources still use legacy (stage-1) decorators via autobind-decorator,
// so JSX/decorator transforms run through babel instead of esbuild/oxc.
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['@babel/plugin-proposal-decorators', { legacy: true }]]
      }
    })
  ],
  resolve: {
    alias: {
      // Ancient deps replaced with tiny local shims.
      'react-sizer': fileURLToPath(new URL('./src/shims/react-sizer.jsx', import.meta.url)),
      'react-fontawesome': fileURLToPath(new URL('./src/shims/react-fontawesome.jsx', import.meta.url))
    }
  }
});
