# @mochart/editor

A framework-neutral, strict JSON editor with optional Mochart config intelligence.
It powers the JSON editing tabs in the Mochart demos.

Docs: [mochart.org](https://mochart.org) — start with the
[editor guide](https://mochart.org/guide/editor).

## Install

```sh
npm install @mochart/editor @mochart/core
```

`@mochart/core` is a peer dependency: the config diagnostics run against your
app's copy of the library, so they always agree with the chart you render.

```ts
import { createJsonEditor, createMochartConfigSupport } from '@mochart/editor';
import '@mochart/editor/editor.css';

const editor = createJsonEditor(document.querySelector('#editor')!, {
  value: JSON.stringify(config, null, 2),
  ariaLabel: 'Mochart configuration',
  ariaDescribedBy: 'config-editor-help',
  support: createMochartConfigSupport(),
  onChange(value) {
    // Keep application state in control of the current value.
  },
  onDiagnostics(diagnostics) {
    // Includes JSON syntax and Mochart validation diagnostics.
  }
});

editor.format();
editor.setValue(nextValue);
editor.setTheme('dark');
editor.showFocusRange(diagnostic.from, diagnostic.to);
editor.destroy();
```

The Mochart support provides:

- completions for top-level, section, and nested properties;
- enum, boolean, and configured-ID value completions;
- hover documentation, defaults, and validation rules;
- syntax and path-aware Mochart validation diagnostics.

Pass `theme: 'dark'` for the bundled dark syntax treatment, then use
`setTheme('light' | 'dark')` to change it without replacing the document or
undo history. Both themes use CSS custom properties, so hosts can override the
editor surface, focus, border, and gutter colors. The editable element receives
`aria-invalid` as diagnostics change, and `ariaDescribedBy` can connect it to
keyboard instructions or other help text.

Run `npm run dev:editor` from the repository root for the isolated editor and
live-chart playground.

## The `development` export condition

The `exports` map has a `development` entry pointing at this package's
TypeScript sources, alongside the `default` entry pointing at the built
`dist/`. It exists for this repository's own dev servers and `tsx` scripts,
which run the library from source.

Bundlers that enable the `development` condition resolve it as well. Vite does:
its default `resolve.conditions` are `['module', 'browser',
'development|production']`, so `vite dev` (and Vite's SSR dev pipeline) load
`src/` out of `node_modules`, while `vite build` matches `production` and loads
`dist/`. If loading unbuilt source is a problem for your dev server, list the
conditions explicitly and leave `development` out:

```js
// vite.config.ts
export default defineConfig({
  resolve: { conditions: ['module', 'browser', 'production'] }
});
```
