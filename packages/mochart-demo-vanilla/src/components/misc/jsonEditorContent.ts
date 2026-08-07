import type { JsonEditorHandle, JsonEditorSupport } from '@mochart/editor';

import { el } from './dom';

type EditorModule = typeof import('@mochart/editor');

export interface JsonEditorContentOptions {
  value: string;
  ariaLabel: string;
  /** Built from the lazily imported module so support code stays in the editor chunk. */
  support?: (editor: EditorModule) => JsonEditorSupport | JsonEditorSupport[];
  onChange: (value: string) => void;
}

export interface JsonEditorContentHandle {
  el: HTMLElement;
  getValue(): string;
  setValue(value: string): void;
  /** Pretty-print the current JSON; returns false (and leaves the text alone) when it doesn't parse. */
  format(): boolean;
  destroy(): void;
}

// Programmatic values are shown pre-formatted; user-typed text is never reformatted.
function formatJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  }
  catch {
    return text;
  }
}

/** CodeMirror-backed drop-in for `textAreaContent`; loads @mochart/editor lazily to keep it out of the main chunk. */
export function jsonEditorContent(options: JsonEditorContentOptions): JsonEditorContentHandle {
  const container = el('div', { className: 'text-area-content' });
  const isDark = () => document.documentElement.classList.contains('dark');
  let value = formatJson(options.value);
  let editor: JsonEditorHandle | null = null;
  let themeObserver: MutationObserver | null = null;
  let destroyed = false;

  import('@mochart/editor').then(module => {
    if (destroyed) {
      return;
    }
    editor = module.createJsonEditor(container, {
      value,
      ariaLabel: options.ariaLabel,
      theme: isDark() ? 'dark' : 'light',
      support: options.support?.(module),
      onChange: options.onChange
    });
    // Follow the site theme off <html>'s dark class: ModeSwitcher's ThemeController only notifies its own listeners.
    themeObserver = new MutationObserver(() => editor?.setTheme(isDark() ? 'dark' : 'light'));
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }, (error: unknown) => console.error('failed to load @mochart/editor', error));

  return {
    el: container,
    getValue: () => editor ? editor.getValue() : value,
    setValue(nextValue: string) {
      value = formatJson(nextValue);
      editor?.setValue(value);
    },
    format() {
      if (editor) {
        return editor.format();
      }
      try {
        value = JSON.stringify(JSON.parse(value), null, 2);
        return true;
      }
      catch {
        return false;
      }
    },
    destroy() {
      destroyed = true;
      themeObserver?.disconnect();
      editor?.destroy();
    }
  };
}
