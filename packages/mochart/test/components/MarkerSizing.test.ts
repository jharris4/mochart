/**
 * markerProperty size interpolation: sizes come from a clamped scale over the
 * marker value domain — sqrt by default (marker area tracks the value),
 * linear opt-in via markerSizeScale — so fractional-extent domains span the
 * full configured size range and constant marker values land mid-range.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { createDefaultChart } from '../../src/createChart';
import { getSymbolGenerator } from '../../src/utils/shapeUtils';
import type { ChartHandle } from '../../src/createChart';
import type { DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';
import { getIdCssSelector } from '../../src/utils/ChartDom';

const VERSION = '1.0.0';
const MARKER_MIN_SIZE = 4;
const MARKER_SIZE = 12;

let handles: ChartHandle<DefaultChartProps>[] = [];

function markerPath(size: number): string {
  return getSymbolGenerator(size, 'circle')()!;
}

function mountChart(data: readonly unknown[], seriesOverrides: Record<string, unknown> = {}): Element {
  const config = {
    version: VERSION,
    animation: { animate: false },
    tooltip: { visible: false },
    categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
    series: [{
      property: 'sales', renderer: 'line', markerShape: 'circle',
      markerProperty: 'size', markerSize: MARKER_SIZE, markerMinSize: MARKER_MIN_SIZE,
      ...seriesOverrides
    }]
  } as unknown as MochartInputConfig;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const handle = createDefaultChart(container, {
    config, data, width: 800, height: 600
  } as DefaultChartProps);
  handles.push(handle);
  return container;
}

function renderedMarkerPaths(container: Element): Array<string | null> {
  return [0, 1, 2].map(i => container.querySelector(getIdCssSelector('seriesMarker', i))!.getAttribute('d'));
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

describe('markerProperty size scale', () => {
  it('defaults to sqrt: marker diameter follows the square root of the value', () => {
    const container = mountChart([
      { month: 'Jan', sales: 10, size: 0 },
      { month: 'Feb', sales: 20, size: 0.25 },
      { month: 'Mar', sales: 30, size: 1 }
    ]);

    // sqrt(0.25) = 0.5 of the domain, so the middle marker sits mid-range
    expect(renderedMarkerPaths(container)).toEqual([
      markerPath(MARKER_MIN_SIZE), markerPath(8), markerPath(MARKER_SIZE)
    ]);
  });

  it('spans the full size range when a linear domain extent is fractional', () => {
    const container = mountChart([
      { month: 'Jan', sales: 10, size: 0 },
      { month: 'Feb', sales: 20, size: 0.25 },
      { month: 'Mar', sales: 30, size: 0.5 }
    ], { markerSizeScale: 'linear' });

    expect(renderedMarkerPaths(container)).toEqual([
      markerPath(MARKER_MIN_SIZE), markerPath(8), markerPath(MARKER_SIZE)
    ]);
  });

  it('renders constant marker values at the midpoint of the size range', () => {
    const container = mountChart([
      { month: 'Jan', sales: 10, size: 2 },
      { month: 'Feb', sales: 20, size: 2 },
      { month: 'Mar', sales: 30, size: 2 }
    ]);

    const midPath = markerPath((MARKER_MIN_SIZE + MARKER_SIZE) / 2);
    expect(renderedMarkerPaths(container)).toEqual([midPath, midPath, midPath]);
  });
});
