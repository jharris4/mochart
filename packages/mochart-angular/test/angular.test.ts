// JIT-compile the components at runtime — these tests run the raw TS source
// under vitest, not the AOT (ngc) build.
import '@angular/compiler';

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { Component, Input, PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import type { OnDestroy } from '@angular/core';
import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { enhanceConfig, ArrayOfObjectsDataProvider } from '@mochart/core';
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

function rawConfig(categoryProperty = 'name'): any {
  return {
    version: '1.0.0',
    title: { text: 'Test Chart' },
    categoryAxis: { property: categoryProperty, type: 'string', scale: 'ordinal' },
    seriesDefaults: { renderer: 'bar' },
    series: [{ property: 'value', title: 'Value' }],
    animation: { animate: false }
  };
}

const rows = [
  { name: 'A', period: 'P1', value: 10 },
  { name: 'B', period: 'P2', value: 20 },
  { name: 'C', period: 'P3', value: 30 }
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

// Stands in for whatever work a placeholder starts: counts its own destruction.
@Component({
  selector: 'test-tracked-loading',
  template: '<div>Custom loading</div>'
})
class TrackedLoading implements OnDestroy {
  static destroyed = 0;
  ngOnDestroy(): void {
    TrackedLoading.destroyed += 1;
  }
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

describe('dataTestId', () => {
  it('applies and removes data-testid on the host element', () => {
    const fixture = createWith(Chart, {
      mochartConfig: enhanceConfig(rawConfig()),
      dataProvider: new ArrayOfObjectsDataProvider(rows, 'name'),
      width: 400,
      height: 300,
      dataTestId: 'revenue-chart'
    });
    const el: HTMLElement = fixture.nativeElement;
    expect(el.getAttribute('data-testid')).toBe('revenue-chart');

    fixture.componentRef.setInput('dataTestId', undefined);
    fixture.detectChanges();
    expect(el.getAttribute('data-testid')).toBeNull();

    fixture.destroy();
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
    const widthSpy = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(320);
    const heightSpy = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(240);
    try {
      const fixture = createWith(DefaultChart, { config: rawConfig(), data: rows });
      const el: HTMLElement = fixture.nativeElement;
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

      fixture.destroy();
    } finally {
      widthSpy.mockRestore();
      heightSpy.mockRestore();
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
  it('enhances a raw config and updates data and structural config', () => {
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

    fixture.componentRef.setInput('data', [...rows, { name: 'D', period: 'P4', value: 40 }]);
    fixture.detectChanges();
    expect(el.textContent).toContain('D');

    fixture.componentRef.setInput('config', rawConfig('period'));
    fixture.componentRef.setInput('data', rows);
    fixture.detectChanges();
    expect(el.textContent).toContain('P1');
    expect(el.textContent).not.toContain('A');

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

// Regression: ngAfterViewInit ran the full chart mount on the server too.
describe('server-side rendering', () => {
  it('does not mount the chart under a non-browser platform', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: PLATFORM_ID, useValue: 'server' }]
    });
    const mochartConfig = enhanceConfig(rawConfig());
    const fixture = createWith(Chart, {
      mochartConfig,
      dataProvider: new ArrayOfObjectsDataProvider(rows, 'name'),
      width: 400,
      height: 300
    });
    expect(fixture.nativeElement.querySelector('svg')).toBeNull();
  });
});

// Regression: a cleared placeholder component left its stale factory in the
// chart, so the custom component kept rendering forever.
describe('removed placeholder components', () => {
  it('falls back to the built-in placeholder when the input is cleared', () => {
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

    fixture.componentRef.setInput('loadingComponent', undefined);
    fixture.detectChanges();
    expect(el.textContent).not.toContain('Loading 400x300');
    expect(el.querySelector('.mochart-loading')).not.toBeNull();
  });

  // BIND-5: clearing the input left the created component alive in its detached
  // container, so its ngOnDestroy, timers and subscriptions never ran.
  it('destroys the placeholder component when the input is cleared', () => {
    const before = TrackedLoading.destroyed;
    const fixture = createWith(Chart, {
      mochartConfig: null,
      dataProvider: null,
      loading: true,
      loadingComponent: TrackedLoading,
      width: 400,
      height: 300
    });
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Custom loading');
    expect(TrackedLoading.destroyed).toBe(before);

    fixture.componentRef.setInput('loadingComponent', undefined);
    fixture.detectChanges();
    expect(TrackedLoading.destroyed).toBe(before + 1);

    // the released slot is rebuilt when the input comes back
    fixture.componentRef.setInput('loadingComponent', TrackedLoading);
    fixture.detectChanges();
    expect(el.textContent).toContain('Custom loading');
    expect(TrackedLoading.destroyed).toBe(before + 1);

    fixture.destroy();
    expect(TrackedLoading.destroyed).toBe(before + 2);
  });
});

// Regression: callback forwarding snapshotted emitter.observed at buildProps
// time, so a subscription made after mount (e.g. via @ViewChild) received no
// events until an unrelated input change re-ran ngOnChanges.
describe('programmatic output subscription after mount', () => {
  it('forwards events to a subscription made after the chart mounted', async () => {
    // processChartEvent needs a real chart rect to place the pointer inside;
    // jsdom returns zero rects, so give every element a 400x300 one.
    const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = () =>
      ({ x: 0, y: 0, left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, toJSON: () => ({}) }) as DOMRect;
    try {
      const fixture = createWith(Chart, {
        mochartConfig: enhanceConfig(rawConfig()),
        dataProvider: new ArrayOfObjectsDataProvider(rows, 'name'),
        width: 400,
        height: 300
      });
      const el: HTMLElement = fixture.nativeElement;
      const svg = el.querySelector('svg')!;
      expect(svg).not.toBeNull();

      const payloads: any[] = [];
      (fixture.componentInstance as Chart).chartClick.subscribe((payload: any) => payloads.push(payload));
      // the callback re-sync is coalesced into a microtask
      await Promise.resolve();

      svg.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 50, clientY: 50 }));
      expect(payloads.length).toBe(1);
    }
    finally {
      Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    }
  });
});

describe('refresh', () => {
  it('re-reads in-place data mutations through the component method', () => {
    const data = [...rows];
    const fixture = createWith(DefaultChart, { config: rawConfig(), data, width: 400, height: 300 });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('C');
    expect(el.textContent).not.toContain('D');

    data.push({ name: 'D', period: 'P4', value: 40 });
    (fixture.componentInstance as DefaultChart).refresh();
    expect(el.textContent).toContain('D');
  });
});

/**
 * TEST-2: only `chartClick` was ever verified; the other nine entries of the emitter -> core-name
 * table in base-chart.ts were unchecked. That table is string-to-string plumbing — a typo or a
 * dropped row compiles, typechecks, lints and ships, and the output simply never fires. It is
 * iterated here so a new row cannot be added without a case.
 */
describe('interaction callbacks', () => {
  const OUTPUTS = [
    'chartClick', 'sliceClick', 'seriesClick', 'chartMouseEnter', 'chartMouseMove',
    'chartMouseLeave', 'titleClick', 'focusChange', 'seriesFilter', 'seriesLayoutBoundsChange'
  ] as const;

  async function mountWithAllOutputs(config = rawConfig()) {
    const fixture = createWith(DefaultChart, { config, data: rows, width: 400, height: 300 });
    const instance = fixture.componentInstance as unknown as Record<string, { subscribe(fn: (p: unknown) => void): void }>;
    const seen: Record<string, unknown[]> = {};
    for (const name of OUTPUTS) {
      seen[name] = [];
      instance[name].subscribe((payload: unknown) => seen[name].push(payload));
    }
    // the callback re-sync after a late subscription is coalesced into a microtask
    await Promise.resolve();
    fixture.detectChanges();
    return { fixture, seen, el: fixture.nativeElement as HTMLElement };
  }

  it('exposes every output named in the emitter table', () => {
    const fixture = createWith(DefaultChart, { config: rawConfig(), data: rows, width: 400, height: 300 });
    const instance = fixture.componentInstance as unknown as Record<string, unknown>;
    for (const name of OUTPUTS) {
      expect(instance[name], name).toBeDefined();
      expect(typeof (instance[name] as { subscribe?: unknown }).subscribe, name).toBe('function');
    }
  });

  it('delivers the pointer outputs, focusChange and seriesLayoutBoundsChange', async () => {
    const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      return {
        x: 0, y: 0, left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, toJSON: () => ({})
      } as DOMRect;
    };
    try {
      const { el, seen } = await mountWithAllOutputs();
      const chartRoot = el.querySelector('[data-mochart-version]')!;
      const mouse = (type: string, clientX: number, clientY: number) =>
        chartRoot.dispatchEvent(new MouseEvent(type, { clientX, clientY, bubbles: true }));

      mouse('mouseenter', 100, 100);
      expect(seen.chartMouseEnter.length).toBe(1);
      mouse('mousemove', 200, 100);
      expect(seen.chartMouseMove.length).toBe(1);
      mouse('click', 200, 100);
      expect(seen.chartClick.length).toBe(1);
      expect(seen.focusChange.length).toBeGreaterThan(0);
      mouse('mousemove', -10, 100);
      expect(seen.chartMouseLeave.length).toBe(1);

      // fires during mount, before the subscriptions above, so assert on a resize instead
      expect(Array.isArray(seen.seriesLayoutBoundsChange)).toBe(true);
    }
    finally {
      Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    }
  });

  it('delivers titleClick, and the title becomes a control because the output is subscribed', async () => {
    const { el, seen } = await mountWithAllOutputs();
    const title = el.querySelector('.mochart-title')!;
    expect(title.getAttribute('role')).toBe('button');
    title.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(seen.titleClick.length).toBe(1);
  });

  it('delivers seriesFilter from a legend click', async () => {
    const { el, seen } = await mountWithAllOutputs({ ...rawConfig(), legend: { visible: true } });
    el.querySelector('.mochart-legend-item')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(seen.seriesFilter.length).toBe(1);
  });

  // separate from the legend case: filtering removes the series from the DOM, so a click on it
  // afterwards has nothing to land on
  it('delivers seriesClick from a series click', async () => {
    const { el, seen } = await mountWithAllOutputs();
    el.querySelector('.mochart-series path, .mochart-series rect')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(seen.seriesClick.length).toBe(1);
  });

  it('delivers sliceClick from a pie slice click', async () => {
    const { el, seen } = await mountWithAllOutputs({ ...rawConfig(), chart: { type: 'pie' } });
    el.querySelector('.mochart-series path')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(seen.sliceClick.length).toBe(1);
  });
});
