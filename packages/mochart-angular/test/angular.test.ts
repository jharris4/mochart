// JIT-compile the components at runtime — these tests run the raw TS source
// under vitest, not the AOT (ngc) build.
import '@angular/compiler';

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { Component, Input, provideZonelessChangeDetection } from '@angular/core';
import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { enhanceConfig, ArrayOfObjectsDataProvider } from 'mochart';
import { Chart, DefaultChart } from '../src/index';

beforeAll(() => {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

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

beforeEach(() => {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()]
  });
});

function rawConfig(): any {
  return {
    version: '1.0.0',
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

function createWith(component: any, inputs: Record<string, any>) {
  const fixture = TestBed.createComponent(component);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  return fixture;
}

@Component({
  selector: 'test-loading',
  template: '<div>Loading {{ width }}x{{ height }}</div>'
})
class Loading {
  @Input() width?: number;
  @Input() height?: number;
}

@Component({
  selector: 'test-config-error',
  template: '<div>Bad config {{ width }}x{{ height }}</div>'
})
class ConfigError {
  @Input() width?: number;
  @Input() height?: number;
}

describe('Chart', () => {
  it('mounts an svg chart, applies input updates, and cleans up on destroy', () => {
    const mochartConfig = enhanceConfig(rawConfig());
    expect(mochartConfig.validation.valid).toBe(true);
    const fixture = createWith(Chart, {
      mochartConfig,
      dataProvider: new ArrayOfObjectsDataProvider(rows, 'name'),
      width: 400,
      height: 300
    });
    const el: HTMLElement = fixture.nativeElement;

    const svg = el.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('width')).toBe('400');
    expect(svg!.getAttribute('height')).toBe('300');
    expect(el.textContent).toContain('Test Chart');

    fixture.componentRef.setInput('width', 500);
    fixture.detectChanges();
    expect(el.querySelector('svg')!.getAttribute('width')).toBe('500');

    fixture.destroy();
    expect(el.querySelector('svg')).toBeNull();
  });
});

describe('Chart auto-sizing', () => {
  it('tracks the host element size when width/height are omitted', () => {
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
      const fixture = createWith(DefaultChart, { config: rawConfig(), data: rows });
      const el: HTMLElement = fixture.nativeElement;
      const svg = el.querySelector('svg');
      expect(svg!.getAttribute('width')).toBe('320');
      expect(svg!.getAttribute('height')).toBe('240');

      rectSpy.mockReturnValue({ width: 500, height: 400 } as DOMRect);
      for (const { callback } of observed) {
        callback([], undefined as any);
      }
      expect(svg!.getAttribute('width')).toBe('500');
      expect(svg!.getAttribute('height')).toBe('400');

      fixture.destroy();
    } finally {
      rectSpy.mockRestore();
      delete (globalThis as any).ResizeObserver;
    }
  });
});

describe('placeholder components', () => {
  it('renders loadingComponent with the chart context, updates it, and removes it', () => {
    const fixture = createWith(Chart, {
      mochartConfig: null,
      dataProvider: null,
      loading: true,
      loadingComponent: Loading,
      width: 400,
      height: 300
    });
    const el: HTMLElement = fixture.nativeElement;

    expect(el.textContent).toContain('Loading 400x300');

    fixture.componentRef.setInput('width', 500);
    fixture.detectChanges();
    expect(el.textContent).toContain('Loading 500x300');

    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();
    expect(el.textContent).not.toContain('Loading');

    fixture.destroy();
  });

  it('renders configErrorComponent when the config fails validation', () => {
    const mochartConfig = enhanceConfig({ ...rawConfig(), unknownExtra: 1 });
    expect(mochartConfig.validation.valid).toBe(false);
    const fixture = createWith(Chart, {
      mochartConfig,
      dataProvider: new ArrayOfObjectsDataProvider(rows, 'name'),
      configErrorComponent: ConfigError,
      width: 400,
      height: 300
    });
    const el: HTMLElement = fixture.nativeElement;

    expect(el.textContent).toContain('Bad config 400x300');

    fixture.destroy();
  });
});

describe('DefaultChart', () => {
  it('enhances a raw config, renders data rows as bars, and updates on data change', () => {
    const fixture = createWith(DefaultChart, {
      config: rawConfig(),
      data: rows,
      width: 400,
      height: 300
    });
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('svg')).not.toBeNull();
    expect(el.textContent).toContain('Test Chart');
    expect(el.textContent).not.toContain('D');

    fixture.componentRef.setInput('data', [...rows, { name: 'D', value: 40 }]);
    fixture.detectChanges();
    expect(el.textContent).toContain('D');

    fixture.destroy();
    expect(el.querySelector('svg')).toBeNull();
  });

  it('accepts the loading input and renders loadingComponent over the chart', () => {
    const fixture = createWith(DefaultChart, {
      config: rawConfig(),
      data: rows,
      loading: true,
      loadingComponent: Loading,
      width: 400,
      height: 300
    });
    const el: HTMLElement = fixture.nativeElement;

    // the loading overlay factory receives the plot-area bounds, not the outer size
    expect(el.textContent).toContain('Loading');

    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();
    expect(el.textContent).not.toContain('Loading');

    fixture.destroy();
  });
});
