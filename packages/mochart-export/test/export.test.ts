import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { createDefaultChart, mochartCssClasses } from '@mochart/core';
import type { ChartHandle, DefaultChartProps } from '@mochart/core';
import {
  findChartSvg, getChartSvgText, exportSVG, exportPNG,
  getStitchedChartsSvgText, exportChartsSVG, exportChartsPNG
} from '../src/index';

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

let container: HTMLDivElement;
let chart: ChartHandle<DefaultChartProps> | null = null;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  chart = createDefaultChart(container, { config: rawConfig(), data: rows, width: 400, height: 300 });
});

afterEach(() => {
  chart?.destroy();
  chart = null;
  container.remove();
});

describe('findChartSvg', () => {
  it('finds the chart svg from an ancestor, the chart root, or the svg itself', () => {
    const svg = findChartSvg(container);
    expect(svg).not.toBeNull();
    expect(svg!.tagName.toLowerCase()).toBe('svg');
    expect(svg!.getAttribute('width')).toBe('400');
    expect(svg!.getAttribute('height')).toBe('300');

    const chartRoot = container.querySelector('.' + mochartCssClasses['chart'].split(' ')[0])!;
    expect(findChartSvg(chartRoot)).toBe(svg);
    expect(findChartSvg(svg!)).toBe(svg);
  });

  it('returns null when no chart is present', () => {
    const empty = document.createElement('div');
    expect(findChartSvg(empty)).toBeNull();
  });
});

describe('getChartSvgText', () => {
  it('serializes standalone svg markup with a background rect by default', () => {
    const svgText = getChartSvgText(container);
    expect(svgText).not.toBeNull();
    expect(svgText).toContain('<svg');
    expect(svgText).toContain('Test Chart');
    // nothing paints a background in jsdom, so the effective-background walk
    // falls back to white (jsdom normalizes hex style colors to rgb)
    expect(svgText).toMatch(/<rect[^>]*width="400"[^>]*height="300"[^>]*fill: rgb\(255, 255, 255\)/);
  });

  it('strips the live keyboard semantics and exports a plain labeled image', () => {
    // the live chart has keyboard tab stops; the static export must not
    const liveSvg = findChartSvg(container)!;
    expect(liveSvg.querySelector('[tabindex]')).not.toBeNull();

    const svgText = getChartSvgText(container)!;
    expect(svgText).not.toContain('tabindex');
    expect(svgText).not.toContain('role="button"');
    expect(svgText).not.toContain('aria-expanded');
    expect(svgText).not.toContain('aria-pressed');
    expect(svgText).not.toContain('<style');
    // a static svg is an image, named like the live chart
    expect(svgText).toContain('role="img"');
    expect(svgText).toContain('aria-label="Test Chart"');
    // decorative geometry stays hidden from AT reading the raw svg
    expect(svgText).toContain('aria-hidden="true"');
  });

  it('omits the background rect when transparent', () => {
    const svgText = getChartSvgText(container, { transparent: true })!;
    expect(svgText).not.toMatch(/fill: rgb\(255, 255, 255\)/);
  });

  it('uses a custom background color', () => {
    const svgText = getChartSvgText(container, { backgroundColor: '#123456' })!;
    expect(svgText).toMatch(/fill: rgb\(18, 52, 86\)/);
  });

  it('defaults the background to the effective page background behind the chart', () => {
    // a dark page: the export inlines dark-theme chart colors, so the default
    // background must match the page, not hardcode white
    container.style.backgroundColor = 'rgb(32, 33, 39)';
    const svgText = getChartSvgText(container)!;
    expect(svgText).toMatch(/fill: rgb\(32, 33, 39\)/);
    expect(svgText).not.toMatch(/fill: rgb\(255, 255, 255\)/);
  });

  it('finds the page background through transparent ancestors', () => {
    document.body.style.backgroundColor = 'rgb(24, 24, 28)';
    try {
      const svgText = getChartSvgText(container)!;
      expect(svgText).toMatch(/fill: rgb\(24, 24, 28\)/);
    }
    finally {
      document.body.style.backgroundColor = '';
    }
  });

  it('lets an explicit background win over the page background', () => {
    container.style.backgroundColor = 'rgb(32, 33, 39)';
    const svgText = getChartSvgText(container, { backgroundColor: '#ffffff' })!;
    expect(svgText).toMatch(/fill: rgb\(255, 255, 255\)/);
  });

  it('strips the crosshair from the exported svg', () => {
    const crosshairClass = mochartCssClasses['crosshair'].split(' ')[0];
    const svg = findChartSvg(container)!;
    const crosshair = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    crosshair.setAttribute('class', crosshairClass);
    svg.appendChild(crosshair);
    expect(svg.querySelector('.' + crosshairClass)).not.toBeNull();

    const svgText = getChartSvgText(container)!;
    expect(svgText).not.toContain(crosshairClass);
    // the live chart keeps its crosshair — only the clone is stripped
    expect(svg.querySelector('.' + crosshairClass)).not.toBeNull();
  });

  it('returns null when no chart is present', () => {
    expect(getChartSvgText(document.createElement('div'))).toBeNull();
  });
});

describe('exportSVG', () => {
  it('downloads a file named from the chart title', () => {
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    (URL as any).createObjectURL = createObjectURL;
    (URL as any).revokeObjectURL = revokeObjectURL;
    let clickedDownload = '';
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clickedDownload = this.download;
    });
    try {
      expect(exportSVG(container)).toBe(true);
      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(clickedDownload).toBe('Test_Chart.svg');
    }
    finally {
      click.mockRestore();
    }
  });

  it('applies filenamePrefix and filename overrides', () => {
    (URL as any).createObjectURL = vi.fn(() => 'blob:mock');
    (URL as any).revokeObjectURL = vi.fn();
    const downloads: string[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this.download);
    });
    try {
      exportSVG(container, { filenamePrefix: 'demo-' });
      exportSVG(container, { filename: 'custom-name' });
      expect(downloads).toEqual(['demo-Test_Chart.svg', 'custom-name.svg']);
    }
    finally {
      click.mockRestore();
    }
  });

  it('returns false when no chart is present', () => {
    expect(exportSVG(document.createElement('div'))).toBe(false);
  });
});

describe('exportPNG', () => {
  it('resolves false when no chart is present', async () => {
    await expect(exportPNG(document.createElement('div'))).resolves.toBe(false);
  });

  // jsdom never loads images, so the rasterization path needs a stubbed Image.
  // Regression: a synchronous throw inside onload escaped the handler rather
  // than the promise executor, so the promise never settled and callers hung.
  it('rejects rather than hanging when rasterization throws', async () => {
    const OriginalImage = globalThis.Image;
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    (globalThis as any).Image = FakeImage;
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage() {
        // what a canvas tainted by a cross-origin image raises
        throw new DOMException('Tainted canvases may not be exported.', 'SecurityError');
      }
    } as unknown as CanvasRenderingContext2D);
    try {
      await expect(exportPNG(container)).rejects.toThrow(/Tainted canvases/);
    }
    finally {
      (globalThis as any).Image = OriginalImage;
      getContext.mockRestore();
    }
  });

  it('rejects when no 2d context is available', async () => {
    const OriginalImage = globalThis.Image;
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    (globalThis as any).Image = FakeImage;
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    try {
      await expect(exportPNG(container)).rejects.toThrow(/2d canvas context/);
    }
    finally {
      (globalThis as any).Image = OriginalImage;
      getContext.mockRestore();
    }
  });
});

describe('stitching several charts', () => {
  // a second, smaller chart so the max-sized-cell centering is observable
  let secondContainer: HTMLDivElement;
  let secondChart: ChartHandle<DefaultChartProps> | null = null;

  beforeEach(() => {
    secondContainer = document.createElement('div');
    document.body.appendChild(secondContainer);
    secondChart = createDefaultChart(secondContainer, {
      config: { ...rawConfig(), title: { text: 'Second Chart' } },
      data: rows,
      width: 200,
      height: 150
    });
  });

  afterEach(() => {
    secondChart?.destroy();
    secondChart = null;
    secondContainer.remove();
  });

  function outerSize(svgText: string): { width: string | null; height: string | null } {
    const outer = new DOMParser().parseFromString(svgText, 'image/svg+xml').documentElement;
    return { width: outer.getAttribute('width'), height: outer.getAttribute('height') };
  }

  function tiles(svgText: string): Element[] {
    const outer = new DOMParser().parseFromString(svgText, 'image/svg+xml').documentElement;
    return Array.from(outer.children).filter(child => child.tagName.toLowerCase() === 'svg');
  }

  it('serializes as valid xml with a single namespace declaration', () => {
    const svgText = getStitchedChartsSvgText([container, secondContainer], { cols: 2 })!;
    // a second xmlns declaration on the outer svg makes browsers and image
    // decoders reject the file, which silently broke png stitching
    expect(svgText.match(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g)!.length).toBe(3);
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    expect(doc.querySelector('parsererror')).toBeNull();
  });

  it('tiles the charts into a grid sized to the largest chart', () => {
    const svgText = getStitchedChartsSvgText([container, secondContainer], { cols: 2 })!;
    expect(svgText).not.toBeNull();
    // one cell per chart, each the size of the largest (400x300)
    expect(outerSize(svgText)).toEqual({ width: '800', height: '300' });
    expect(tiles(svgText)).toHaveLength(2);
  });

  it('centers a smaller chart within its cell', () => {
    const svgText = getStitchedChartsSvgText([container, secondContainer], { cols: 2 })!;
    const [first, second] = tiles(svgText);
    expect([first.getAttribute('x'), first.getAttribute('y')]).toEqual(['0', '0']);
    expect([first.getAttribute('width'), first.getAttribute('height')]).toEqual(['400', '300']);
    // second cell starts at 400; (400-200)/2 and (300-150)/2 center the smaller chart
    expect([second.getAttribute('x'), second.getAttribute('y')]).toEqual(['500', '75']);
    expect([second.getAttribute('width'), second.getAttribute('height')]).toEqual(['200', '150']);
  });

  it('wraps to a second row and applies the gap', () => {
    const svgText = getStitchedChartsSvgText([container, container, container], { cols: 2, gap: 10 })!;
    // 2 columns x 2 rows of 400x300 cells, with one 10px gap on each axis
    expect(outerSize(svgText)).toEqual({ width: '810', height: '610' });
    const [, , third] = tiles(svgText);
    expect([third.getAttribute('x'), third.getAttribute('y')]).toEqual(['0', '310']);
  });

  it('paints a background rect by default and omits it when transparent', () => {
    const opaque = getStitchedChartsSvgText([container, secondContainer], { cols: 2 })!;
    expect(opaque).toMatch(/<rect[^>]*width="800"[^>]*height="300"/);
    const transparent = getStitchedChartsSvgText([container, secondContainer], { cols: 2, transparent: true })!;
    expect(transparent).not.toMatch(/<rect[^>]*width="800"[^>]*height="300"/);
  });

  it('skips elements without a chart', () => {
    const empty = document.createElement('div');
    const svgText = getStitchedChartsSvgText([empty, container, empty], { cols: 2 })!;
    expect(tiles(svgText)).toHaveLength(1);
  });

  it('returns null when none of the elements contain a chart', () => {
    expect(getStitchedChartsSvgText([document.createElement('div')], { cols: 2 })).toBeNull();
  });

  it('strips the live keyboard semantics from every tile', () => {
    const svgText = getStitchedChartsSvgText([container, secondContainer], { cols: 2 })!;
    expect(svgText).not.toContain('tabindex');
    expect(svgText).not.toContain('aria-pressed');
  });

  it('exportChartsSVG downloads a file named from the first chart found', () => {
    (URL as any).createObjectURL = vi.fn(() => 'blob:mock');
    (URL as any).revokeObjectURL = vi.fn();
    const downloads: string[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this.download);
    });
    try {
      expect(exportChartsSVG([document.createElement('div'), container, secondContainer], { cols: 2 })).toBe(true);
      expect(exportChartsSVG([container, secondContainer], { cols: 2, filename: 'grid' })).toBe(true);
      expect(downloads).toEqual(['Test_Chart.svg', 'grid.svg']);
    }
    finally {
      click.mockRestore();
    }
  });

  it('exportChartsSVG returns false when no chart is present', () => {
    expect(exportChartsSVG([document.createElement('div')], { cols: 2 })).toBe(false);
  });

  it('exportChartsPNG resolves false when no chart is present', async () => {
    await expect(exportChartsPNG([document.createElement('div')], { cols: 2 })).resolves.toBe(false);
  });
});
