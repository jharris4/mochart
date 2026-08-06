import { describe, it, expect, beforeAll, vi } from 'vitest';
import { html, nothing, render } from 'lit-html';
import { enhanceConfig, ArrayOfObjectsDataProvider } from '@mochart/core';
import { chart, defaultChart } from '../src/index';
import type { ChartRef, PlaceholderProps } from '../src/index';

beforeAll(() => {
  // jsdom has no SVG layout engine; return zero sizes so the library takes its
  // documented default-bounds fallbacks (same shims as the golden tests).
  const svgProto = (globalThis as any).SVGElement.prototype;
  if (typeof svgProto.getComputedTextLength !== 'function') {
    svgProto.getComputedTextLength = () => 0;
  }
  if (typeof svgProto.getSubStringLength !== 'function') {
    svgProto.getSubStringLength = () => 0;
  }
  if (typeof svgProto.getBBox !== 'function') {
    svgProto.getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 });
  }
});

function rawConfig(): any {
  return {
    version: '1.0.0',
    title: { text: 'Test Chart' },
    categoryAxis: { property: 'name', type: 'string', scale: 'ordinal' },
    seriesDefaults: { renderer: 'bar' },
    series: [{ property: 'value', title: 'Value' }],
    animation: { animate: false }
  };
}

const rows = [
  { name: 'A', value: 10 },
  { name: 'B', value: 20 },
  { name: 'C', value: 30 }
];

function mountPoint(): HTMLDivElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

// The directives mount their chart in a microtask after the render pass (so
// the container is connected before the initial measurement); flush it.
async function flushMount(): Promise<void> {
  await Promise.resolve();
}

describe('chart', () => {
  it('mounts an svg chart, applies prop updates, and cleans up on unmount', async () => {
    const mochartConfig = enhanceConfig(rawConfig());
    expect(mochartConfig.validation.valid).toBe(true);
    const dataProvider = new ArrayOfObjectsDataProvider(rows, 'name');
    const el = mountPoint();
    const template = (width: number) => html`${chart({ mochartConfig, dataProvider, width, height: 300 })}`;

    render(template(400), el);
    await flushMount();

    const svg = el.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('width')).toBe('400');
    expect(svg!.getAttribute('height')).toBe('300');
    expect(el.textContent).toContain('Test Chart');

    render(template(500), el);
    expect(el.querySelector('svg')!.getAttribute('width')).toBe('500');

    render(nothing, el);
    expect(el.querySelector('svg')).toBeNull();
    el.remove();
  });
});

describe('chart container props', () => {
  it('applies className and style to the container div, with size props winning', async () => {
    const mochartConfig = enhanceConfig(rawConfig());
    const dataProvider = new ArrayOfObjectsDataProvider(rows, 'name');
    const el = mountPoint();
    render(
      html`${chart({ mochartConfig, dataProvider, className: 'my-chart', style: 'flex: 1 1 auto; width: 50px;', width: 400, height: 300 })}`,
      el
    );
    await flushMount();

    const container = el.querySelector('div.my-chart') as HTMLDivElement;
    expect(container).not.toBeNull();
    expect(container.style.flex).toBe('1 1 auto');
    expect(container.style.width).toBe('400px');
    expect(container.style.height).toBe('300px');

    render(nothing, el);
    el.remove();
  });
});

describe('chart auto-sizing', () => {
  it('tracks the container size when width/height are omitted', async () => {
    const observed: { callback: ResizeObserverCallback }[] = [];
    class FakeResizeObserver {
      callback: ResizeObserverCallback;
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }
      observe() {
        observed.push({ callback: this.callback });
      }
      disconnect() {}
      unobserve() {}
    }
    (globalThis as any).ResizeObserver = FakeResizeObserver;
    const widthSpy = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(320);
    const heightSpy = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(240);
    try {
      const el = mountPoint();
      render(html`${defaultChart({ config: rawConfig(), data: rows })}`, el);
      await flushMount();

      const svg = el.querySelector('svg');
      expect(svg!.getAttribute('width')).toBe('320');
      expect(svg!.getAttribute('height')).toBe('240');

      widthSpy.mockReturnValue(500);
      heightSpy.mockReturnValue(400);
      for (const { callback } of observed) {
        callback([], undefined as any);
      }
      expect(svg!.getAttribute('width')).toBe('500');
      expect(svg!.getAttribute('height')).toBe('400');

      render(nothing, el);
      el.remove();
    } finally {
      widthSpy.mockRestore();
      heightSpy.mockRestore();
      delete (globalThis as any).ResizeObserver;
    }
  });
});

describe('placeholder templates', () => {
  it('renders loadingTemplate with the chart context, updates it, and removes it', async () => {
    const loadingTemplate = ({ width, height }: PlaceholderProps) => html`<div>Loading ${width}x${height}</div>`;
    const el = mountPoint();
    const template = (width: number, loading: boolean) =>
      html`${chart({ mochartConfig: null, dataProvider: null, loading, loadingTemplate, width, height: 300 })}`;

    render(template(400, true), el);
    await flushMount();
    expect(el.textContent).toContain('Loading 400x300');

    render(template(500, true), el);
    expect(el.textContent).toContain('Loading 500x300');

    render(template(500, false), el);
    expect(el.textContent).not.toContain('Loading');

    render(nothing, el);
    el.remove();
  });

  it('renders configErrorTemplate when the config fails validation', async () => {
    const mochartConfig = enhanceConfig({ ...rawConfig(), unknownExtra: 1 });
    expect(mochartConfig.validation.valid).toBe(false);
    const configErrorTemplate = ({ width, height }: PlaceholderProps) => html`<div>Bad config ${width}x${height}</div>`;
    const el = mountPoint();
    render(
      html`${chart({
        mochartConfig,
        dataProvider: new ArrayOfObjectsDataProvider(rows, 'name'),
        configErrorTemplate,
        width: 400,
        height: 300
      })}`,
      el
    );
    await flushMount();

    expect(el.textContent).toContain('Bad config 400x300');

    render(nothing, el);
    el.remove();
  });
});

describe('defaultChart', () => {
  it('enhances a raw config, renders data rows as bars, and updates on data change', async () => {
    const el = mountPoint();
    const template = (data: any[]) => html`${defaultChart({ config: rawConfig(), data, width: 400, height: 300 })}`;

    render(template(rows), el);
    await flushMount();

    expect(el.querySelector('svg')).not.toBeNull();
    expect(el.textContent).toContain('Test Chart');
    expect(el.textContent).not.toContain('D');

    render(template([...rows, { name: 'D', value: 40 }]), el);
    expect(el.textContent).toContain('D');

    render(nothing, el);
    expect(el.querySelector('svg')).toBeNull();
    el.remove();
  });

  it('accepts the loading prop and renders loadingTemplate over the chart', async () => {
    const loadingTemplate = () => html`<div>Loading</div>`;
    const el = mountPoint();
    const template = (loading: boolean) =>
      html`${defaultChart({ config: rawConfig(), data: rows, loading, loadingTemplate, width: 400, height: 300 })}`;

    render(template(true), el);
    await flushMount();

    // the loading overlay factory receives the plot-area bounds, not the outer size
    expect(el.textContent).toContain('Loading');

    render(template(false), el);
    expect(el.textContent).not.toContain('Loading');

    render(nothing, el);
    el.remove();
  });
});

// Regression: a prop absent from the next render kept its previous value.
describe('removed props', () => {
  it('clears the loading state when the prop is removed', async () => {
    const mochartConfig = enhanceConfig(rawConfig());
    const dataProvider = new ArrayOfObjectsDataProvider(rows, 'name');
    const el = mountPoint();
    const template = (extra: Record<string, unknown>) =>
      html`${chart({ mochartConfig, dataProvider, width: 400, height: 300, ...extra })}`;

    render(template({ loading: true }), el);
    await flushMount();
    expect(el.querySelector('.mochart-loading')).not.toBeNull();

    render(template({}), el);
    expect(el.querySelector('.mochart-loading')).toBeNull();
    expect(el.querySelector('svg')).not.toBeNull();

    render(nothing, el);
    el.remove();
  });
});

describe('refresh', () => {
  it('re-reads in-place data mutations through the chartRef handle', async () => {
    const el = mountPoint();
    const data = [...rows];
    let handle: ChartRef | null = null;
    render(html`${defaultChart({ config: rawConfig(), data, width: 400, height: 300, chartRef: (chartRefValue) => { handle = chartRefValue; } })}`, el);
    await flushMount();
    expect(handle).not.toBeNull();
    expect(el.textContent).toContain('C');
    expect(el.textContent).not.toContain('D');

    data.push({ name: 'D', value: 40 });
    handle!.refresh();
    expect(el.textContent).toContain('D');
  });
});
