/**
 * Regression: a series-only focus change landing inside the focus tween's cancel-window delay built
 * its target from focusData's stale pre-pin category index, silently dropping the category pin.
 * The tween target must always derive from the input focus.
 */
import { describe, it, beforeAll, expect } from 'vitest';
import { installSvgMeasurementShims } from '../components/svgShims';
import { installFakeFrameClock, runFrames, mountContainer } from '../components/helpers';
import { getIdCssSelector } from '../../src/utils/ChartDom';

let mochart: typeof import('../../src');

beforeAll(async () => {
  installSvgMeasurementShims();
  installFakeFrameClock();
  mochart = await import('../../src');
});

const data = [
  { month: 'Jan', sales: 10, costs: 4 },
  { month: 'Feb', sales: 20, costs: 8 },
  { month: 'Mar', sales: 30, costs: 12 }
];

function mountChart() {
  const { createChart, enhanceConfig, ArrayOfObjectsDataProvider } = mochart;
  const mochartConfig = enhanceConfig({
    version: '1.0.0',
    categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
    series: [
      { id: 'sales', property: 'sales', renderer: 'bar' },
      { id: 'costs', property: 'costs', renderer: 'bar' }
    ]
  });
  const container = mountContainer();
  const chart = createChart(container, {
    mochartConfig,
    dataProvider: new ArrayOfObjectsDataProvider(data),
    width: 300,
    height: 200
  });
  runFrames();
  return { chart, container };
}

function barOpacities(container: Element, seriesId: string): (string | null)[] {
  return Array.from(container.querySelectorAll(getIdCssSelector('series', seriesId) + ' path'))
    .map(path => path.getAttribute('fill-opacity'));
}

describe('focus tween target', () => {
  it('keeps the category pin when a series focus lands inside the cancel window', () => {
    const { chart, container } = mountChart();

    // pin the category, then focus a series before any frame runs — the
    // category tween is still inside its start delay when it gets canceled
    chart.update({ focusedCategoryIndex: 1 });
    chart.update({ focusedCategoryIndex: 1, focusedSeriesId: 'sales' });
    runFrames();

    // costs is series-defocused (0.5), but its bar at the pinned category
    // still combines in the category focus (1); losing the pin renders 0.5,0.5,0.5
    expect(barOpacities(container, 'costs')).toEqual(['0.5', '1', '0.5']);
    // the focused series is fully focused throughout
    expect(barOpacities(container, 'sales')).toEqual(['1', '1', '1']);

    // clearing the series focus alone leaves the pure category-pinned state
    chart.update({ focusedCategoryIndex: 1, focusedSeriesId: null });
    runFrames();
    expect(barOpacities(container, 'costs')).toEqual(['0.5', '1', '0.5']);
    expect(barOpacities(container, 'sales')).toEqual(['0.5', '1', '0.5']);
  });
});
