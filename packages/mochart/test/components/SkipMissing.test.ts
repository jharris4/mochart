/**
 * Regression tests for the skipMissing index-mapping cluster: position
 * compaction only happens for skipMissing without showMissingAtBase, and the
 * compacted->raw remap (skipGroupIndexMap) must stay in sync with the data and
 * feed every raw-indexed lookup (focus, colors, labels, marker sizes).
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { createDefaultChart } from '../../src/createChart';
import type { ChartHandle } from '../../src/createChart';
import type { ChartFocus, DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';

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
    animationConfig: { animate: false },
    tooltipConfig: { visible: false },
    groupAxisConfig: { property: 'month', type: 'string', scale: 'ordinal' },
    seriesConfigs: [{ property: 'sales', ...seriesOverrides }]
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

describe('skipMissing with showMissingAtBase', () => {
  // Positions are not compacted in this combination, so the raw-index remap
  // must be the identity, not an empty-map lookup.
  it('still renders labels, markers, error bars and value colors', () => {
    const rows = [
      { month: 'Jan', sales: 10, low: 8, high: 12 },
      { month: 'Feb' },
      { month: 'Mar', sales: 30, low: 27, high: 33 }
    ];
    const { container } = mountChart(makeConfig({
      renderer: 'bar', skipMissing: true, showMissingAtBase: true,
      labelProperty: 'sales', markerShape: 'circle', colorProperty: 'sales',
      errorLowProperty: 'low', errorHighProperty: 'high'
    }), rows);

    const labels = container.querySelectorAll('.mochart-series-label');
    expect(labels.length).toBe(2);
    expect([...labels].map(label => label.textContent)).toEqual(['10.00', '30.00']);
    expect(container.querySelectorAll('.mochart-series-marker').length).toBe(2);
    expect(container.querySelectorAll('.mochart-series-error-bar').length).toBe(2);

    const fills = [...container.querySelectorAll('.mochart-series-bar')].map(bar => bar.getAttribute('fill'));
    expect(fills.length).toBe(3);
    expect(fills.some(fill => fill !== null && fill.includes('NaN'))).toBe(false);
  });
});

describe('skipMissing group-index remapping', () => {
  it('remaps click focus through the current data, not a stale map', () => {
    const focuses: ChartFocus[] = [];
    const { container, handle } = mountChart(
      makeConfig({ renderer: 'bar', skipMissing: true, focusGroupOnClick: true }),
      [{ month: 'Jan', sales: 10 }, { month: 'Feb' }, { month: 'Mar', sales: 30 }],
      { onFocus: focus => { focuses.push(focus); } }
    );

    // bars are keyed by compacted index: bar-1 is raw group 2 (Mar)
    click(container.querySelector('.mochart-series-bar-1')!);
    expect(focuses[focuses.length - 1]!.focusedGroupIndex).toBe(2);

    // same groups, but now Feb is defined and Mar is missing: bar-1 is raw group 1
    handle.update({ data: [{ month: 'Jan', sales: 10 }, { month: 'Feb', sales: 20 }, { month: 'Mar' }] } as Partial<DefaultChartProps>);
    click(container.querySelector('.mochart-series-bar-1')!);
    expect(focuses[focuses.length - 1]!.focusedGroupIndex).toBe(1);
  });

  it('keeps groupIndex palette colors raw-indexed across a gap', () => {
    const { container } = mountChart(makeConfig({
      renderer: 'bar', skipMissing: true,
      shapeStyle: { normal: { fillColor: 'groupIndex' } }
    }), [{ month: 'Jan', sales: 10 }, { month: 'Feb' }, { month: 'Mar', sales: 30 }]);

    // bar-1 is raw group 2, so it takes palette slot 2, not slot 1
    const bar = container.querySelector('.mochart-series-bar-1')!;
    expect(bar.getAttribute('fill')).toBe(PALETTE_2);
    expect(bar.getAttribute('fill')).not.toBe(PALETTE_1);
  });

  it('keeps markerProperty sizes raw-indexed when marker values have their own gaps', () => {
    const { container } = mountChart(makeConfig({
      renderer: 'line', skipMissing: true, markerShape: 'circle', markerProperty: 'size'
    }), [
      { month: 'Jan', sales: 10, size: 4 },
      { month: 'Feb', sales: 20 },
      { month: 'Mar', sales: 30, size: 8 }
    ]);

    // Feb has a value but no marker value: only its own marker is dropped
    expect(container.querySelector('.mochart-series-marker-0')).not.toBeNull();
    expect(container.querySelector('.mochart-series-marker-1')).toBeNull();
    expect(container.querySelector('.mochart-series-marker-2')).not.toBeNull();
  });
});
