// The `.svelte.test.ts` name lets the svelte plugin compile this file so the
// `$state` rune is available for driving prop updates.
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import { enhanceConfig, ArrayOfObjectsDataProvider } from '@mochart/core';
import { Chart, DefaultChart } from '../src/index';
import Loading from './Loading.svelte';
import ConfigError from './ConfigError.svelte';

beforeAll(() => {
  // jsdom has no SVG layout engine; return zero sizes so the library takes its
  // documented default-bounds fallbacks (same shims as the golden tests).
  const svgProto = globalThis.SVGElement.prototype as any;
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

function target() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

describe('Chart', () => {
  it('mounts an svg chart, applies prop updates, and cleans up on unmount', () => {
    const el = target();
    const mochartConfig = enhanceConfig(rawConfig());
    expect(mochartConfig.validation.valid).toBe(true);
    const props = $state({
      mochartConfig,
      dataProvider: new ArrayOfObjectsDataProvider(rows, 'name'),
      width: 400,
      height: 300
    });

    const instance = mount(Chart, { target: el, props });
    flushSync();
    const svg = el.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('width')).toBe('400');
    expect(svg!.getAttribute('height')).toBe('300');
    expect(el.textContent).toContain('Test Chart');

    props.width = 500;
    flushSync();
    expect(el.querySelector('svg')!.getAttribute('width')).toBe('500');

    void unmount(instance);
    flushSync();
    expect(el.querySelector('svg')).toBeNull();
    el.remove();
  });
});

describe('Chart auto-sizing', () => {
  it('tracks the container size when width/height are omitted', () => {
    const observed: Array<{ callback: ResizeObserverCallback }> = [];
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
    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
    const widthSpy = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(320);
    const heightSpy = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(240);
    try {
      const el = target();
      const props = $state({ config: rawConfig(), data: rows });
      const instance = mount(DefaultChart, { target: el, props });
      flushSync();
      const svg = el.querySelector('svg');
      expect(svg!.getAttribute('width')).toBe('320');
      expect(svg!.getAttribute('height')).toBe('240');

      widthSpy.mockReturnValue(500);
      heightSpy.mockReturnValue(400);
      for (const { callback } of observed) {
        callback([], undefined as unknown as ResizeObserver);
      }
      expect(svg!.getAttribute('width')).toBe('500');
      expect(svg!.getAttribute('height')).toBe('400');

      void unmount(instance);
      el.remove();
    } finally {
      widthSpy.mockRestore();
      heightSpy.mockRestore();
      delete (globalThis as any).ResizeObserver;
    }
  });
});

describe('placeholder components', () => {
  it('renders loadingComponent with the chart context, updates it, and removes it', () => {
    const el = target();
    const props = $state({
      mochartConfig: null as any,
      dataProvider: null as any,
      loading: true,
      loadingComponent: Loading,
      width: 400,
      height: 300
    });

    const instance = mount(Chart, { target: el, props });
    flushSync();
    expect(el.textContent).toContain('Loading 400x300');

    props.width = 500;
    flushSync();
    expect(el.textContent).toContain('Loading 500x300');

    props.loading = false;
    flushSync();
    expect(el.textContent).not.toContain('Loading');

    void unmount(instance);
    flushSync();
    el.remove();
  });

  it('renders configErrorComponent when the config fails validation', () => {
    const el = target();
    const mochartConfig = enhanceConfig({ ...rawConfig(), unknownExtra: 1 });
    expect(mochartConfig.validation.valid).toBe(false);

    const instance = mount(Chart, {
      target: el,
      props: {
        mochartConfig,
        dataProvider: new ArrayOfObjectsDataProvider(rows, 'name'),
        configErrorComponent: ConfigError,
        width: 400,
        height: 300
      }
    });
    flushSync();
    expect(el.textContent).toContain('Bad config 400x300');

    void unmount(instance);
    flushSync();
    el.remove();
  });
});

describe('DefaultChart', () => {
  it('enhances a raw config, renders data rows as bars, and updates on data change', () => {
    const el = target();
    const props = $state({
      config: rawConfig(),
      data: rows,
      width: 400,
      height: 300
    });

    const instance = mount(DefaultChart, { target: el, props });
    flushSync();
    expect(el.querySelector('svg')).not.toBeNull();
    expect(el.textContent).toContain('Test Chart');
    expect(el.textContent).not.toContain('D');

    props.data = [...rows, { name: 'D', value: 40 }];
    flushSync();
    expect(el.textContent).toContain('D');

    void unmount(instance);
    flushSync();
    expect(el.querySelector('svg')).toBeNull();
    el.remove();
  });

  it('accepts the loading prop and renders loadingComponent over the chart', () => {
    const el = target();
    const props = $state({
      config: rawConfig(),
      data: rows,
      loading: true,
      loadingComponent: Loading,
      width: 400,
      height: 300
    });

    const instance = mount(DefaultChart, { target: el, props });
    flushSync();
    // the loading overlay factory receives the plot-area bounds, not the outer size
    expect(el.textContent).toContain('Loading');

    props.loading = false;
    flushSync();
    expect(el.textContent).not.toContain('Loading');

    void unmount(instance);
    flushSync();
    el.remove();
  });
});

// Regression: a prop deleted from the spread never reached the chart, so the
// previous value survived every later update.
describe('removed props', () => {
  it('clears the loading state when the prop is deleted', () => {
    const el = target();
    const mochartConfig = enhanceConfig(rawConfig());
    const props: { mochartConfig: any; dataProvider: any; loading?: boolean; width: number; height: number } = $state({
      mochartConfig,
      dataProvider: new ArrayOfObjectsDataProvider(rows, 'name'),
      loading: true,
      width: 400,
      height: 300
    });
    const instance = mount(Chart, { target: el, props });
    flushSync();
    expect(el.querySelector('.mochart-loading')).not.toBeNull();

    delete props.loading;
    flushSync();
    expect(el.querySelector('.mochart-loading')).toBeNull();
    expect(el.querySelector('svg')).not.toBeNull();

    void unmount(instance);
    el.remove();
  });
});

describe('refresh', () => {
  it('re-reads in-place data mutations through the instance method', () => {
    const el = target();
    const data = [...rows];
    const component = mount(DefaultChart, { target: el, props: { config: rawConfig(), data, width: 400, height: 300 } });
    flushSync();
    expect(el.textContent).toContain('C');
    expect(el.textContent).not.toContain('D');

    data.push({ name: 'D', value: 40 });
    (component as { refresh(): void }).refresh();
    expect(el.textContent).toContain('D');
    void unmount(component);
  });
});
