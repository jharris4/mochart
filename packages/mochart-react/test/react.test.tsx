import { describe, it, expect, beforeAll, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { enhanceConfig, ArrayOfObjectsDataProvider } from 'mochart';
import { Chart, DefaultChart } from '../src/index';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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

function host(): { container: HTMLDivElement; root: Root } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return { container, root: createRoot(container) };
}

describe('Chart', () => {
  it('mounts an svg chart, applies prop updates, and cleans up on unmount', () => {
    const { container, root } = host();
    const mochartConfig = enhanceConfig(rawConfig());
    expect(mochartConfig.validation.valid).toBe(true);
    const dataProvider = new ArrayOfObjectsDataProvider(rows, 'name');

    act(() => {
      root.render(<Chart mochartConfig={mochartConfig} dataProvider={dataProvider} width={400} height={300} />);
    });
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('width')).toBe('400');
    expect(svg!.getAttribute('height')).toBe('300');
    expect(container.textContent).toContain('Test Chart');

    act(() => {
      root.render(<Chart mochartConfig={mochartConfig} dataProvider={dataProvider} width={500} height={300} />);
    });
    expect(container.querySelector('svg')!.getAttribute('width')).toBe('500');

    act(() => {
      root.unmount();
    });
    expect(container.querySelector('svg')).toBeNull();
    container.remove();
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
      const { container, root } = host();
      act(() => {
        root.render(<DefaultChart config={rawConfig()} data={rows} />);
      });
      const svg = container.querySelector('svg');
      expect(svg!.getAttribute('width')).toBe('320');
      expect(svg!.getAttribute('height')).toBe('240');

      rectSpy.mockReturnValue({ width: 500, height: 400 } as DOMRect);
      for (const { callback } of observed) {
        callback([], undefined as any);
      }
      expect(svg!.getAttribute('width')).toBe('500');
      expect(svg!.getAttribute('height')).toBe('400');

      act(() => {
        root.unmount();
      });
      container.remove();
    } finally {
      rectSpy.mockRestore();
      delete (globalThis as any).ResizeObserver;
    }
  });
});

describe('placeholder components', () => {
  it('renders loadingComponent with the chart context, updates it, and removes it', () => {
    const { container, root } = host();
    function Loading({ width, height }: { width?: number; height?: number }) {
      return <div>Loading {width}x{height}</div>;
    }

    act(() => {
      root.render(
        <Chart mochartConfig={null} dataProvider={null} loading loadingComponent={Loading} width={400} height={300} />
      );
    });
    expect(container.textContent).toContain('Loading 400x300');

    act(() => {
      root.render(
        <Chart mochartConfig={null} dataProvider={null} loading loadingComponent={Loading} width={500} height={300} />
      );
    });
    expect(container.textContent).toContain('Loading 500x300');

    act(() => {
      root.render(
        <Chart
          mochartConfig={null}
          dataProvider={null}
          loading={false}
          loadingComponent={Loading}
          width={500}
          height={300}
        />
      );
    });
    expect(container.textContent).not.toContain('Loading');

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});

describe('DefaultChart', () => {
  it('enhances a raw config, renders data rows as bars, and updates on data change', () => {
    const { container, root } = host();

    act(() => {
      root.render(<DefaultChart config={rawConfig()} data={rows} width={400} height={300} />);
    });
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.textContent).toContain('Test Chart');
    expect(container.textContent).not.toContain('D');

    act(() => {
      root.render(
        <DefaultChart config={rawConfig()} data={[...rows, { name: 'D', value: 40 }]} width={400} height={300} />
      );
    });
    expect(container.textContent).toContain('D');

    act(() => {
      root.unmount();
    });
    expect(container.querySelector('svg')).toBeNull();
    container.remove();
  });
});
