import { describe, it, expect, beforeAll, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { enhanceConfig, ArrayOfObjectsDataProvider } from '@mochart/core';
import { Chart, DefaultChart } from '../src/index';
import type { ChartRef } from '../src/index';

declare global {
   
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
    const widthSpy = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(320);
    const heightSpy = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(240);
    try {
      const { container, root } = host();
      act(() => {
        root.render(<DefaultChart config={rawConfig()} data={rows} />);
      });
      const svg = container.querySelector('svg');
      expect(svg!.getAttribute('width')).toBe('320');
      expect(svg!.getAttribute('height')).toBe('240');

      widthSpy.mockReturnValue(500);
      heightSpy.mockReturnValue(400);
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
      widthSpy.mockRestore();
      heightSpy.mockRestore();
      delete (globalThis as any).ResizeObserver;
    }
  });

  it('ignores the transform-scaled client rect when measuring the container', () => {
    // a mount during e.g. a dialog's scale(0.95) entry animation: the rect is
    // scaled, the layout size is not — and no resize event ever corrects it
    const widthSpy = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(400);
    const heightSpy = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(300);
    const rectSpy = vi
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockReturnValue({ width: 380, height: 285 } as DOMRect);
    try {
      const { container, root } = host();
      act(() => {
        root.render(<DefaultChart config={rawConfig()} data={rows} />);
      });
      const svg = container.querySelector('svg');
      expect(svg!.getAttribute('width')).toBe('400');
      expect(svg!.getAttribute('height')).toBe('300');

      act(() => {
        root.unmount();
      });
      container.remove();
    } finally {
      widthSpy.mockRestore();
      heightSpy.mockRestore();
      rectSpy.mockRestore();
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

  it('renders configErrorComponent when the config fails validation', () => {
    const { container, root } = host();
    const mochartConfig = enhanceConfig({ ...rawConfig(), unknownExtra: 1 });
    expect(mochartConfig.validation.valid).toBe(false);
    function ConfigError({ width, height }: { width?: number; height?: number }) {
      return <div>Bad config {width}x{height}</div>;
    }

    act(() => {
      root.render(
        <Chart
          mochartConfig={mochartConfig}
          dataProvider={new ArrayOfObjectsDataProvider(rows, 'name')}
          configErrorComponent={ConfigError}
          width={400}
          height={300}
        />
      );
    });
    expect(container.textContent).toContain('Bad config 400x300');

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

  it('accepts the loading prop and renders loadingComponent over the chart', () => {
    const { container, root } = host();
    function Loading({ width, height }: { width?: number; height?: number }) {
      return <div>Loading {width}x{height}</div>;
    }

    act(() => {
      root.render(
        <DefaultChart config={rawConfig()} data={rows} loading loadingComponent={Loading} width={400} height={300} />
      );
    });
    // the loading overlay factory receives the plot-area bounds, not the outer size
    expect(container.textContent).toContain('Loading');

    act(() => {
      root.render(
        <DefaultChart
          config={rawConfig()}
          data={rows}
          loading={false}
          loadingComponent={Loading}
          width={400}
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

// Regression: the core handle merged partial props, so a prop absent from the
// next render kept its previous value instead of being unset.
describe('removed props', () => {
  it('clears the loading state when the prop is removed', () => {
    const { container, root } = host();
    const mochartConfig = enhanceConfig(rawConfig());
    const dataProvider = new ArrayOfObjectsDataProvider(rows, 'name');

    act(() => {
      root.render(<Chart mochartConfig={mochartConfig} dataProvider={dataProvider} loading width={400} height={300} />);
    });
    expect(container.querySelector('.mochart-loading')).not.toBeNull();

    act(() => {
      root.render(<Chart mochartConfig={mochartConfig} dataProvider={dataProvider} width={400} height={300} />);
    });
    expect(container.querySelector('.mochart-loading')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('falls back to the built-in placeholder when the component prop is removed', () => {
    const { container, root } = host();
    function Loading() {
      return <div>Custom loading</div>;
    }

    act(() => {
      root.render(<Chart mochartConfig={null} dataProvider={null} loading loadingComponent={Loading} width={400} height={300} />);
    });
    expect(container.textContent).toContain('Custom loading');

    act(() => {
      root.render(<Chart mochartConfig={null} dataProvider={null} loading width={400} height={300} />);
    });
    expect(container.textContent).not.toContain('Custom loading');
    expect(container.querySelector('.mochart-loading')).not.toBeNull();

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});

// Regression: the user's container style used to override the explicit size
// props; the size props must win, like in the other bindings.
describe('size props vs container style', () => {
  it('keeps the explicit size when the style sets a conflicting one', () => {
    const { container, root } = host();
    act(() => {
      root.render(<Chart mochartConfig={enhanceConfig(rawConfig())} dataProvider={new ArrayOfObjectsDataProvider(rows, 'name')}
        width={400} height={300} style={{ width: '100%', margin: '4px' }} />);
    });
    const containerDiv = container.firstElementChild as HTMLDivElement;
    expect(containerDiv.style.width).toBe('400px');
    expect(containerDiv.style.margin).toBe('4px');
    act(() => {
      root.unmount();
    });
    container.remove();
  });
});

describe('refresh', () => {
  it('re-reads in-place data mutations through the ref handle', () => {
    const { container, root } = host();
    const data = [...rows];
    const ref: { current: ChartRef | null } = { current: null };
    act(() => {
      root.render(<DefaultChart ref={ref} config={rawConfig()} data={data} width={400} height={300} />);
    });
    expect(container.textContent).toContain('C');
    expect(container.textContent).not.toContain('D');

    data.push({ name: 'D', value: 40 });
    act(() => { ref.current!.refresh(); });
    expect(container.textContent).toContain('D');
    act(() => root.unmount());
  });
});
