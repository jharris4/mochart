import { describe, expect, it } from 'vitest';
import { getTooltipLayoutInfo } from '../../src/layout/TooltipLayout';
import type { EnhancedMochartConfig } from '../../src/types/enhanced';
import type { ChartLayoutInfo } from '../../src/types/layout';

const mochartConfig = {
  tooltip: {
    keepInside: true,
    snapToCategory: false,
    backgroundStyle: { strokeWidth: null },
    padding: { top: 0, right: 0, bottom: 0, left: 0 }
  },
  plot: { inverted: false }
} as unknown as EnhancedMochartConfig;

// Regression: the keepInside clamp rectangle's y was computed from the chart
// content's x, so any layout where the content origin is asymmetric (x !== y)
// clamped the tooltip into a vertically shifted band.
const layoutInfo = {
  chartContentLayoutInfo: { x: 0, y: 100 },
  seriesLayoutInfo: { x: 10, y: 20, width: 200, height: 100, categoryExtent: 200, valueExtent: 100 },
  containerLayoutInfo: { x: 0, y: 0, width: 400, height: 400 }
} as unknown as ChartLayoutInfo;

describe('tooltip keepInside clamping', () => {
  it('clamps to the plot top-left at the correct vertical origin', () => {
    const bounds = getTooltipLayoutInfo(mochartConfig, { width: 40, height: 30 }, layoutInfo, { positions: [] }, -1, 0, 0);
    expect(bounds).toEqual({ x: 10, y: 120, width: 40, height: 30 });
  });

  it('clamps to the plot bottom-right edges', () => {
    const bounds = getTooltipLayoutInfo(mochartConfig, { width: 40, height: 30 }, layoutInfo, { positions: [] }, -1, 1, 1);
    expect(bounds).toEqual({ x: 170, y: 190, width: 40, height: 30 });
  });
});
