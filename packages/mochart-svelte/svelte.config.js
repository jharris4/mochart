import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Components use `<script lang="ts">`; vitePreprocess strips the TS so
// svelte-package emits plain-JS `.svelte` files (plus generated `.svelte.d.ts`)
// that consumers can use without their own preprocessor.
export default {
  preprocess: vitePreprocess({ script: true })
};
