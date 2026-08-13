import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createDefaultChart } from '../../src/createChart';
import { createPie } from '../../src/data/Pie';
import { getCssSelector, getDescendantCssSelector } from '../../src/utils/ChartDom';
import { installSvgMeasurementShims } from './svgShims';
import type { ChartHandle } from '../../src/createChart';
import type { DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';

const rows = [
  { c: 'A', a: 10, b: 15, color: 0 },
  { c: 'B', a: 20, b: 5, color: 1 }
];

let handles: ChartHandle<DefaultChartProps>[] = [];

function mount(config: MochartInputConfig, data: readonly unknown[] = rows): Element {
  const container = document.createElement('div');
  document.body.appendChild(container);
  handles.push(createDefaultChart(container, { config, data, width: 600, height: 400 } as DefaultChartProps));
  return container;
}

function base(overrides: Record<string, unknown> = {}): MochartInputConfig {
  return {
    version: '1.0.0',
    animation: { animate: false },
    categoryAxis: { property: 'c' },
    series: [{ id: 'A', property: 'a', renderer: 'bar' }],
    ...overrides
  } as unknown as MochartInputConfig;
}

function openTooltip(container: Element): void {
  container.querySelector(getCssSelector('seriesBackground') + ' rect')!
    .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
}

beforeAll(() => installSvgMeasurementShims());

afterEach(() => {
  for (const handle of handles) handle.destroy();
  handles = [];
  document.body.innerHTML = '';
});

describe('built-in SVG patterns', () => {
  it('renders lines, crosshatch, and dots in screen-space pattern definitions', () => {
    const container = mount(base({
      patterns: [
        { id: 'lines', type: 'lines', spacing: 9, angle: -30, lineWidth: 3 },
        { id: 'cross', type: 'crosshatch', foregroundColor: 'currentColor', backgroundColor: '#fff' },
        { id: 'dots', type: 'dots', radius: 1.5 }
      ],
      series: [
        { id: 'A', property: 'a', renderer: 'bar', pattern: 'lines' },
        { id: 'B', property: 'b', renderer: 'bar', pattern: 'cross' },
        { id: 'C', property: 'color', renderer: 'bar', pattern: 'dots' }
      ]
    }));

    const patterns = [...container.querySelectorAll('svg > defs > pattern')];
    expect(patterns).toHaveLength(3);
    expect(patterns.map(pattern => pattern.getAttribute('patternUnits'))).toEqual([
      'userSpaceOnUse', 'userSpaceOnUse', 'userSpaceOnUse'
    ]);

    expect(patterns[0].getAttribute('width')).toBe('9');
    expect(patterns[0].getAttribute('patternTransform')).toBe('rotate(-30)');
    expect(patterns[0].querySelectorAll('line')).toHaveLength(1);
    expect(patterns[0].querySelector('line')!.getAttribute('stroke-width')).toBe('3');

    expect(patterns[1].querySelectorAll('line')).toHaveLength(2);
    expect(patterns[1].querySelector('line')!.getAttribute('stroke')).toBe('currentColor');
    expect(patterns[1].querySelector('rect')!.getAttribute('fill')).toBe('#fff');

    expect(patterns[2].getAttribute('patternTransform')).toBeNull();
    expect(patterns[2].querySelector('circle')!.getAttribute('r')).toBe('1.5');
  });

  it('resolves series colors per series and uses the pattern as the bar fill', () => {
    const container = mount(base({
      patterns: [{ id: 'hatch', type: 'lines' }],
      series: [
        { id: 'A', property: 'a', renderer: 'bar', pattern: 'hatch' },
        { id: 'B', property: 'b', renderer: 'bar', pattern: 'hatch' }
      ]
    }));

    const patterns = [...container.querySelectorAll('svg > defs > pattern')];
    expect(patterns).toHaveLength(2);
    expect(patterns[0].querySelector('line')!.getAttribute('stroke'))
      .not.toBe(patterns[1].querySelector('line')!.getAttribute('stroke'));

    const patternIds = patterns.map(pattern => pattern.id);
    const fills = [...container.querySelectorAll(getCssSelector('seriesBar'))]
      .map(bar => bar.getAttribute('fill'));
    expect(new Set(fills)).toEqual(new Set(patternIds.map(id => `url(#${id})`)));
  });

  it('keeps a pattern fill when per-datum colors change the bar stroke', () => {
    const container = mount(base({
      patterns: [{ type: 'dots' }],
      series: [{ id: 'A', property: 'a', renderer: 'bar', colorProperty: 'color',
        colorScale: { min: '#ff0000', max: '#0000ff' } }]
    }));
    const bars = [...container.querySelectorAll(getCssSelector('seriesBar'))];
    expect(bars[0].getAttribute('fill')).toMatch(/^url\(#series__pattern__/);
    expect(bars[1].getAttribute('fill')).toBe(bars[0].getAttribute('fill'));
    expect(bars[1].getAttribute('stroke')).not.toBe(bars[0].getAttribute('stroke'));
  });

  it('uses patterns for areas and pie slices but leaves plot markers solid', () => {
    const area = mount(base({
      patterns: [{ type: 'lines' }],
      series: [{ id: 'A', property: 'a', renderer: 'area', markerShape: 'circle' }]
    }));
    expect(area.querySelector(getCssSelector('seriesArea'))!.getAttribute('fill')).toMatch(/^url\(#series__pattern__/);
    expect(area.querySelector(getCssSelector('seriesMarker'))!.getAttribute('fill')).not.toMatch(/^url\(/);

    const pie = createPie([{ label: 'A', value: 3 }, { label: 'B', value: 2 }]);
    const pieConfig = {
      version: '1.0.0', animation: { animate: false }, chart: pie.chart, pie: pie.pie,
      categoryAxis: pie.categoryAxis, patterns: [{ type: 'crosshatch' }],
      series: pie.series.map(series => ({ ...series, renderer: 'bar' as const }))
    } as MochartInputConfig;
    const pieContainer = mount(pieConfig, pie.data);
    expect([...pieContainer.querySelectorAll(getCssSelector('seriesSlice'))]
      .every(slice => /^url\(#series__pattern__/.test(slice.getAttribute('fill') ?? ''))).toBe(true);
  });

  it('recreates the pattern in tooltip icons and uses rectangular pattern swatches', () => {
    const container = mount(base({
      patterns: [{ type: 'dots' }],
      legend: { visible: true },
      series: [{ id: 'A', property: 'a', renderer: 'area', markerShape: 'circle' }]
    }));

    const legendIcon = container.querySelector(getCssSelector('legendItemIcon') + ' > rect');
    expect(legendIcon).not.toBeNull();
    expect(legendIcon!.getAttribute('fill')).toMatch(/^url\(#series__pattern__/);

    openTooltip(container);

    const tooltip = container.querySelector(getCssSelector('tooltip'))!;
    const pattern = tooltip.querySelector('defs pattern');
    expect(pattern).not.toBeNull();
    const iconSelector = getDescendantCssSelector('tooltip', 'tooltipLineIcon') + ' svg > rect';
    const icon = container.querySelector(iconSelector);
    expect(icon).not.toBeNull();
    expect(icon!.getAttribute('fill')).toBe(`url(#${pattern!.id})`);
  });
});
