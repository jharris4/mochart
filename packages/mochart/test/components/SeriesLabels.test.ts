// The fraction guards that hide series labels which would not fit: by position within the value domain, and by the extent of the value itself.
import { describe, it, expect, beforeAll } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { mountContainer, trackHandle, mockBoundingClientRect } from './helpers';
import { createDefaultChart } from '../../src/createChart';
import type { DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';
import { getCssSelector } from '../../src/utils/ChartDom';

const WIDTH = 800;
const HEIGHT = 600;

const rows = [
  { month: 'Jan', sales: 10, floor: 8 },
  { month: 'Feb', sales: 50, floor: 10 },
  { month: 'Mar', sales: 100, floor: 20 }
];

function surviving(container: Element): string[] {
  return [...container.querySelectorAll(getCssSelector('seriesLabel'))].map((label) => label.textContent ?? '');
}

function labelTexts(seriesOverrides: Record<string, unknown>, valueAxes?: unknown[]): string[] {
  const container = mountContainer();
  const config = {
    version: '1.0.0',
    animation: { animate: false },
    categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
    series: [{ property: 'sales', renderer: 'bar', labelProperty: 'sales', ...seriesOverrides }],
    ...(valueAxes ? { valueAxes } : {})
  } as unknown as MochartInputConfig;
  trackHandle(createDefaultChart(container, {
    config, data: rows, width: WIDTH, height: HEIGHT
  } as DefaultChartProps));
  return surviving(container);
}

beforeAll(() => {
  installSvgMeasurementShims();
  mockBoundingClientRect(WIDTH, HEIGHT);
});

describe('series label fraction guards', () => {
  it('labels every category when no guard is set', () => {
    expect(labelTexts({})).toEqual(['10.00', '50.00', '100.00']);
  });

  it('hides labels below labelMinPositionFraction', () => {
    // domain 10–100, so the guard hides everything positioned below 55
    expect(labelTexts({ labelMinPositionFraction: 0.5 })).toEqual(['100.00']);
  });

  it('hides labels above labelMaxPositionFraction', () => {
    expect(labelTexts({ labelMaxPositionFraction: 0.5 })).toEqual(['10.00', '50.00']);
  });

  it('hides labels whose value spans less than labelMinRangeFraction', () => {
    // no axis base, so each unstacked value measures from the zero baseline: extent 90 hides 10
    expect(labelTexts({ labelMinRangeFraction: 0.5 }, [{ base: null }])).toEqual(['50.00', '100.00']);
  });

  it('measures a stacked series against the domain minimum when the axis has no base', () => {
    const container = mountContainer();
    trackHandle(createDefaultChart(container, {
      config: {
        version: '1.0.0',
        animation: { animate: false },
        categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
        valueAxes: [{ id: 'VA0', base: null }],
        seriesStacks: [{ id: 'S', axis: 'VA0' }],
        series: [
          { property: 'floor', renderer: 'bar', stack: 'S', axis: 'VA0' },
          { property: 'sales', renderer: 'bar', stack: 'S', axis: 'VA0',
            labelProperty: 'sales', labelMinRangeFraction: 0.5 }
        ]
      } as unknown as MochartInputConfig,
      data: rows, width: WIDTH, height: HEIGHT
    } as DefaultChartProps));
    // stack extents 10/50/100 against a threshold of half the stacked domain: only Mar survives
    expect(surviving(container)).toEqual(['100.00']);
  });

  it('measures a ranged series against its own range property', () => {
    // range extents 2/40/80 against half of the 8–100 domain: only Mar survives
    expect(labelTexts(
      { rangeProperty: 'floor', labelMinRangeFraction: 0.5 },
      [{ base: null }]
    )).toEqual(['100.00']);
  });
});
