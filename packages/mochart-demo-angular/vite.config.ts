import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  // Each demo gallery pins its own port so they can run side by side.
  server: { port: 5180 },
  preview: { port: 4180 },
  resolve: {
    alias: {
      // Compile the binding from source together with the app: its published
      // dist ships partial-Ivy declarations, and the plugin's linker skips
      // workspace-symlinked packages (they resolve outside node_modules).
      'mochart-angular': fileURLToPath(new URL('../mochart-angular/src/index.ts', import.meta.url))
    }
  },
  // The angular plugin compiles with AOT against tsconfig.app.json (its
  // default); tsconfig.json stays noEmit for the ngc typecheck script.
  plugins: [angular()]
});
