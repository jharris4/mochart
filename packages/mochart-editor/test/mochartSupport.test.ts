import { CompletionContext, type Completion, type CompletionResult } from '@codemirror/autocomplete';
import { json } from '@codemirror/lang-json';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { afterEach, describe, expect, it } from 'vitest';
import { mochartSupportTesting } from '../src/mochartSupport';

const views: EditorView[] = [];

afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
  document.body.replaceChildren();
});

function markedState(markedSource: string) {
  const position = markedSource.indexOf('|');
  if (position < 0) throw new Error('Test source must contain a | cursor marker');
  const source = markedSource.slice(0, position) + markedSource.slice(position + 1);
  return {
    source,
    position,
    state: EditorState.create({ doc: source, extensions: [json()] })
  };
}

async function completionOptions(markedSource: string): Promise<readonly Completion[]> {
  const { state, position } = markedState(markedSource);
  const result = await Promise.resolve(
    mochartSupportTesting.completionSource(new CompletionContext(state, position, true))
  ) as CompletionResult | null;
  return result?.options ?? [];
}

function labels(options: readonly Completion[]) {
  return options.map(option => option.label);
}

function viewFor(source: string) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const view = new EditorView({
    parent: host,
    state: EditorState.create({ doc: source, extensions: [json()] })
  });
  views.push(view);
  return view;
}

describe('Mochart support completions', () => {
  it('suggests missing top-level properties with strict-JSON insertions', async () => {
    const options = await completionOptions('{"|": null, "version": "1.0.0"}');
    expect(labels(options)).toContain('chartConfig');
    expect(labels(options)).not.toContain('version');
    expect(options.find(option => option.label === 'chartConfig')?.apply).toBe('"chartConfig": {}');
  });

  it('suggests nested properties instead of section properties', async () => {
    const options = await completionOptions('{"chartConfig":{"margin":{"|": 0}}}');
    expect(labels(options)).toEqual(expect.arrayContaining(['top', 'right', 'bottom', 'left']));
    expect(labels(options)).not.toContain('type');
  });

  it('suggests enum values', async () => {
    const options = await completionOptions('{"chartConfig":{"type":"|"}}');
    expect(labels(options)).toEqual(expect.arrayContaining(['"xy"', '"pie"']));
  });

  it('suggests configured ids and filters common references', async () => {
    const options = await completionOptions(`{
      "version": "1.0.0",
      "groupAxisConfig": { "property": "month" },
      "seriesAxisConfigs": [{ "id": "A" }, { "id": "B" }],
      "seriesStackConfigs": [{ "id": "stack-a", "axis": "A" }, { "id": "stack-b", "axis": "B" }],
      "seriesConfigs": [{ "property": "revenue", "axis": "A", "stack": "|" }]
    }`);
    expect(labels(options)).toContain('"stack-a"');
    expect(labels(options)).not.toContain('"stack-b"');
  });
});

describe('Mochart support hover documentation', () => {
  it('shows property documentation, rules, and defaults', () => {
    const source = '{"chartConfig":{"type":"xy"}}';
    const view = viewFor(source);
    const tooltip = mochartSupportTesting.hoverSource(view, source.indexOf('"type"') + 2);
    expect(tooltip).not.toBeNull();
    const text = tooltip!.create().dom.textContent;
    expect(text).toContain('type');
    expect(text).toContain('type of chart to render');
    expect(text).toContain('Rules:');
    expect(text).toContain('Default: "xy"');
  });
});

describe('Mochart support diagnostics', () => {
  it('maps semantic diagnostics to the relevant JSON value', () => {
    const source = `{
      "version": "1.0.0",
      "groupAxisConfig": { "property": "month" },
      "seriesConfigs": [{ "property": "revenue", "axis": "missing" }]
    }`;
    const view = viewFor(source);
    const diagnostics = mochartSupportTesting.semanticDiagnostics(view);
    const diagnostic = diagnostics.find(item => item.message.includes('seriesAxisConfigs')) as
      (typeof diagnostics)[number] & { path?: (string | number)[] };

    expect(diagnostic).toBeDefined();
    expect(diagnostic.path).toEqual(['seriesConfigs', 0, 'axis']);
    expect(source.slice(diagnostic.from, diagnostic.to)).toBe('"missing"');
    expect(diagnostic.severity).toBe('error');
    expect(diagnostic.source).toBe('mochart');
  });

  // Regression: these mid-edit states threw inside getDefaults; the exception
  // escaped the linter and silently froze diagnostics on the previous pass.
  it('reports errors instead of throwing on junk section shapes', () => {
    for (const source of ['{"seriesStackConfigs": 5}', '{"seriesStackConfigs": [null]}']) {
      const view = viewFor(source);
      let diagnostics: ReturnType<typeof mochartSupportTesting.semanticDiagnostics> = [];
      expect(() => { diagnostics = mochartSupportTesting.semanticDiagnostics(view); }).not.toThrow();
      expect(diagnostics.some(item => item.severity === 'error')).toBe(true);
    }
  });
});
