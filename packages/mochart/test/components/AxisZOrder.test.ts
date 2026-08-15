// The nine axis `*Front` switches, each moving one piece of axis chrome from the back plot layer to the front one
import { describe, it, expect, beforeAll } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { mountContainer, trackHandle } from './helpers';
import { createDefaultChart } from '../../src/createChart';
import type { DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';
import { getCssSelector, getDescendantCssSelector } from '../../src/utils/ChartDom';
import type { MochartCssClassKey } from '../../src/utils/ChartDom';

const VERSION = '1.0.0';
const WIDTH = 800;
const HEIGHT = 600;

// a negative row puts base 0 inside the domain, which is what makes the base line drawn at all
const rows = [
  { month: 'Jan', sales: -10 },
  { month: 'Feb', sales: 20 },
  { month: 'Mar', sales: 30 }
];

function mountChart(categoryOverrides: Record<string, unknown>, valueOverrides: Record<string, unknown> = {}): Element {
  const container = mountContainer();
  const config = {
    version: VERSION,
    animation: { animate: false },
    // every optional piece of chrome switched on, so each layer test has something to move
    categoryAxis: { property: 'month', type: 'string', scale: 'ordinal', title: 'Month',
      showFocusRange: true, showGridLines: true, ...categoryOverrides },
    valueAxes: [{ id: 'VA0', title: 'Sales', base: 0,
      showFocusTickMarks: true, showGridLines: true, ...valueOverrides }],
    series: [{ axis: 'VA0', property: 'sales', renderer: 'bar' }]
  } as unknown as MochartInputConfig;
  trackHandle(createDefaultChart(container, { config, data: rows, width: WIDTH, height: HEIGHT } as DefaultChartProps));
  return container;
}

/** How many of a chrome element sit in the named plot layer. */
function countIn(container: Element, layer: 'plotBack' | 'plotFront', keys: MochartCssClassKey[]): number {
  return container.querySelectorAll(getDescendantCssSelector(layer, ...keys)).length;
}

beforeAll(() => {
  installSvgMeasurementShims();
});

// each switch, the axis it is set on, and the chrome element it moves
const switches: Array<{ key: string; axis: 'category' | 'value'; path: MochartCssClassKey[] }> = [
  { key: 'backgroundFront', axis: 'category', path: ['categoryAxis', 'axisBackground'] },
  { key: 'backgroundFront', axis: 'value', path: ['valueAxis', 'axisBackground'] },
  { key: 'axisLineFront', axis: 'category', path: ['categoryAxis', 'axisLine'] },
  { key: 'axisLineFront', axis: 'value', path: ['valueAxis', 'axisLine'] },
  { key: 'focusRangeFront', axis: 'category', path: ['categoryAxis', 'axisFocusRange'] },
  { key: 'focusRangeFront', axis: 'value', path: ['valueAxis', 'axisFocusRange'] },
  { key: 'tickMarkFront', axis: 'category', path: ['categoryAxis', 'axisTickMarks'] },
  { key: 'tickMarkFront', axis: 'value', path: ['valueAxis', 'axisTickMarks'] },
  { key: 'tickLabelFront', axis: 'category', path: ['categoryAxis', 'axisTickLabels'] },
  { key: 'tickLabelFront', axis: 'value', path: ['valueAxis', 'axisTickLabels'] },
  { key: 'titleFront', axis: 'category', path: ['categoryAxis', 'axisTitle'] },
  { key: 'titleFront', axis: 'value', path: ['valueAxis', 'axisTitle'] },
  { key: 'focusTickMarkFront', axis: 'category', path: ['categoryAxis', 'axisFocusTickMarks'] },
  { key: 'focusTickMarkFront', axis: 'value', path: ['valueAxis', 'axisFocusTickMarks'] },
  { key: 'gridLineFront', axis: 'category', path: ['categoryAxisGrid'] },
  { key: 'gridLineFront', axis: 'value', path: ['valueAxisGrid'] },
  { key: 'baseLineFront', axis: 'value', path: ['valueAxisBaseLine'] }
];

describe('axis chrome layer', () => {
  for (const { key, axis, path } of switches) {
    const what = path.join(' > ');
    it(`keeps ${what} behind the series until ${axis} axis ${key} moves it in front`, () => {
      const on = { [key]: true };
      const front = axis === 'category' ? mountChart(on) : mountChart({}, on);
      const back = mountChart({});

      // the default layer holds it and the other is empty, and setting the switch swaps that
      expect(countIn(back, 'plotBack', path)).toBeGreaterThan(0);
      expect(countIn(back, 'plotFront', path)).toBe(0);
      expect(countIn(front, 'plotFront', path)).toBe(countIn(back, 'plotBack', path));
      expect(countIn(front, 'plotBack', path)).toBe(0);
    });
  }

  it('moves only the switched piece, leaving the rest of the axis behind', () => {
    const container = mountChart({ titleFront: true });

    expect(countIn(container, 'plotFront', ['categoryAxis', 'axisTitle'])).toBe(1);
    expect(countIn(container, 'plotFront', ['categoryAxis', 'axisTickLabels'])).toBe(0);
    expect(countIn(container, 'plotBack', ['categoryAxis', 'axisTickLabels'])).toBe(1);
    expect(countIn(container, 'plotBack', ['categoryAxis', 'axisLine'])).toBe(1);
  });
});

describe('value axis base line', () => {
  it('draws a base line by default and drops it when showBaseLine is off', () => {
    expect(mountChart({}).querySelectorAll(getCssSelector('axisBaseLine')).length).toBeGreaterThan(0);
    expect(mountChart({}, { showBaseLine: false }).querySelectorAll(getCssSelector('axisBaseLine')).length).toBe(0);
  });
});
