// Threshold lines and their titles: title side, axis-side placement, and titleSnapToValue near the plot edges
import { describe, it, expect, beforeAll } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { mountContainer, trackHandle, mockBoundingClientRect } from './helpers';
import { createDefaultChart } from '../../src/createChart';
import type { DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';
import { getCssSelector, getDescendantCssSelector, getIdCssSelector } from '../../src/utils/ChartDom';

const WIDTH = 800;
const HEIGHT = 600;

const rows = [
  { month: 'Jan', sales: 10 },
  { month: 'Feb', sales: 50 },
  { month: 'Mar', sales: 100 }
];

const linearRows = [
  { x: 0, sales: 10 },
  { x: 50, sales: 50 },
  { x: 100, sales: 100 }
];

function mount(overrides: Record<string, unknown>, data: readonly unknown[] = rows): Element {
  const container = mountContainer();
  const config = {
    version: '1.0.0',
    animation: { animate: false },
    categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
    series: [{ property: 'sales', renderer: 'bar' }],
    ...overrides
  } as unknown as MochartInputConfig;
  trackHandle(createDefaultChart(container, {
    config, data, width: WIDTH, height: HEIGHT
  } as DefaultChartProps));
  return container;
}

/** A vertical threshold: a value axis on an upright plot. */
function valueThreshold(threshold: Record<string, unknown>, axisExtra: Record<string, unknown> = {}): Element {
  return mount({ valueAxes: [{ min: 0, max: 100, thresholds: [threshold], ...axisExtra }] });
}

/** A horizontal threshold: a linear category axis on an upright plot. */
function categoryThreshold(threshold: Record<string, unknown>, axisExtra: Record<string, unknown> = {}): Element {
  return mount({
    categoryAxis: { property: 'x', type: 'number', scale: 'linear', min: 0, max: 100, thresholds: [threshold], ...axisExtra },
    series: [{ property: 'sales', renderer: 'line' }]
  }, linearRows);
}

function titlePosition(container: Element): { x: number; y: number } {
  const title = container.querySelector(getCssSelector('axisThresholdTitle'));
  expect(title).not.toBeNull();
  const match = /translate\(([^,]+),([^)]+)\)/.exec(title!.getAttribute('transform') ?? '');
  expect(match).not.toBeNull();
  return { x: Number(match![1]), y: Number(match![2]) };
}

beforeAll(() => {
  installSvgMeasurementShims();
  mockBoundingClientRect(WIDTH, HEIGHT);
});

describe('threshold lines', () => {
  it('draws a value axis threshold', () => {
    expect(valueThreshold({ value: 50 }).querySelector(getCssSelector('axisThreshold'))).not.toBeNull();
  });

  it('draws a threshold behind the series when front is off', () => {
    expect(valueThreshold({ value: 50, front: false })
      .querySelector(getCssSelector('axisThreshold'))).not.toBeNull();
  });

  // the axis need not be drawn for its thresholds to be
  it('draws a threshold on a hidden axis', () => {
    const container = valueThreshold({ value: 50, title: 'T' }, { visible: false });
    expect(container.querySelector(getCssSelector('valueAxis'))).toBeNull();
    expect(container.textContent).toContain('T');
  });

  it('draws a category axis threshold on a date axis', () => {
    const container = mount({
      categoryAxis: {
        property: 'when', type: 'date', scale: 'linear',
        thresholds: [{ value: '2024-02-01T00:00:00.000Z', title: 'Launch' }]
      },
      series: [{ property: 'sales', renderer: 'line' }]
    }, [
      { when: new Date('2024-01-01T00:00:00.000Z'), sales: 10 },
      { when: new Date('2024-03-01T00:00:00.000Z'), sales: 40 }
    ]);
    expect(container.textContent).toContain('Launch');
  });

  // a threshold is a position on a continuous scale, so an ordinal axis has nowhere to put it
  it('draws no line for a threshold on an ordinal axis', () => {
    const container = mount({
      categoryAxis: { property: 'month', type: 'string', scale: 'ordinal', thresholds: [{ value: 1, title: 'Cut' }] }
    });
    expect(container.querySelector(getDescendantCssSelector('categoryAxisThreshold', 'axisThreshold'))).toBeNull();
    expect(container.textContent).not.toContain('Cut');
  });

  it('draws no line for a threshold outside the domain', () => {
    const container = valueThreshold({ value: 500, title: 'Far' });
    expect(container.querySelector(getCssSelector('axisThreshold'))).toBeNull();
    expect(container.textContent).not.toContain('Far');
  });
});

describe('threshold title placement', () => {
  it('puts a vertical title at the axis side', () => {
    const start = titlePosition(valueThreshold({ value: 50, title: 'T' }, { side: 'start' }));
    const end = titlePosition(valueThreshold({ value: 50, title: 'T' }, { side: 'end' }));
    expect(end.x).toBeGreaterThan(start.x);
  });

  it('puts a horizontal title at the axis side', () => {
    const start = titlePosition(categoryThreshold({ value: 50, title: 'T' }, { side: 'start' }));
    const end = titlePosition(categoryThreshold({ value: 50, title: 'T' }, { side: 'end' }));
    expect(end.y).toBeGreaterThan(start.y);
  });

  it('puts a vertical low title below the line and a high title above it', () => {
    const low = titlePosition(valueThreshold({ value: 50, title: 'T', titleSide: 'low' }));
    const high = titlePosition(valueThreshold({ value: 50, title: 'T', titleSide: 'high' }));
    expect(low.y).toBeGreaterThan(high.y);
  });

  it('puts a horizontal low title left of the line and a high title right of it', () => {
    const low = titlePosition(categoryThreshold({ value: 50, title: 'T', titleSide: 'low', titleSnapToValue: false }));
    const high = titlePosition(categoryThreshold({ value: 50, title: 'T', titleSide: 'high', titleSnapToValue: false }));
    expect(high.x).toBeGreaterThan(low.x);
  });
});

describe('titleSnapToValue', () => {
  // without snapping the title clamps flat against the plot edge; snapping
  // flips it to the other side of the line so it stays attached to it
  it('flips a vertical low title above a line near the plot floor', () => {
    const snapped = titlePosition(valueThreshold({ value: 2, title: 'T', titleSide: 'low', titleSnapToValue: true }));
    const clamped = titlePosition(valueThreshold({ value: 2, title: 'T', titleSide: 'low', titleSnapToValue: false }));
    expect(snapped.y).toBeLessThan(clamped.y);
  });

  it('flips a vertical high title below a line near the plot ceiling', () => {
    const snapped = titlePosition(valueThreshold({ value: 98, title: 'T', titleSide: 'high', titleSnapToValue: true }));
    const clamped = titlePosition(valueThreshold({ value: 98, title: 'T', titleSide: 'high', titleSnapToValue: false }));
    expect(snapped.y).toBeGreaterThan(clamped.y);
  });

  it('flips a horizontal low title right of a line near the plot start', () => {
    const snapped = titlePosition(categoryThreshold({ value: 2, title: 'T', titleSide: 'low', titleSnapToValue: true }));
    const clamped = titlePosition(categoryThreshold({ value: 2, title: 'T', titleSide: 'low', titleSnapToValue: false }));
    expect(snapped.x).toBeGreaterThan(clamped.x);
  });

  it('flips a horizontal high title left of a line near the plot end', () => {
    const snapped = titlePosition(categoryThreshold({ value: 95, title: 'T', titleSide: 'high', titleSnapToValue: true }));
    const clamped = titlePosition(categoryThreshold({ value: 95, title: 'T', titleSide: 'high', titleSnapToValue: false }));
    expect(snapped.x).toBeLessThan(clamped.x);
  });

  it('leaves a mid-domain vertical title where it is', () => {
    for (const titleSide of ['low', 'high'] as const) {
      const snapped = titlePosition(valueThreshold({ value: 50, title: 'T', titleSide, titleSnapToValue: true }));
      const unsnapped = titlePosition(valueThreshold({ value: 50, title: 'T', titleSide, titleSnapToValue: false }));
      expect(snapped).toEqual(unsnapped);
    }
  });

  it('leaves a mid-domain horizontal low title where it is', () => {
    const snapped = titlePosition(categoryThreshold({ value: 50, title: 'T', titleSide: 'low', titleSnapToValue: true }));
    const unsnapped = titlePosition(categoryThreshold({ value: 50, title: 'T', titleSide: 'low', titleSnapToValue: false }));
    expect(snapped).toEqual(unsnapped);
  });
});

describe('threshold styling', () => {
  it('applies an explicit line and title style', () => {
    const container = valueThreshold({
      value: 50, title: 'T',
      style: { normal: { strokeColor: '#ff0000', strokeOpacity: 0.5, strokeWidth: 3, strokeDashArray: '4 2' } },
      titleTextStyle: {
        normal: { strokeColor: '#0000ff', strokeOpacity: 0.9, strokeWidth: 2, strokeDashArray: '1 1',
          fillColor: '#008000', fillOpacity: 0.8 }
      }
    });
    const line = container.querySelector(getCssSelector('axisThreshold') + ' line')!;
    expect(line.getAttribute('stroke')).toBe('#ff0000');
    expect(line.getAttribute('stroke-dasharray')).toBe('4 2');
    const text = container.querySelector(getCssSelector('axisThresholdTitle') + ' text')!;
    expect(text.getAttribute('fill')).toBe('#008000');
    expect(text.getAttribute('stroke')).toBe('#0000ff');
  });

  for (const useSeriesFocus of [true, false]) {
    it(`follows the focused series when useSeriesFocus is ${useSeriesFocus}`, () => {
      const container = mountContainer();
      trackHandle(createDefaultChart(container, {
        config: {
          version: '1.0.0',
          animation: { animate: false },
          categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
          valueAxes: [{ id: 'VA0', min: 0, max: 100, useSeriesFocus,
            thresholds: [{ value: 50, title: 'T' }] }],
          series: [
            { id: 'sales', property: 'sales', renderer: 'bar', axis: 'VA0' },
            { id: 'other', property: 'sales', renderer: 'line', axis: 'VA0' }
          ]
        } as unknown as MochartInputConfig,
        data: rows, width: WIDTH, height: HEIGHT, focusedSeriesId: 'sales'
      } as DefaultChartProps));
      expect(container.querySelector(getCssSelector('axisThreshold'))).not.toBeNull();
    });
  }

  function mountOrphanAxis(visibleWhenAllFiltered: boolean): Element {
    const container = mountContainer();
    trackHandle(createDefaultChart(container, {
      config: {
        version: '1.0.0',
        animation: { animate: false },
        categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
        valueAxes: [
          { id: 'VA0' },
          { id: 'VA1', min: 0, max: 100, visibleWhenAllFiltered, thresholds: [{ value: 50, title: 'Orphan' }] }
        ],
        series: [{ property: 'sales', renderer: 'bar', axis: 'VA0' }]
      } as unknown as MochartInputConfig,
      data: rows, width: WIDTH, height: HEIGHT
    } as DefaultChartProps));
    return container;
  }

  // thresholds follow the axis: a series-less axis draws (and keeps its thresholds) only when visibleWhenAllFiltered
  it('keeps the thresholds of a visibleWhenAllFiltered axis no series uses', () => {
    const container = mountOrphanAxis(true);
    expect(container.querySelector(getIdCssSelector('valueAxis', 'VA1'))).not.toBeNull();
    expect(container.textContent).toContain('Orphan');
  });

  it('hides the thresholds of a value axis no series uses when visibleWhenAllFiltered is off', () => {
    const container = mountOrphanAxis(false);
    expect(container.querySelector(getIdCssSelector('valueAxis', 'VA1'))).toBeNull();
    expect(container.textContent).not.toContain('Orphan');
  });

  function mountAllFiltered(visibleWhenAllFiltered: boolean): Element {
    const container = mountContainer();
    trackHandle(createDefaultChart(container, {
      config: {
        version: '1.0.0',
        animation: { animate: false },
        categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
        valueAxes: [{ id: 'VA0', min: 0, max: 100, visibleWhenAllFiltered, adjustForFiltering: false,
          thresholds: [{ value: 50, title: 'Target' }] }],
        series: [{ id: 'sales', property: 'sales', renderer: 'bar', axis: 'VA0' }]
      } as unknown as MochartInputConfig,
      data: rows, width: WIDTH, height: HEIGHT, filteredSeriesIds: { sales: true }
    } as DefaultChartProps));
    return container;
  }

  // the axis and its grid stay on screen for a visibleWhenAllFiltered axis, so its thresholds must too
  it('keeps the thresholds of a visibleWhenAllFiltered axis whose series are all filtered', () => {
    const container = mountAllFiltered(true);
    expect(container.querySelector(getCssSelector('valueAxis'))).not.toBeNull();
    expect(container.querySelector(getCssSelector('axisThreshold'))).not.toBeNull();
    expect(container.textContent).toContain('Target');
  });

  it('hides the thresholds of an all-filtered axis when visibleWhenAllFiltered is off', () => {
    const container = mountAllFiltered(false);
    expect(container.querySelector(getCssSelector('valueAxis'))).toBeNull();
    expect(container.querySelector(getCssSelector('axisThreshold'))).toBeNull();
    expect(container.textContent).not.toContain('Target');
  });
});

describe('degenerate thresholds', () => {
  // datePrimitive lets an iso string through on a numeric axis, where it is not a number
  it('draws no line for a date-string threshold on a numeric axis', () => {
    const container = valueThreshold({ value: '2024-01-01T00:00:00.000Z', title: 'Wrong' });
    expect(container.querySelector(getCssSelector('axisThreshold'))).toBeNull();
    expect(container.textContent).not.toContain('Wrong');
  });

  // a title more than half the plot deep has no room on either side of the
  // line, so snapping leaves it where the edge clamped it
  const oversizedPadding = { top: 200, right: 2, bottom: 200, left: 2 };

  it('leaves a vertical title clamped when neither side of the line has room', () => {
    for (const titleSide of ['low', 'high'] as const) {
      const threshold = { value: 50, title: 'T', titleSide, titlePadding: oversizedPadding };
      const snapped = titlePosition(valueThreshold({ ...threshold, titleSnapToValue: true }));
      const clamped = titlePosition(valueThreshold({ ...threshold, titleSnapToValue: false }));
      // guard: the oversized padding must actually move the title, or these mounts test nothing
      expect(clamped).not.toEqual(titlePosition(valueThreshold({ value: 50, title: 'T', titleSide, titleSnapToValue: false })));
      expect(snapped).toEqual(clamped);
    }
  });

  it('leaves a horizontal title clamped when neither side of the line has room', () => {
    for (const titleSide of ['low', 'high'] as const) {
      const threshold = { value: 50, title: 'T', titleSide, titlePadding: oversizedPadding };
      const snapped = titlePosition(categoryThreshold({ ...threshold, titleSnapToValue: true }));
      const clamped = titlePosition(categoryThreshold({ ...threshold, titleSnapToValue: false }));
      expect(clamped).not.toEqual(titlePosition(categoryThreshold({ value: 50, title: 'T', titleSide, titleSnapToValue: false })));
      expect(snapped).toEqual(clamped);
    }
  });
});

describe('inverted plots', () => {
  // inverting swaps the axes, so the value axis takes the horizontal path and
  // the category axis the vertical one
  it('places a value axis title on an inverted plot', () => {
    const container = mount({
      plot: { inverted: true },
      valueAxes: [{ min: 0, max: 100, thresholds: [{ value: 50, title: 'T' }] }]
    });
    expect(container.textContent).toContain('T');
  });

  it('places a category axis title on an inverted plot', () => {
    const container = mount({
      plot: { inverted: true },
      categoryAxis: { property: 'x', type: 'number', scale: 'linear', min: 0, max: 100,
        thresholds: [{ value: 50, title: 'T' }] },
      series: [{ property: 'sales', renderer: 'line' }]
    }, linearRows);
    expect(container.textContent).toContain('T');
  });
});
