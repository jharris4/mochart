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
    expect(labels(options)).toContain('chart');
    expect(labels(options)).not.toContain('version');
    expect(options.find(option => option.label === 'chart')?.apply).toBe('"chart": {}');
  });

  it('suggests nested properties instead of section properties', async () => {
    const options = await completionOptions('{"chart":{"margin":{"|": 0}}}');
    expect(labels(options)).toEqual(expect.arrayContaining(['top', 'right', 'bottom', 'left']));
    expect(labels(options)).not.toContain('type');
  });

  it('suggests enum values', async () => {
    const options = await completionOptions('{"chart":{"type":"|"}}');
    expect(labels(options)).toEqual(expect.arrayContaining(['"xy"', '"pie"']));
  });

  it('suggests configured ids and filters common references', async () => {
    const options = await completionOptions(`{
      "version": "1.0.0",
      "categoryAxis": { "property": "month" },
      "valueAxes": [{ "id": "A" }, { "id": "B" }],
      "seriesStacks": [{ "id": "stack-a", "axis": "A" }, { "id": "stack-b", "axis": "B" }],
      "series": [{ "property": "revenue", "axis": "A", "stack": "|" }]
    }`);
    expect(labels(options)).toContain('"stack-a"');
    expect(labels(options)).not.toContain('"stack-b"');
  });
});

describe('Mochart support hover documentation', () => {
  it('shows property documentation, rules, and defaults', () => {
    const source = '{"chart":{"type":"xy"}}';
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
      "categoryAxis": { "property": "month" },
      "series": [{ "property": "revenue", "axis": "missing" }]
    }`;
    const view = viewFor(source);
    const diagnostics = mochartSupportTesting.semanticDiagnostics(view);
    const diagnostic = diagnostics.find(item => item.message.includes('valueAxes')) as
      (typeof diagnostics)[number] & { path?: (string | number)[] };

    expect(diagnostic).toBeDefined();
    expect(diagnostic.path).toEqual(['series', 0, 'axis']);
    expect(source.slice(diagnostic.from, diagnostic.to)).toBe('"missing"');
    expect(diagnostic.severity).toBe('error');
    expect(diagnostic.source).toBe('mochart');
  });

  // Regression: these mid-edit states threw inside getDefaults; the exception
  // escaped the linter and silently froze diagnostics on the previous pass.
  it('reports errors instead of throwing on junk section shapes', () => {
    for (const source of ['{"seriesStacks": 5}', '{"seriesStacks": [null]}']) {
      const view = viewFor(source);
      let diagnostics: ReturnType<typeof mochartSupportTesting.semanticDiagnostics> = [];
      expect(() => { diagnostics = mochartSupportTesting.semanticDiagnostics(view); }).not.toThrow();
      expect(diagnostics.some(item => item.severity === 'error')).toBe(true);
    }
  });
});

// Regression: completions inside an all-config object offered id/order, which
// validation immediately rejects as unique properties.
describe('all-config completions', () => {
  it('omits unique keys inside an all config but keeps them in entries', async () => {
    const allOptions = await completionOptions('{"seriesDefaults": {"|": null}}');
    expect(labels(allOptions)).toContain('renderer');
    expect(labels(allOptions)).not.toContain('id');
    expect(labels(allOptions)).not.toContain('order');

    const entryOptions = await completionOptions('{"series": [{"|": null}]}');
    expect(labels(entryOptions)).toContain('id');
    expect(labels(entryOptions)).toContain('order');
  });
});

// Regression: the property-position fallback scanned raw text, so a comma
// inside a string value made completions insert a property with no separating
// comma, producing invalid JSON.
describe('completions after a comma-containing string value', () => {
  it('does not offer property-name completions right after the value', async () => {
    const withComma = await completionOptions('{"title": {"text": "Sales, weekly" |}}');
    expect(labels(withComma)).not.toContain('align');

    const afterComma = await completionOptions('{"title": {"text": "Sales, weekly", |}}');
    expect(labels(afterComma)).toContain('align');
  });
});
