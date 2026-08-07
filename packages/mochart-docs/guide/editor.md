# Editing config JSON

The [@mochart/editor](https://github.com/jharris4/mochart/tree/main/packages/mochart-editor)
companion package is a strict-JSON code editor (built on CodeMirror) with
optional Mochart config intelligence: completions for sections, properties,
and values; hover documentation with defaults and validation rules; and
path-aware validation diagnostics as you type. It is framework-neutral,
like the core library, and powers the JSON editing tabs in every
[demo gallery](/vanilla/demos).

## Install

```sh
npm install @mochart/editor
```

The bundled stylesheet ships as a subpath export:

```js
import '@mochart/editor/editor.css';
```

CodeMirror is a substantial dependency, so the demos load the package
through a dynamic `import()` — it makes a natural code-split point.

## Creating an editor

```js
import { createJsonEditor, createMochartConfigSupport } from '@mochart/editor';
import '@mochart/editor/editor.css';

const editor = createJsonEditor(host, {
  value: JSON.stringify(config, null, 2),
  ariaLabel: 'Chart config JSON',
  support: createMochartConfigSupport(),
  onChange(value) {
    // keep application state in control of the current text
  },
  onDiagnostics(diagnostics) {
    // JSON syntax and Mochart validation problems
  }
});
```

`createJsonEditor` appends a `.mochart-editor` element into `host` and
returns a handle. The `JsonEditorOptions` worth knowing beyond the example:
`readOnly` and `lineNumbers` toggle those behaviors, `indentation` sets what
`format()` inserts (two spaces by default), `theme` picks the initial color
treatment, and `ariaDescribedBy` links the editable element to help text.
`support` accepts one `JsonEditorSupport` or an array of them.

## The handle

The returned `JsonEditorHandle` drives the editor imperatively:

- `getValue()` / `setValue(value)` — read and replace the document.
  Controlled `setValue` updates do not fire `onChange`; only user edits and
  `format()` do.
- `format()` — pretty-print the current JSON; returns `false` (leaving the
  text alone) when it does not parse.
- `setTheme('light' | 'dark')` — switch the color treatment without
  replacing the document or its undo history.
- `setReadOnly(readOnly)` — toggle editing.
- `focus()` and `showFocusRange(from, to)` — move keyboard focus into the
  editor, optionally selecting and revealing a source range (pair it with
  diagnostic offsets to jump to a problem).
- `destroy()` — tear down the editor and remove its element.

## Mochart config intelligence

`createMochartConfigSupport()` adds the config-aware layer: completions for
top-level sections and nested properties (typing `"` at a property position
offers everything the containing object accepts), enum and boolean value
completions, configured-id completions for reference properties like a
series' `axis`, and hover documentation with each property's description,
rules, and default. It is generated from the same model as this site's
[config reference](/reference/), exported as `mochartConfigEditorModel`
for tooling that wants the raw model.

## Diagnostics

Both the built-in JSON syntax layer and the Mochart support report through
`onDiagnostics` as `JsonEditorDiagnostic` objects: `from`/`to` document
offsets, a `severity` (`JsonEditorSeverity`: `error`, `warning`, `info`, or
`hint`), the `message`, a `source` of `'json'` or `'mochart'`, and — for
Mochart validation problems — the config `path` (a `JsonPath`) the message
is about. Unknown config properties are underlined on the offending key
itself. The editable element's `aria-invalid` tracks whether any errors are
present, and the editor's border reflects it visually.

## Theming

Pass `theme: 'dark'` for the bundled dark treatment and switch later with
`setTheme`. Both themes read CSS custom properties from `.mochart-editor`
(`--mochart-editor-background`, `--mochart-editor-foreground`,
`--mochart-editor-border`, `--mochart-editor-focus`,
`--mochart-editor-gutter`), so a host page can restyle the surface without
touching the stylesheet.
