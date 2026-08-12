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

  // A11Y-4: role="img" with no accessible name is a harder failure than the unroled svg it came
  // from, and the chart writes aria-label only while accessibility is enabled and not hidden.
  it('hides the export instead of roling it when the chart has no accessible name', () => {
    for (const accessibility of [{ enabled: false }, { hidden: true }]) {
      const unnamedContainer = document.createElement('div');
      document.body.appendChild(unnamedContainer);
      const unnamedChart = createDefaultChart(unnamedContainer, {
        config: { ...rawConfig(), accessibility }, data: rows, width: 400, height: 300
      });

      const svgText = getChartSvgText(unnamedContainer)!;
      expect(svgText, JSON.stringify(accessibility)).not.toContain('aria-label=');
      expect(svgText, JSON.stringify(accessibility)).not.toContain('role="img"');
      expect(svgText, JSON.stringify(accessibility)).toContain('aria-hidden="true"');

      unnamedChart.destroy();
      unnamedContainer.remove();
    }
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

// BIND-7: font styles are inlined by family name only, so a web font the page loaded is absent from
// the exported file. fontFaceCss is the host's way to put the font data in it.
describe('fontFaceCss', () => {
  const fontFaceCss = "@font-face { font-family: 'Test Sans'; src: url(data:font/woff2;base64,AAAA) format('woff2'); }";

  it('adds no style element when not asked for', () => {
    expect(getChartSvgText(container)).not.toContain('<style');
  });

  it('injects the css into a style element in the exported svg', () => {
    const svgText = getChartSvgText(container, { fontFaceCss })!;
    expect(svgText).toContain('<style');
    expect(svgText).toContain("font-family: 'Test Sans'");
    expect(svgText).toContain('data:font/woff2;base64,AAAA');
  });

  it('ignores an empty or whitespace-only value', () => {
    expect(getChartSvgText(container, { fontFaceCss: '' })).not.toContain('<style');
    expect(getChartSvgText(container, { fontFaceCss: '   ' })).not.toContain('<style');
  });

  it('reaches the transparent path too', () => {
    expect(getChartSvgText(container, { fontFaceCss, transparent: true })).toContain('<style');
  });

  describe('in a stitched grid', () => {
    let second: HTMLDivElement;
    let secondChart: ChartHandle<DefaultChartProps> | null = null;

    beforeEach(() => {
      second = document.createElement('div');
      document.body.appendChild(second);
      secondChart = createDefaultChart(second, { config: rawConfig(), data: rows, width: 400, height: 300 });
    });

    afterEach(() => {
      secondChart?.destroy();
      secondChart = null;
      second.remove();
    });

    it('adds one style element for the whole grid, not one per tile', () => {
      const svgText = getStitchedChartsSvgText([container, second], { cols: 2, fontFaceCss })!;
      // a base64 font repeated per tile would multiply the file size by the chart count
      expect(svgText.match(/<style/g)).toHaveLength(1);
      const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
      expect(doc.querySelector('parsererror')).toBeNull();
      expect(doc.documentElement.querySelector(':scope > style')).not.toBeNull();
    });

    it('round-trips css that xml has to escape', () => {
      // query-string ampersands are common in font urls; serialized as raw & the file would not parse
      const css = '@font-face { font-family: A & B; src: url(font.woff2?v=1&w=2); }';
      const svgText = getStitchedChartsSvgText([container, second], { cols: 2, fontFaceCss: css })!;
      const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
      expect(doc.querySelector('parsererror')).toBeNull();
      expect(doc.querySelector('style')!.textContent).toBe(css);
    });
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

  // Regression: a throw inside onload escaped the handler, not the executor,
  // so the promise never settled. jsdom never loads images, hence the stub.
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

  // cols is an upper bound: columns no chart can reach would only pad the image
  it('does not reserve columns beyond the chart count', () => {
    const svgText = getStitchedChartsSvgText([container, secondContainer], { cols: 4 })!;
    expect(outerSize(svgText)).toEqual({ width: '800', height: '300' });
  });

  it('still leaves the empty cell of a partly-filled last row', () => {
    // 3 charts at 2 columns is a 2x2 grid; the fourth cell has nothing to hold
    const svgText = getStitchedChartsSvgText([container, container, container], { cols: 2 })!;
    expect(outerSize(svgText)).toEqual({ width: '800', height: '600' });
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

/**
 * TEST-1: the PNG success paths — the `.then(blob => { saveBlob(...); return true; })`
 * callbacks — had never executed, and `getStitchedSize` was never called at all. That is the
 * function B1 broke: multi-chart PNG export shipped permanently non-functional and nothing
 * noticed. A typo in its width=/height= regex would rasterize every stitched export at 1x1.
 */
describe('png export success paths', () => {
  const OriginalImage = globalThis.Image;
  let canvases: HTMLCanvasElement[] = [];
  let downloads: { href: string; download: string }[] = [];
  let restore: (() => void)[] = [];

  beforeEach(() => {
    canvases = [];
    downloads = [];

    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    (globalThis as unknown as { Image: unknown }).Image = FakeImage;

    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(function (this: HTMLCanvasElement) {
        canvases.push(this);
        return { drawImage() {} } as unknown as CanvasRenderingContext2D;
      });
    const toBlob = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation(function (callback: BlobCallback) {
        callback(new Blob(['png'], { type: 'image/png' }));
      });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloads.push({ href: this.href, download: this.download });
      });
    if (typeof URL.createObjectURL !== 'function') {
      (URL as unknown as { createObjectURL: unknown }).createObjectURL = () => 'blob:fake';
      (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = () => {};
    }

    restore = [() => getContext.mockRestore(), () => toBlob.mockRestore(), () => click.mockRestore(),
      () => { (globalThis as unknown as { Image: unknown }).Image = OriginalImage; }];
  });

  afterEach(() => {
    for (const undo of restore) {
      undo();
    }
    restore = [];
  });

  it('rasterizes a single chart at the requested scale and downloads it', async () => {
    await expect(exportPNG(container, { scale: 2 })).resolves.toBe(true);

    expect(canvases).toHaveLength(1);
    expect(canvases[0].width).toBe(800);
    expect(canvases[0].height).toBe(600);
    expect(downloads).toHaveLength(1);
    expect(downloads[0].download.endsWith('.png')).toBe(true);
  });

  it('honours a scale of 1', async () => {
    await expect(exportPNG(container, { scale: 1 })).resolves.toBe(true);
    expect(canvases[0].width).toBe(400);
    expect(canvases[0].height).toBe(300);
  });

  it('sizes a stitched export from the stitched svg, not from one chart', async () => {
    const second = document.createElement('div');
    document.body.appendChild(second);
    const secondChart = createDefaultChart(second, { config: rawConfig(), data: rows, width: 400, height: 300 });
    try {
      const svgText = getStitchedChartsSvgText([container, second], { cols: 2 })!;
      const stitchedWidth = Number.parseFloat(/\bwidth="([\d.]+)"/.exec(svgText)![1]);
      const stitchedHeight = Number.parseFloat(/\bheight="([\d.]+)"/.exec(svgText)![1]);
      // two charts side by side, so this must exceed one chart's width — the assertion that
      // pins getStitchedSize rather than a per-chart size sneaking through
      expect(stitchedWidth).toBeGreaterThan(400);

      await expect(exportChartsPNG([container, second], { cols: 2, scale: 2 })).resolves.toBe(true);

      expect(canvases).toHaveLength(1);
      expect(canvases[0].width).toBe(Math.round(stitchedWidth * 2));
      expect(canvases[0].height).toBe(Math.round(stitchedHeight * 2));
      expect(downloads).toHaveLength(1);
      expect(downloads[0].download.endsWith('.png')).toBe(true);
    }
    finally {
      secondChart.destroy();
      second.remove();
    }
  });

  it('resolves false for a stitched export with no charts in it', async () => {
    const empty = document.createElement('div');
    await expect(exportChartsPNG([empty], { cols: 1 })).resolves.toBe(false);
    expect(downloads).toHaveLength(0);
  });
});
