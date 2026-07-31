/**
 * Interaction tests for the pointer-driven chart pipeline: mouse events on
 * the chart drive the tooltip, tooltip controls, crosshair, and focus/event
 * callbacks. Charts are mounted through the public createDefaultChart() API
 * with animation disabled so everything runs synchronously in jsdom.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { createDefaultChart } from '../../src/createChart';
import type { ChartHandle } from '../../src/createChart';
import type { ChartEventPayload, ChartFocus, DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';

const VERSION = '1.0.0';
const WIDTH = 800;
const HEIGHT = 600;

const rows = [
  { month: 'Jan', sales: 10, costs: 5 },
  { month: 'Feb', sales: 20, costs: 8 },
  { month: 'Mar', sales: 30, costs: 13 }
];

function makeConfig(overrides: Record<string, unknown> = {}): MochartInputConfig {
  return {
    version: VERSION,
    animationConfig: { animate: false },
    groupAxisConfig: { property: 'month', type: 'string', scale: 'ordinal' },
    seriesConfigs: [{ property: 'sales' }],
    ...overrides
  } as unknown as MochartInputConfig;
}

let handles: ChartHandle<DefaultChartProps>[] = [];

function mountChart(config: MochartInputConfig, callbacks: Partial<DefaultChartProps> = {}, data: readonly unknown[] = rows): Element {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const handle = createDefaultChart(container, {
    config, data, width: WIDTH, height: HEIGHT, ...callbacks
  } as DefaultChartProps);
  handles.push(handle);
  return container;
}

function chartRoot(container: Element): Element {
  const root = container.querySelector('[data-mochart-version]');
  expect(root).not.toBeNull();
  return root!;
}

function mouse(target: Element, type: string, clientX: number, clientY: number): void {
  target.dispatchEvent(new MouseEvent(type, { clientX, clientY, bubbles: true }));
}

beforeAll(() => {
  installSvgMeasurementShims();
  // jsdom reports zero-size rects; report the mounted chart size instead so
  // the chart's pointer hit-testing (clientX/Y relative to the plot rect) works
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return {
      x: 0, y: 0, left: 0, top: 0, right: WIDTH, bottom: HEIGHT,
      width: WIDTH, height: HEIGHT, toJSON: () => ({})
    } as DOMRect;
  });
});

afterEach(() => {
  for (const handle of handles) {
    handle.destroy();
  }
  handles = [];
  document.body.innerHTML = '';
});

describe('chart mouse events', () => {
  it('fires enter, move, leave and click callbacks with a group index payload', () => {
    const enters: ChartEventPayload[] = [];
    const moves: ChartEventPayload[] = [];
    const leaves: ChartEventPayload[] = [];
    const clicks: ChartEventPayload[] = [];
    const container = mountChart(makeConfig(), {
      onChartMouseEnter: payload => { enters.push(payload); },
      onChartMouseMove: payload => { moves.push(payload); },
      onChartMouseLeave: payload => { leaves.push(payload); },
      onChartClick: payload => { clicks.push(payload); }
    });
    const root = chartRoot(container);

    // first in-bounds motion event is the enter, later ones are moves
    mouse(root, 'mouseenter', 100, 100);
    expect(enters.length).toBe(1);
    mouse(root, 'mousemove', 400, 100);
    expect(moves.length).toBe(1);

    // an out-of-bounds move while inside is the leave
    mouse(root, 'mousemove', -10, 100);
    expect(leaves.length).toBe(1);

    mouse(root, 'mouseenter', 100, 100);
    mouse(root, 'click', 100, 100);
    expect(clicks.length).toBe(1);

    // payloads carry the nearest group: far left resolves to the first group,
    // far right to the last
    expect(enters[0].groupIndex).toBe(0);
    const rightClicks: ChartEventPayload[] = [];
    mouse(root, 'mousemove', 790, 100);
    expect(moves[moves.length - 1].groupIndex).toBe(rows.length - 1);
    expect(rightClicks.length).toBe(0);
  });
});

describe('title layout variants', () => {
  it('renders a centered title with prefix and suffix', () => {
    const container = mountChart(makeConfig({
      titleConfig: { title: 'Sales Chart', titlePrefix: 'Q1', titleSuffix: '(units)', verticalExpand: true }
    }));
    const title = container.querySelector('.mochart-title');
    expect(title).not.toBeNull();
    expect(title!.textContent).toContain('Sales Chart');
    expect(title!.textContent).toContain('Q1');
    expect(title!.textContent).toContain('(units)');
  });

  it('renders a right-aligned bottom title not aligned to the axes', () => {
    const container = mountChart(makeConfig({
      titleConfig: {
        title: 'Bottom Title', position: 'bottom', align: 'right',
        alignedToAxes: false, verticalAlign: 'middle'
      }
    }));
    const title = container.querySelector('.mochart-title');
    expect(title).not.toBeNull();
    expect(title!.textContent).toContain('Bottom Title');
  });

  it('renders a left-aligned title', () => {
    const container = mountChart(makeConfig({
      titleConfig: { title: 'Left Title', align: 'left', alignedToAxes: false }
    }));
    expect(container.querySelector('.mochart-title')!.textContent).toContain('Left Title');
  });

  it('survives a chart too narrow for the title decorations', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const handle = createDefaultChart(container, {
      config: makeConfig({ titleConfig: { title: 'T', titlePrefix: 'P', titleSuffix: 'S' } }),
      data: rows, width: 4, height: 600
    } as DefaultChartProps);
    handles.push(handle);
    expect(container.querySelector('[data-mochart-version]')).not.toBeNull();
  });
});

describe('tooltip', () => {
  it('opens on click, closes on the next click, and applies group focus', () => {
    const focuses: ChartFocus[] = [];
    const container = mountChart(makeConfig(), {
      onFocus: focus => { focuses.push(focus); }
    });
    const root = chartRoot(container);

    expect(container.querySelector('.mochart-tooltip')).toBeNull();

    mouse(root, 'mouseenter', 100, 100);
    mouse(root, 'click', 100, 100);
    expect(container.querySelector('.mochart-tooltip')).not.toBeNull();
    // tooltip content shows the group and the formatted series line
    const tooltipText = container.querySelector('.mochart-tooltip-content')!.textContent;
    expect(tooltipText).toContain('Jan');
    expect(tooltipText).toContain('10');
    // applyFocus (default true) focused the clicked group
    expect(focuses.length).toBeGreaterThan(0);
    expect(focuses[focuses.length - 1].focusedGroupIndex).toBe(0);

    mouse(root, 'click', 100, 100);
    expect(container.querySelector('.mochart-tooltip')).toBeNull();
    expect(focuses[focuses.length - 1].focusedGroupIndex).toBe(-1);
  });

  it('shows crosshair lines while the tooltip is open', () => {
    const container = mountChart(makeConfig());
    const root = chartRoot(container);

    // the crosshair root group is always mounted; its lines appear on toggle
    expect(container.querySelectorAll('.crosshair-line').length).toBe(0);
    mouse(root, 'mouseenter', 100, 100);
    mouse(root, 'click', 100, 100);
    expect(container.querySelectorAll('.crosshair-line').length).toBeGreaterThan(0);

    mouse(root, 'click', 100, 100);
    expect(container.querySelectorAll('.crosshair-line').length).toBe(0);
  });

  it('opens on hover and closes on leave when mouseOver is enabled', () => {
    const container = mountChart(makeConfig({ tooltipConfig: { mouseOver: true } }));
    const root = chartRoot(container);

    mouse(root, 'mouseenter', 100, 100);
    expect(container.querySelector('.mochart-tooltip')).not.toBeNull();

    // moving within the chart keeps it open and tracks the group
    mouse(root, 'mousemove', 790, 100);
    expect(container.querySelector('.mochart-tooltip')).not.toBeNull();

    // leaving the chart closes it
    mouse(root, 'mousemove', -10, 100);
    expect(container.querySelector('.mochart-tooltip')).toBeNull();
  });

  it('steps between groups with the tooltip controls', () => {
    const focuses: ChartFocus[] = [];
    const container = mountChart(makeConfig({ tooltipConfig: { showControls: true } }), {
      onFocus: focus => { focuses.push(focus); }
    });
    const root = chartRoot(container);

    mouse(root, 'mouseenter', 100, 100);
    mouse(root, 'click', 100, 100);

    // the content is rendered twice (hidden sizer + visible tooltip); drive
    // the visible copy. Handlers live on the button containers, so bubble.
    const visibleButtons = () => Array.from(container.querySelectorAll('.mochart-tooltip button'));
    const prev = visibleButtons().find(button => button.textContent === 'p')!;
    const next = visibleButtons().find(button => button.textContent === 'n')!;
    expect(prev).toBeDefined();
    expect(next).toBeDefined();
    const visibleText = () => container.querySelector('.mochart-tooltip .mochart-tooltip-content')!.textContent;
    expect(visibleText()).toContain('Jan');

    next.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(visibleText()).toContain('Feb');
    expect(focuses[focuses.length - 1].focusedGroupIndex).toBe(1);

    prev.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(visibleText()).toContain('Jan');
    expect(focuses[focuses.length - 1].focusedGroupIndex).toBe(0);

    // prev at the first group is a no-op
    prev.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(visibleText()).toContain('Jan');
  });

  it('formats range series values with the range separator', () => {
    const container = mountChart(makeConfig({
      seriesConfigs: [{ property: 'sales', rangeProperty: 'costs' }]
    }));
    const root = chartRoot(container);

    mouse(root, 'mouseenter', 100, 100);
    mouse(root, 'click', 100, 100);
    const text = container.querySelector('.mochart-tooltip .mochart-tooltip-lines')!.textContent;
    expect(text).toContain(' - ');
    expect(text).toContain('10');
    expect(text).toContain('5');
  });

  it('shows the missing value text for undefined series values', () => {
    const data = [
      { month: 'Jan', costs: 5 },
      { month: 'Feb', sales: 20, costs: 8 },
      { month: 'Mar', sales: 30, costs: 13 }
    ];
    const container = mountChart(makeConfig(), {}, data);
    const root = chartRoot(container);

    mouse(root, 'mouseenter', 100, 100);
    mouse(root, 'click', 100, 100);
    const text = container.querySelector('.mochart-tooltip .mochart-tooltip-lines')!.textContent;
    expect(text).toContain('N/A');
  });

  it('leaves showInTooltip: false series out of the tooltip', () => {
    const container = mountChart(makeConfig({
      seriesConfigs: [{ property: 'sales' }, { property: 'costs', showInTooltip: false }]
    }));
    const root = chartRoot(container);

    mouse(root, 'mouseenter', 100, 100);
    mouse(root, 'click', 100, 100);
    expect(container.querySelector('.mochart-tooltip [class*="mochart-tooltip-series-line-S0"]')).not.toBeNull();
    expect(container.querySelector('.mochart-tooltip [class*="mochart-tooltip-series-line-S1"]')).toBeNull();
  });

  it('marks suppressed series values and can hide the line entirely', () => {
    const twoSeries = {
      legendConfig: { visible: true },
      seriesConfigs: [{ property: 'sales' }, { property: 'costs' }]
    };
    const container = mountChart(makeConfig(twoSeries));
    const root = chartRoot(container);

    // suppress the costs series, then open the tooltip
    container.querySelector('[class*="mochart-legend-item-S1"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    mouse(root, 'mouseenter', 100, 100);
    mouse(root, 'click', 100, 100);
    const suppressedLine = container.querySelector('.mochart-tooltip [class*="mochart-tooltip-series-line-S1"]');
    expect(suppressedLine).not.toBeNull();
    expect(suppressedLine!.textContent).not.toContain('5.00');

    // hideSuppressed drops the line completely
    const hiding = mountChart(makeConfig({ ...twoSeries, tooltipConfig: { hideSuppressed: true } }));
    const hidingRoot = chartRoot(hiding);
    hiding.querySelector('[class*="mochart-legend-item-S1"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    mouse(hidingRoot, 'mouseenter', 100, 100);
    mouse(hidingRoot, 'click', 100, 100);
    expect(hiding.querySelector('.mochart-tooltip [class*="mochart-tooltip-series-line-S1"]')).toBeNull();
    expect(hiding.querySelector('.mochart-tooltip [class*="mochart-tooltip-series-line-S0"]')).not.toBeNull();
  });

  it('renders plain series lines when alignValues is off and prefixes the group label', () => {
    const container = mountChart(makeConfig({
      tooltipConfig: { alignValues: false },
      groupAxisConfig: { property: 'month', type: 'string', scale: 'ordinal', valueLabel: 'Month' }
    }));
    const root = chartRoot(container);

    mouse(root, 'mouseenter', 100, 100);
    mouse(root, 'click', 100, 100);
    expect(container.querySelector('.mochart-tooltip .mochart-tooltip-line-text')).not.toBeNull();
    expect(container.querySelector('.mochart-tooltip .mochart-tooltip-line-value')).toBeNull();
    expect(container.querySelector('.mochart-tooltip .mochart-tooltip-group-line')!.textContent)
      .toBe('Month: Jan');
  });

  it('sizes tooltip icons from the font by default and preserves numeric sizes', () => {
    const automatic = mountChart(makeConfig());
    const automaticRoot = chartRoot(automatic);
    mouse(automaticRoot, 'mouseenter', 100, 100);
    mouse(automaticRoot, 'click', 100, 100);

    const automaticIcon = automatic.querySelector<SVGElement>('.mochart-tooltip .mochart-tooltip-line-icon svg')!;
    expect(automaticIcon.getAttribute('width')).toBe('1em');
    expect(automaticIcon.getAttribute('height')).toBe('1em');
    expect(automaticIcon.getAttribute('viewBox')).toBe('0 0 16 16');
    expect(automaticIcon.parentElement!.style.width).toBe('calc(1em + 4px)');

    const fixed = mountChart(makeConfig({ tooltipConfig: { iconSize: 20 } }));
    const fixedRoot = chartRoot(fixed);
    mouse(fixedRoot, 'mouseenter', 100, 100);
    mouse(fixedRoot, 'click', 100, 100);

    const fixedIcon = fixed.querySelector<SVGElement>('.mochart-tooltip .mochart-tooltip-line-icon svg')!;
    expect(fixedIcon.getAttribute('width')).toBe('20');
    expect(fixedIcon.getAttribute('height')).toBe('20');
    expect(fixedIcon.getAttribute('viewBox')).toBe('0 0 20 20');
    expect(fixedIcon.parentElement!.style.width).toBe('24px');
  });

  it('focuses and filters series from tooltip line clicks', () => {
    const focuses: ChartFocus[] = [];
    const filters: Array<{ filteredSeriesIds: Record<string, boolean> }> = [];
    const container = mountChart(makeConfig({
      seriesConfigs: [{ property: 'sales' }, { property: 'costs' }],
      tooltipConfig: { focusOnSeriesClick: true, filterOnSeriesClick: true }
    }), {
      onFocus: focus => { focuses.push(focus); },
      onSeriesFilter: filter => { filters.push(filter); }
    });
    const root = chartRoot(container);

    mouse(root, 'mouseenter', 100, 100);
    mouse(root, 'click', 100, 100);

    const line = container.querySelector('.mochart-tooltip [class*="mochart-tooltip-series-line-S0"]')!;
    line.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(focuses[focuses.length - 1].focusedSeriesId).toBe('S0');
    expect(filters[filters.length - 1].filteredSeriesIds).toEqual({ S0: true });
    // stopPropagation keeps the tooltip open despite closeOnClick
    expect(container.querySelector('.mochart-tooltip')).not.toBeNull();

    // clicking the focused series again clears the focus
    const lineAgain = container.querySelector('.mochart-tooltip [class*="mochart-tooltip-series-line-S0"]')!;
    lineAgain.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(focuses[focuses.length - 1].focusedSeriesId).toBeNull();
  });

  it('focuses series on tooltip line hover when configured', () => {
    const focuses: ChartFocus[] = [];
    const container = mountChart(makeConfig({
      seriesConfigs: [{ property: 'sales' }, { property: 'costs' }],
      tooltipConfig: { focusOnSeriesMouseOver: true }
    }), {
      onFocus: focus => { focuses.push(focus); }
    });
    const root = chartRoot(container);

    mouse(root, 'mouseenter', 100, 100);
    mouse(root, 'click', 100, 100);

    const line = container.querySelector('.mochart-tooltip [class*="mochart-tooltip-series-line-S1"]')!;
    line.dispatchEvent(new MouseEvent('mouseenter', {}));
    expect(focuses[focuses.length - 1].focusedSeriesId).toBe('S1');
    line.dispatchEvent(new MouseEvent('mouseleave', {}));
    expect(focuses[focuses.length - 1].focusedSeriesId).toBeNull();
  });

  it('closes when the tooltip content is clicked unless closeOnClick is off', () => {
    const container = mountChart(makeConfig());
    const root = chartRoot(container);
    mouse(root, 'mouseenter', 100, 100);
    mouse(root, 'click', 100, 100);
    container.querySelector('.mochart-tooltip .mochart-tooltip-content')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(container.querySelector('.mochart-tooltip')).toBeNull();

    const sticky = mountChart(makeConfig({ tooltipConfig: { closeOnClick: false } }));
    const stickyRoot = chartRoot(sticky);
    mouse(stickyRoot, 'mouseenter', 100, 100);
    mouse(stickyRoot, 'click', 100, 100);
    sticky.querySelector('.mochart-tooltip .mochart-tooltip-content')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(sticky.querySelector('.mochart-tooltip')).not.toBeNull();
  });

  it('switches between filter and focus modes with the controls mode button', () => {
    const focuses: ChartFocus[] = [];
    const container = mountChart(makeConfig({ tooltipConfig: { showControls: true } }), {
      onFocus: focus => { focuses.push(focus); }
    });
    const root = chartRoot(container);

    mouse(root, 'mouseenter', 100, 100);
    mouse(root, 'click', 100, 100);

    const modeButton = () => Array.from(container.querySelectorAll('.mochart-tooltip button'))
      .find(button => button.textContent === 'filter' || button.textContent === 'focus')!;
    expect(modeButton().textContent).toBe('filter');

    modeButton().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(modeButton().textContent).toBe('focus');

    // in focus mode a group line click toggles group focus
    const groupLine = container.querySelector('.mochart-tooltip .mochart-tooltip-group-line')!;
    groupLine.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(focuses[focuses.length - 1].focusedGroupIndex).toBe(-1); // toggled off (was focused group 0)
    groupLine.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(focuses[focuses.length - 1].focusedGroupIndex).toBe(0);
  });

  it('toggles series filtering from a legend item click', () => {
    const filters: Array<{ filteredSeriesIds: Record<string, boolean> }> = [];
    const container = mountChart(makeConfig({
      legendConfig: { visible: true },
      seriesConfigs: [{ property: 'sales' }, { property: 'costs' }]
    }), {
      onSeriesFilter: filter => { filters.push(filter); }
    });

    const item = container.querySelector('[class*="mochart-legend-item-S1"]');
    expect(item).not.toBeNull();

    item!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(filters.length).toBe(1);
    expect(filters[0].filteredSeriesIds).toEqual({ S1: true });

    item!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(filters.length).toBe(2);
    expect(filters[1].filteredSeriesIds).toEqual({});
  });

  it('maps pointer position along the y axis and draws horizontal crosshair lines when inverted', () => {
    const moves: ChartEventPayload[] = [];
    const container = mountChart(makeConfig({ plotConfig: { inverted: true } }), {
      onChartMouseMove: payload => { moves.push(payload); }
    });
    const root = chartRoot(container);

    // in an inverted plot the group position follows chartY
    mouse(root, 'mouseenter', 400, 10);
    mouse(root, 'mousemove', 400, 590);
    expect(moves[moves.length - 1].groupIndex).toBe(rows.length - 1);

    mouse(root, 'click', 400, 10);
    const line = container.querySelector('.crosshair-line');
    expect(line).not.toBeNull();
    // horizontal group line: spans x, constant y
    expect(line!.getAttribute('y1')).toBe(line!.getAttribute('y2'));
    expect(line!.getAttribute('x1')).not.toBe(line!.getAttribute('x2'));
  });

  it('draws a series crosshair line when a series is focused', () => {
    const container = mountChart(makeConfig({
      seriesConfigs: [{ property: 'sales' }, { property: 'costs' }],
      tooltipConfig: { focusOnSeriesMouseOver: true },
      crosshairConfig: { showSeries: true }
    }));
    const root = chartRoot(container);

    mouse(root, 'mouseenter', 100, 100);
    mouse(root, 'click', 100, 100);
    const seriesLines = () => container.querySelectorAll('.crosshair-series-lines .crosshair-line');
    expect(seriesLines().length).toBe(0);

    const line = container.querySelector('.mochart-tooltip [class*="mochart-tooltip-series-line-S0"]')!;
    line.dispatchEvent(new MouseEvent('mouseenter', {}));
    expect(seriesLines().length).toBeGreaterThan(0);
  });

  it('hides group crosshair lines when showGroup is off', () => {
    const container = mountChart(makeConfig({
      crosshairConfig: { showGroup: false }
    }));
    const root = chartRoot(container);
    mouse(root, 'mouseenter', 100, 100);
    mouse(root, 'click', 100, 100);
    expect(container.querySelector('.mochart-tooltip')).not.toBeNull();
    expect(container.querySelectorAll('.crosshair-group-lines .crosshair-line').length).toBe(0);
  });

  it('renders an axis focus range for the focused group', () => {
    const container = mountChart(makeConfig({
      groupAxisConfig: { property: 'month', type: 'string', scale: 'ordinal', focusRange: true }
    }));
    const root = chartRoot(container);

    expect(container.querySelector('[class*="focus-range"] rect')).toBeNull();
    mouse(root, 'mouseenter', 100, 100);
    mouse(root, 'click', 100, 100);
    expect(container.querySelector('[class*="focus-range"] rect')).not.toBeNull();
  });

  it('renders a vertical axis focus range when the plot is inverted', () => {
    const container = mountChart(makeConfig({
      plotConfig: { inverted: true },
      groupAxisConfig: { property: 'month', type: 'string', scale: 'ordinal', focusRange: true }
    }));
    const root = chartRoot(container);

    mouse(root, 'mouseenter', 400, 100);
    mouse(root, 'click', 400, 100);
    expect(container.querySelector('[class*="focus-range"] rect')).not.toBeNull();
  });

  it('does not open when tooltip and crosshair are both hidden', () => {
    const container = mountChart(makeConfig({
      tooltipConfig: { visible: false },
      crosshairConfig: { visible: false }
    }));
    const root = chartRoot(container);

    mouse(root, 'mouseenter', 100, 100);
    mouse(root, 'click', 100, 100);
    expect(container.querySelector('.mochart-tooltip')).toBeNull();
    expect(container.querySelector('.mochart-crosshair')).toBeNull();
  });
});

describe('followSeries follower focus', () => {
  // A candlestick-style pair: a hidden thin wick series that follows the body
  // series via followSeries, plus an unrelated series to show the defocused
  // state.
  const candleRows = [
    { month: 'Jan', high: 30, low: 5, open: 10, close: 20, x: 50 },
    { month: 'Feb', high: 40, low: 12, open: 22, close: 25, x: 60 }
  ];

  function candleConfig(): MochartInputConfig {
    return makeConfig({
      seriesConfigs: [
        { id: 'wick', property: 'high', rangeProperty: 'low', renderer: 'bar', barWidthPercent: 0.2,
          showInLegend: false, followSeries: 'body', focusOnClick: true },
        { id: 'body', property: 'close', rangeProperty: 'open', renderer: 'bar', focusOnClick: true },
        { id: 'other', property: 'x', renderer: 'bar' }
      ]
    });
  }

  function barOpacity(container: Element, seriesId: string): string | null {
    const bar = container.querySelector(`.mochart-series-${seriesId} path`)!;
    return bar.getAttribute('fill-opacity');
  }

  it('highlights the follower along with its focused leader', () => {
    const container = mountChart(candleConfig(), {}, candleRows);
    const unfocusedOtherOpacity = Number(barOpacity(container, 'other'));

    handles[handles.length - 1].update({ focusedSeriesId: 'body' } as Partial<DefaultChartProps>);

    // the wick takes its body's focused opacity while the unrelated series dims
    expect(barOpacity(container, 'wick')).toBe(barOpacity(container, 'body'));
    expect(Number(barOpacity(container, 'other'))).toBeLessThan(unfocusedOtherOpacity);
    expect(Number(barOpacity(container, 'wick'))).toBeGreaterThan(Number(barOpacity(container, 'other')));
  });

  it('focuses and toggles the leader when the follower is clicked', () => {
    const focuses: ChartFocus[] = [];
    const container = mountChart(candleConfig(), {
      onFocus: focus => { focuses.push(focus); }
    }, candleRows);

    const wickBar = () => container.querySelector('.mochart-series-wick path')!;
    wickBar().dispatchEvent(new MouseEvent('click', {}));
    expect(focuses[focuses.length - 1].focusedSeriesId).toBe('body');

    wickBar().dispatchEvent(new MouseEvent('click', {}));
    expect(focuses[focuses.length - 1].focusedSeriesId).toBeNull();
  });
});
