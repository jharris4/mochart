import { basicSetup } from 'codemirror';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { linter, type Diagnostic } from '@codemirror/lint';
import type { JsonEditorDiagnostic, JsonEditorHandle, JsonEditorOptions } from './types.js';
import { supportImplementation } from './support.js';

function publicDiagnostic(diagnostic: Diagnostic): JsonEditorDiagnostic {
  const source = diagnostic.source === 'mochart' ? 'mochart' : 'json';
  return {
    from: diagnostic.from,
    to: diagnostic.to,
    severity: diagnostic.severity,
    message: diagnostic.message,
    source,
    ...(('path' in diagnostic && Array.isArray(diagnostic.path)) ? { path: diagnostic.path } : {})
  };
}

/** Mount a strict JSON editor into `host` and return its imperative handle. */
export function createJsonEditor(host: HTMLElement, options: JsonEditorOptions): JsonEditorHandle {
  const indentation = options.indentation ?? 2;
  const supports = options.support ? (Array.isArray(options.support) ? options.support : [options.support]) : [];
  const implementations = supports.map(supportImplementation);
  const readOnly = new Compartment();
  let externalUpdate = false;

  const syntaxLinter = jsonParseLinter();
  const diagnosticsExtension = linter(view => {
    const diagnostics = syntaxLinter(view);
    if (diagnostics.length === 0) {
      for (const implementation of implementations) {
        if (implementation.diagnostics) diagnostics.push(...implementation.diagnostics(view));
      }
    }
    options.onDiagnostics?.(diagnostics.map(publicDiagnostic));
    return diagnostics;
  }, { delay: 250 });

  const element = document.createElement('div');
  element.className = 'mochart-editor';
  host.appendChild(element);

  const extensions = [
    basicSetup,
    json(),
    diagnosticsExtension,
    readOnly.of(EditorState.readOnly.of(options.readOnly === true)),
    EditorView.contentAttributes.of({ 'aria-label': options.ariaLabel, spellcheck: 'false' }),
    EditorView.updateListener.of(update => {
      if (update.docChanged && !externalUpdate) options.onChange?.(update.state.doc.toString());
    }),
    EditorView.theme({
      '&': { height: '100%' },
      '.cm-scroller': { overflow: 'auto' },
      '.cm-content': { minHeight: '100%' }
    }),
    ...implementations.flatMap(implementation => implementation.extensions)
  ];
  if (options.lineNumbers === false) {
    // basicSetup includes a gutter; hide it without disabling folding/search.
    extensions.push(EditorView.theme({ '.cm-gutters': { display: 'none' } }));
  }

  const view = new EditorView({
    parent: element,
    state: EditorState.create({ doc: options.value ?? '', extensions })
  });

  return {
    element,
    getValue: () => view.state.doc.toString(),
    setValue(value: string) {
      if (value === view.state.doc.toString()) return;
      externalUpdate = true;
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
      externalUpdate = false;
    },
    setReadOnly(value: boolean) {
      view.dispatch({ effects: readOnly.reconfigure(EditorState.readOnly.of(value)) });
    },
    focus: () => view.focus(),
    format() {
      try {
        const parsed: unknown = JSON.parse(view.state.doc.toString());
        const formatted = JSON.stringify(parsed, null, indentation);
        externalUpdate = true;
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: formatted } });
        externalUpdate = false;
        options.onChange?.(formatted);
        return true;
      }
      catch {
        return false;
      }
    },
    destroy() {
      view.destroy();
      element.remove();
    }
  };
}
