/**
 * Legend item measurement with showInLegend: false series: the DOM only holds
 * legend items for the visible series, so the measured bounds must line up
 * with those elements. Regression test — the expected list used to be every
 * series, so the element count never matched and each item silently fell back
 * to default 20px bounds, mis-sizing (and mis-centering) the legend.
 */
import { describe, it, expect } from 'vitest';
import { getLegendItemTextRawBounds } from '../../src/utils/TextMeasurement';
import { enhanceConfig } from '../../src';
import type { ChartDomAccessors } from '../../src/types/chart';
import type { EnhancedMochartConfig } from '../../src/types/enhanced';

function makeConfig(showInLegendFlags: boolean[]): EnhancedMochartConfig {
  return enhanceConfig({
    version: '1.0.0',
    categoryAxis: { property: 'label' },
    series: showInLegendFlags.map((showInLegend, i) => ({ property: 'p' + i, showInLegend }))
  } as never) as EnhancedMochartConfig;
}

function fakeTextElement(width: number): SVGGraphicsElement {
  return { getBBox: () => ({ x: 0, y: 0, width, height: 10 }) } as unknown as SVGGraphicsElement;
}

function makeDomAccessors(widths: number[]): ChartDomAccessors {
  return {
    getLegendItemTextRawDomElements: () => widths.map(fakeTextElement)
  } as unknown as ChartDomAccessors;
}

describe('getLegendItemTextRawBounds', () => {
  it('measures only the showInLegend series, matching the rendered items', () => {
    const mochartConfig = makeConfig([false, false, true, true]);
    // the DOM holds two rendered legend items — one per visible series
    const bounds = getLegendItemTextRawBounds(mochartConfig, makeDomAccessors([30, 50]));
    expect(bounds).toEqual([
      { width: 30, height: 10 },
      { width: 50, height: 10 }
    ]);
  });

  it('measures every series when all are in the legend', () => {
    const mochartConfig = makeConfig([true, true]);
    const bounds = getLegendItemTextRawBounds(mochartConfig, makeDomAccessors([30, 50]));
    expect(bounds).toEqual([
      { width: 30, height: 10 },
      { width: 50, height: 10 }
    ]);
  });
});
