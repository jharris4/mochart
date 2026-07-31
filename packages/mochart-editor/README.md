# @mochart/editor

A framework-neutral, strict JSON editor with optional Mochart config intelligence.
It is currently private while its API is exercised in the Mochart demos.

```ts
import { createJsonEditor, createMochartConfigSupport } from '@mochart/editor';
import '@mochart/editor/editor.css';

const editor = createJsonEditor(document.querySelector('#editor')!, {
  value: JSON.stringify(config, null, 2),
  ariaLabel: 'Mochart configuration',
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
editor.destroy();
```

The Mochart support provides:

- completions for top-level, section, and nested properties;
- enum, boolean, and configured-ID value completions;
- hover documentation, defaults, and validation rules;
- syntax and path-aware Mochart validation diagnostics.

Run `npm run dev:editor` from the repository root for the isolated editor and
live-chart playground.
