import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { Diagnostic } from '@codemirror/lint';
import type { JsonEditorSupport } from './types.js';

interface SupportImplementation {
  extensions: Extension[];
  diagnostics?: (view: EditorView) => Diagnostic[];
}

const implementations = new WeakMap<JsonEditorSupport, SupportImplementation>();

export function defineSupport(name: string, implementation: SupportImplementation): JsonEditorSupport {
  const support = Object.freeze({ name });
  implementations.set(support, implementation);
  return support;
}

export function supportImplementation(support: JsonEditorSupport): SupportImplementation {
  const implementation = implementations.get(support);
  if (!implementation) throw new Error(`Unknown JSON editor support: ${support.name}`);
  return implementation;
}
