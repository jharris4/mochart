import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { createDefaultChart, mochartCssClasses } from '@mochart/core';
import type { ChartHandle, DefaultChartProps } from '@mochart/core';
import { findChartSvg, getChartSvgText, exportSVG, exportPNG } from '../src/index';

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
});
