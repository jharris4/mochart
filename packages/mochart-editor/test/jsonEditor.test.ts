import { describe, expect, it, vi } from 'vitest';
import { createJsonEditor } from '../src';

describe('JSON editor', () => {
  it('supports controlled updates, formatting, and cleanup', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const onChange = vi.fn();
    const editor = createJsonEditor(host, {
      value: '{"answer":42}',
      ariaLabel: 'Configuration',
      onChange
    });

    expect(editor.getValue()).toBe('{"answer":42}');
    expect(editor.format()).toBe(true);
    expect(editor.getValue()).toBe('{\n  "answer": 42\n}');
    expect(onChange).toHaveBeenLastCalledWith('{\n  "answer": 42\n}');

    onChange.mockClear();
    editor.setValue('{"external":true}');
    expect(editor.getValue()).toBe('{"external":true}');
    expect(onChange).not.toHaveBeenCalled();

    editor.destroy();
    expect(host.children).toHaveLength(0);
    host.remove();
  });

  it('leaves invalid JSON unchanged when formatting', () => {
    const host = document.createElement('div');
    const editor = createJsonEditor(host, { value: '{', ariaLabel: 'Configuration' });
    expect(editor.format()).toBe(false);
    expect(editor.getValue()).toBe('{');
    editor.destroy();
  });
});
