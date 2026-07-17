import { describe, it, expect, beforeAll, vi } from 'vitest';
import { createApp, defineComponent, h, markRaw, nextTick, reactive } from 'vue';
import type { App } from 'vue';
import { enhanceConfig, ArrayOfObjectsDataProvider } from 'mochart';
import { Chart, DefaultChart } from '../src/index';

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
    version: '1.0.3',
    titleConfig: { title: 'Test Chart' },
    groupAxisConfig: { property: 'name', type: 'string', scale: 'ordinal' },
    seriesAllConfig: { renderer: 'bar' },
    seriesConfigs: [{ property: 'value', title: 'Value' }],
    animationConfig: { animate: false }
  };
}

const rows = [
  { name: 'A', value: 10 },
  { name: 'B', value: 20 },
  { name: 'C', value: 30 }
];

function mountWith(component: any, props: Record<string, any>): { el: HTMLDivElement; app: App; state: Record<string, any> } {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const state = reactive({ ...props });
  const app = createApp({ render: () => h(component, { ...state }) });
  app.mount(el);
  return { el, app, state };
}

describe('Chart', () => {
  it('mounts an svg chart, applies prop updates, and cleans up on unmount', async () => {
    const mochartConfig = enhanceConfig(rawConfig());
    expect(mochartConfig.validation.valid).toBe(true);
    const { el, app, state } = mountWith(Chart, {
      mochartConfig,
      dataProvider: new ArrayOfObjectsDataProvider(rows, 'name'),
      width: 400,
      height: 300
    });

    const svg = el.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('width')).toBe('400');
    expect(svg!.getAttribute('height')).toBe('300');
    expect(el.textContent).toContain('Test Chart');

    state.width = 500;
    await nextTick();
    expect(el.querySelector('svg')!.getAttribute('width')).toBe('500');

    app.unmount();
    expect(el.querySelector('svg')).toBeNull();
    el.remove();
  });
});

describe('Chart auto-sizing', () => {
  it('tracks the container size when width/height are omitted', () => {
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
    const rectSpy = vi
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockReturnValue({ width: 320.7, height: 240.2 } as DOMRect);
    try {
      const { el, app } = mountWith(DefaultChart, { config: rawConfig(), data: rows });
      const svg = el.querySelector('svg');
      expect(svg!.getAttribute('width')).toBe('320');
      expect(svg!.getAttribute('height')).toBe('240');

      rectSpy.mockReturnValue({ width: 500, height: 400 } as DOMRect);
      for (const { callback } of observed) {
        callback([], undefined as any);
      }
      expect(svg!.getAttribute('width')).toBe('500');
      expect(svg!.getAttribute('height')).toBe('400');

      app.unmount();
      el.remove();
    } finally {
      rectSpy.mockRestore();
      delete (globalThis as any).ResizeObserver;
    }
  });
});

describe('placeholder components', () => {
  it('renders loadingComponent with the chart context, updates it, and removes it', async () => {
    const Loading = markRaw(
      defineComponent({
        name: 'Loading',
        props: { width: Number, height: Number },
        setup: (props) => () => h('div', `Loading ${props.width}x${props.height}`)
      })
    );
    const { el, app, state } = mountWith(Chart, {
      mochartConfig: null,
      dataProvider: null,
      loading: true,
      loadingComponent: Loading,
      width: 400,
      height: 300
    });

    expect(el.textContent).toContain('Loading 400x300');

    state.width = 500;
    await nextTick();
    expect(el.textContent).toContain('Loading 500x300');

    state.loading = false;
    await nextTick();
    expect(el.textContent).not.toContain('Loading');

    app.unmount();
    el.remove();
  });
});

describe('DefaultChart', () => {
  it('enhances a raw config, renders data rows as bars, and updates on data change', async () => {
    const { el, app, state } = mountWith(DefaultChart, {
      config: rawConfig(),
      data: rows,
      width: 400,
      height: 300
    });

    expect(el.querySelector('svg')).not.toBeNull();
    expect(el.textContent).toContain('Test Chart');
    expect(el.textContent).not.toContain('D');

    state.data = [...rows, { name: 'D', value: 40 }];
    await nextTick();
    expect(el.textContent).toContain('D');

    app.unmount();
    expect(el.querySelector('svg')).toBeNull();
    el.remove();
  });
});
