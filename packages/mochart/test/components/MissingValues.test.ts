// missingValues 'connect' index-mapping regressions: positions compact only for 'connect', and the compacted->raw
// remap (skipCategoryIndexMap) must track the data and feed every raw-indexed lookup (focus, colors, labels, marker sizes).
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { createDefaultChart } from '../../src/createChart';
import type { ChartHandle } from '../../src/createChart';
import type { ChartFocus, DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';
import { getCssSelector, getIdCssSelector } from '../../src/utils/ChartDom';

const VERSION = '1.0.0';
const WIDTH = 800;
const HEIGHT = 600;

// defaultColors from the color palette defaults
const PALETTE_1 = '#ff7f0e';
const PALETTE_2 = '#2ca02c';

let handles: ChartHandle<DefaultChartProps>[] = [];

function makeConfig(seriesOverrides: Record<string, unknown>): MochartInputConfig {
  return {
    version: VERSION,
    animation: { animate: false },
    tooltip: { visible: false },
    categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
    series: [{ property: 'sales', ...seriesOverrides }]
  } as unknown as MochartInputConfig;
}

function mountChart(config: MochartInputConfig, data: readonly unknown[], callbacks: Partial<DefaultChartProps> = {}): { container: Element; handle: ChartHandle<DefaultChartProps> } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const handle = createDefaultChart(container, {
    config, data, width: WIDTH, height: HEIGHT, ...callbacks
  } as DefaultChartProps);
  handles.push(handle);
  return { container, handle };
}

function click(target: Element): void {
  target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

beforeAll(() => {
  installSvgMeasurementShims();
});

afterEach(() => {
  for (const handle of handles) {
    handle.destroy();
  }
  handles = [];
  document.body.innerHTML = '';
});

describe('missingValues base', () => {
  // Positions are not compacted in this combination, so the raw-index remap
  // must be the identity, not an empty-map lookup.
  it('still renders labels, markers, error bars and value colors', () => {
    const rows = [
      { month: 'Jan', sales: 10, low: 8, high: 12 },
      { month: 'Feb' },
      { month: 'Mar', sales: 30, low: 27, high: 33 }
    ];
    const { container } = mountChart(makeConfig({
      renderer: 'bar', missingValues: 'base',
      labelProperty: 'sales', markerShape: 'circle', colorProperty: 'sales',
      errorLowProperty: 'low', errorHighProperty: 'high'
    }), rows);

    const labels = container.querySelectorAll(getCssSelector('seriesLabel'));
    expect(labels.length).toBe(2);
    expect([...labels].map(label => label.textContent)).toEqual(['10.00', '30.00']);
    expect(container.querySelectorAll(getCssSelector('seriesMarker')).length).toBe(2);
    expect(container.querySelectorAll(getCssSelector('seriesErrorBar')).length).toBe(2);

    const fills = [...container.querySelectorAll(getCssSelector('seriesBar'))].map(bar => bar.getAttribute('fill'));
    expect(fills.length).toBe(3);
    expect(fills.some(fill => fill !== null && fill.includes('NaN'))).toBe(false);
  });
});

describe('missingValues connect category-index remapping', () => {
  it('remaps click focus through the current data, not a stale map', () => {
    const focuses: ChartFocus[] = [];
    const { container, handle } = mountChart(
      makeConfig({ renderer: 'bar', missingValues: 'connect', focusCategoryOnClick: true }),
      [{ month: 'Jan', sales: 10 }, { month: 'Feb' }, { month: 'Mar', sales: 30 }],
      { onFocus: focus => { focuses.push(focus); } }
    );

    // bars are keyed by compacted index: bar-1 is raw category 2 (Mar)
    click(container.querySelector(getIdCssSelector('seriesBar', '1'))!);
    expect(focuses[focuses.length - 1]!.focusedCategoryIndex).toBe(2);

    // same categories, but now Feb is defined and Mar is missing: bar-1 is raw category 1
    handle.update({ data: [{ month: 'Jan', sales: 10 }, { month: 'Feb', sales: 20 }, { month: 'Mar' }] } as Partial<DefaultChartProps>);
    click(container.querySelector(getIdCssSelector('seriesBar', '1'))!);
    expect(focuses[focuses.length - 1]!.focusedCategoryIndex).toBe(1);
  });

  it('keeps categoryIndex palette colors raw-indexed across a gap', () => {
    const { container } = mountChart(makeConfig({
      renderer: 'bar', missingValues: 'connect',
      shapeStyle: { normal: { fillColor: 'categoryIndex' } }
    }), [{ month: 'Jan', sales: 10 }, { month: 'Feb' }, { month: 'Mar', sales: 30 }]);

    // bar-1 is raw category 2, so it takes palette slot 2, not slot 1
    const bar = container.querySelector(getIdCssSelector('seriesBar', '1'))!;
    expect(bar.getAttribute('fill')).toBe(PALETTE_2);
    expect(bar.getAttribute('fill')).not.toBe(PALETTE_1);
  });

  it('keeps markerProperty sizes raw-indexed when marker values have their own gaps', () => {
    const { container } = mountChart(makeConfig({
      renderer: 'line', missingValues: 'connect', markerShape: 'circle', markerProperty: 'size'
    }), [
      { month: 'Jan', sales: 10, size: 4 },
      { month: 'Feb', sales: 20 },
      { month: 'Mar', sales: 30, size: 8 }
    ]);

    // Feb has a value but no marker value: only its own marker is dropped
    expect(container.querySelector(getIdCssSelector('seriesMarker', '0'))).not.toBeNull();
    expect(container.querySelector(getIdCssSelector('seriesMarker', '1'))).toBeNull();
    expect(container.querySelector(getIdCssSelector('seriesMarker', '2'))).not.toBeNull();
  });
});
