/**
 * ChartHandle.refresh(): the escape hatch for hosts that mutate data in
 * place — update() detects changes by object identity only, so a mutated
 * array or a custom provider returning new values needs refresh() to be
 * re-read and re-rendered.
 */
import { describe, it, beforeAll, afterEach, expect, vi } from 'vitest';

const FRAME_MS = 16;

let mochart: typeof import('../../src');

beforeAll(async () => {
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
  if (typeof globalThis.requestAnimationFrame !== 'function') {
    globalThis.requestAnimationFrame = (callback: FrameRequestCallback) =>
      setTimeout(() => callback(performance.now()), FRAME_MS) as unknown as number;
    globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id);
  }
  vi.useFakeTimers({
    toFake: [
      'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
      'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'
    ]
  });
  mochart = await import('../../src');
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllTimers();
});

function runFrames(maxFrames = 500) {
  let frames = 0;
  while (vi.getTimerCount() > 0 && frames < maxFrames) {
    vi.advanceTimersByTime(FRAME_MS);
    frames++;
  }
}

function getCategoryLabels(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('text'))
    .map(text => text.textContent ?? '')
    .filter(label => ['a', 'b', 'c'].includes(label));
}

import type { MochartInputConfig } from '../../src/types/config';

const config = {
  version: '1.0.0',
  categoryAxis: { property: 'label', type: 'string', scale: 'ordinal' },
  series: [{ property: 'value', renderer: 'bar' }]
} as unknown as MochartInputConfig;

function mountContainer(): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

describe('createDefaultChart refresh', () => {
  it('renders a category pushed onto the same data array only after refresh', () => {
    const data = [
      { label: 'a', value: 1 },
      { label: 'b', value: 3 }
    ];
    const container = mountContainer();
    const chart = mochart.createDefaultChart(container, { config, data, width: 300, height: 200 });
    runFrames();
    expect(getCategoryLabels(container).sort()).toEqual(['a', 'b']);

    data.push({ label: 'c', value: 2 });
    chart.update({ data });
    runFrames();
    expect(getCategoryLabels(container).sort()).toEqual(['a', 'b']); // identity unchanged, mutation not seen

    chart.refresh();
    runFrames();
    expect(getCategoryLabels(container).sort()).toEqual(['a', 'b', 'c']);
    chart.destroy();
  });
});

describe('createChart refresh', () => {
  it('remaps an uncontrolled focused category after an in-place reorder', () => {
    const data = [
      { label: 'a', value: 1 },
      { label: 'b', value: 3 },
      { label: 'c', value: 2 }
    ];
    const dataProvider = new mochart.ArrayOfObjectsDataProvider(data, 'label');
    const mochartConfig = mochart.enhanceConfig({
      ...config,
      animation: { animate: false }
    } as never);
    const focuses: { focusedCategoryIndex: number }[] = [];
    const props = {
      mochartConfig,
      dataProvider,
      width: 300,
      height: 200,
      onFocus: (focus: { focusedCategoryIndex: number }) => focuses.push(focus)
    };

    const container = mountContainer();
    const chart = mochart.createChart(container, { ...props, focusedCategoryIndex: 1 });
    runFrames();
    // Release the controlled value while retaining the internally applied focus on b.
    chart.replace(props);

    const [a, b, c] = data;
    data.splice(0, data.length, b, a, c);
    chart.refresh();
    runFrames();

    expect(focuses.map(focus => focus.focusedCategoryIndex)).toEqual([0]);
    chart.destroy();
  });

  it('remaps focus after an in-place reorder of a live provider with no refresh hook', () => {
    const liveCategories = ['a', 'b', 'c'];
    const liveValues: Record<string, number> = { a: 1, b: 3, c: 2 };
    const dataProvider = {
      getCategoryValues: () => [...liveCategories],
      getSeriesValue: (categoryValue: unknown) => liveValues[String(categoryValue)]
    };
    const mochartConfig = mochart.enhanceConfig({
      ...config,
      animation: { animate: false }
    } as never);
    const focuses: { focusedCategoryIndex: number }[] = [];
    const props = {
      mochartConfig,
      dataProvider,
      width: 300,
      height: 200,
      onFocus: (focus: { focusedCategoryIndex: number }) => focuses.push(focus)
    };

    const container = mountContainer();
    const chart = mochart.createChart(container, { ...props, focusedCategoryIndex: 1 });
    runFrames();
    chart.replace(props);

    // The old ordering survives only in the chart's own snapshot: the provider
    // reads live, so by refresh() time the mutation has already happened.
    liveCategories.splice(0, liveCategories.length, 'b', 'a', 'c');
    chart.refresh();
    runFrames();

    expect(focuses.map(focus => focus.focusedCategoryIndex)).toEqual([0]);
    chart.destroy();
  });

  it('tolerates a null provider (loading hosts) across mount, refresh and update', () => {
    const mochartConfig = mochart.enhanceConfig(config as never);
    const container = mountContainer();
    const chart = mochart.createChart(container, {
      mochartConfig, dataProvider: null as never, loading: true, width: 300, height: 200
    });
    runFrames();
    chart.refresh();
    runFrames();
    expect(getCategoryLabels(container)).toEqual([]);

    const data = [{ label: 'a', value: 1 }, { label: 'b', value: 3 }];
    chart.update({ dataProvider: new mochart.ArrayOfObjectsDataProvider(data, 'label'), loading: false });
    runFrames();
    expect(getCategoryLabels(container).sort()).toEqual(['a', 'b']);
    chart.destroy();
  });

  it('un-snapshots a built-in row provider via its refresh hook', () => {
    const data = [
      { label: 'a', value: 1 },
      { label: 'b', value: 3 }
    ];
    const dataProvider = new mochart.ArrayOfObjectsDataProvider(data, 'label');
    const mochartConfig = mochart.enhanceConfig(config as never);
    expect(mochartConfig.validation.valid).toBe(true);

    const container = mountContainer();
    const chart = mochart.createChart(container, {
      mochartConfig, dataProvider, width: 300, height: 200
    });
    runFrames();
    expect(getCategoryLabels(container).sort()).toEqual(['a', 'b']);

    data.push({ label: 'c', value: 2 });
    chart.refresh();
    runFrames();
    expect(getCategoryLabels(container).sort()).toEqual(['a', 'b', 'c']);
    chart.destroy();
  });

  it('re-reads a live custom provider on refresh', () => {
    const liveCategories = ['a', 'b'];
    const liveValues: Record<string, number> = { a: 1, b: 3, c: 2 };
    const dataProvider = {
      getCategoryValues: () => [...liveCategories],
      getSeriesValue: (categoryValue: unknown) => liveValues[String(categoryValue)]
    };
    const mochartConfig = mochart.enhanceConfig(config as never);
    expect(mochartConfig.validation.valid).toBe(true);

    const container = mountContainer();
    const chart = mochart.createChart(container, {
      mochartConfig, dataProvider, width: 300, height: 200
    });
    runFrames();
    expect(getCategoryLabels(container).sort()).toEqual(['a', 'b']);

    liveCategories.push('c');
    chart.update({ width: 301 }); // unrelated update: provider identity unchanged, mutation not seen
    runFrames();
    expect(getCategoryLabels(container).sort()).toEqual(['a', 'b']);

    chart.refresh();
    runFrames();
    expect(getCategoryLabels(container).sort()).toEqual(['a', 'b', 'c']);
    chart.destroy();
  });
});
