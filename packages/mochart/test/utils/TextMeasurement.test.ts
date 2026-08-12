/**
 * Legend item measurement with showInLegend: false series: the DOM only holds
 * legend items for the visible series, so the measured bounds must line up
 * with those elements. Regression test — the expected list used to be every
 * series, so the element count never matched and each item silently fell back
 * to default 20px bounds, mis-sizing (and mis-centering) the legend.
 *
 * The bounds are keyed by series id rather than legend position, so that a set
 * measured one frame ago cannot describe a different series after showInLegend
 * flips (see ANIM-7).
 */
import { describe, it, expect } from 'vitest';
import { getLegendItemBoundsList, getLegendItemTextRawBounds, getSvgMaxWidthAndHeight } from '../../src/utils/TextMeasurement';
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

function legendIds(mochartConfig: EnhancedMochartConfig): string[] {
  return mochartConfig.series.filter(seriesConfig => seriesConfig.showInLegend).map(seriesConfig => seriesConfig.id);
}

describe('getLegendItemTextRawBounds', () => {
  it('measures only the showInLegend series, matching the rendered items', () => {
    const mochartConfig = makeConfig([false, false, true, true]);
    // the DOM holds two rendered legend items — one per visible series
    const bounds = getLegendItemTextRawBounds(mochartConfig, makeDomAccessors([30, 50]));
    const [thirdId, fourthId] = legendIds(mochartConfig);
    expect(bounds).toEqual({
      [thirdId]: { width: 30, height: 10 },
      [fourthId]: { width: 50, height: 10 }
    });
  });

  it('measures every series when all are in the legend', () => {
    const mochartConfig = makeConfig([true, true]);
    const bounds = getLegendItemTextRawBounds(mochartConfig, makeDomAccessors([30, 50]));
    const [firstId, secondId] = legendIds(mochartConfig);
    expect(bounds).toEqual({
      [firstId]: { width: 30, height: 10 },
      [secondId]: { width: 50, height: 10 }
    });
  });
});

describe('getLegendItemBoundsList', () => {
  it('lists the measured bounds in legend order', () => {
    const mochartConfig = makeConfig([false, true, true]);
    const bounds = getLegendItemTextRawBounds(mochartConfig, makeDomAccessors([30, 50]));
    expect(getLegendItemBoundsList(mochartConfig, bounds)).toEqual([
      { width: 30, height: 10 },
      { width: 50, height: 10 }
    ]);
  });

  // ANIM-7: measuring runs a frame behind drawing, so after showInLegend flips the stored bounds
  // describe the old item set. Keyed by id, a series that just joined reads as unmeasured for one
  // frame instead of borrowing another series' size or running the list short.
  it('falls back to unmeasured for a series that just joined the legend', () => {
    const before = makeConfig([false, true]);
    const measured = getLegendItemTextRawBounds(before, makeDomAccessors([50]));
    const after = makeConfig([true, true]);
    expect(getLegendItemBoundsList(after, measured)).toEqual([
      { width: 0, height: 0 },
      { width: 50, height: 10 }
    ]);
  });

  it('ignores bounds for a series that just left the legend', () => {
    const before = makeConfig([true, true]);
    const measured = getLegendItemTextRawBounds(before, makeDomAccessors([30, 50]));
    const after = makeConfig([false, true]);
    expect(getLegendItemBoundsList(after, measured)).toEqual([
      { width: 50, height: 10 }
    ]);
  });
});

describe('getSvgMaxWidthAndHeight', () => {
  const element = (width: number, height: number): SVGGraphicsElement =>
    ({ getBBox: () => ({ x: 0, y: 0, width, height }) } as unknown as SVGGraphicsElement);

  it('measures all-zero bboxes as 0x0 so the default-bounds fallback can trigger', () => {
    // regression: a display:none container reports 0x0 for every element; this
    // must not round up to 1x1 or the re-measure retry loop never runs
    expect(getSvgMaxWidthAndHeight([element(0, 0), element(0, 0)])).toEqual({ width: 0, height: 0 });
  });

  it('takes the per-dimension max over the elements', () => {
    expect(getSvgMaxWidthAndHeight([element(0, 0), element(30.2, 9.5), element(12, 14)])).toEqual({ width: 31, height: 14 });
  });

  it('measures an empty list as 0x0', () => {
    expect(getSvgMaxWidthAndHeight([])).toEqual({ width: 0, height: 0 });
  });
});
