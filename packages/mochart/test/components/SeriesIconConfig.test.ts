/**
 * The legend and tooltip series icons share one component, and the config that
 * decides what it draws had never been set anywhere: showIconColors,
 * showIconPlaceholders, iconUnfilteredColor and the icon border/spacer numbers
 * were only ever their defaults. The gradient half of the tooltip icon was dead
 * outright — its own <defs> is built only on the html render path, so a
 * gradient-filled series had never had a tooltip swatch drawn at all.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { createDefaultChart } from '../../src/createChart';
import type { ChartHandle } from '../../src/createChart';
import type { DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';
import { getCssSelector, getIdCssSelector, getDescendantCssSelector } from '../../src/utils/ChartDom';

const VERSION = '1.0.0';
const WIDTH = 800;
const HEIGHT = 600;

const rows = [
  { month: 'Jan', sales: 10, costs: 5 },
  { month: 'Feb', sales: 20, costs: 8 }
];

let handles: ChartHandle<DefaultChartProps>[] = [];

function mountChart(overrides: Record<string, unknown> = {}): Element {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const config = {
    version: VERSION,
    animation: { animate: false },
    categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
    series: [{ id: 'S0', property: 'sales', renderer: 'bar' }, { id: 'S1', property: 'costs', renderer: 'bar' }],
    legend: { visible: true, filterOnClick: true },
    ...overrides
  } as unknown as MochartInputConfig;
  handles.push(createDefaultChart(container, { config, data: rows, width: WIDTH, height: HEIGHT } as DefaultChartProps));
  return container;
}

/** The shapes the legend draws inside its icon groups. */
function legendIcons(container: Element): SVGElement[] {
  return [...container.querySelectorAll<SVGElement>(getCssSelector('legendItemIcon') + ' > *')];
}

/** The shapes the open tooltip draws for its row icons; the class sits on the html wrapper. */
function tooltipIcons(container: Element): SVGElement[] {
  const inside = getDescendantCssSelector('tooltip', 'tooltipLineIcon') + ' svg > ';
  return [...container.querySelectorAll<SVGElement>(inside + 'rect, ' + inside + 'path')];
}

function openTooltip(container: Element): void {
  const rect = container.querySelector(getCssSelector('seriesBackground') + ' rect');
  expect(rect).not.toBeNull();
  rect!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
}

function filterSeries(container: Element, seriesId: string): void {
  container.querySelector(getIdCssSelector('legendItem', seriesId))!
    .dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

beforeAll(() => {
  installSvgMeasurementShims();
  // jsdom lacks focus() on SVG elements; route it through the shared focus bookkeeping
  const svgProto = SVGElement.prototype as unknown as { focus?: () => void };
  if (typeof svgProto.focus !== 'function') {
    svgProto.focus = HTMLElement.prototype.focus;
  }
});

afterEach(() => {
  for (const handle of handles) {
    handle.destroy();
  }
  handles = [];
  document.body.innerHTML = '';
});

describe('legend icon switches', () => {
  it('fills the icon with the series color by default', () => {
    const icons = legendIcons(mountChart());

    expect(icons.length).toBe(2);
    expect(icons[0].getAttribute('fill')).not.toBe(icons[1].getAttribute('fill'));
  });

  it('falls back to the unfiltered placeholder color when showIconColors is off', () => {
    const icons = legendIcons(mountChart({ legend: { visible: true, showIconColors: false, iconUnfilteredColor: 'rgb(4,5,6)' } }));

    // both icons stop carrying their series color and become identical placeholders
    expect(icons.length).toBe(2);
    expect(icons.map(icon => icon.getAttribute('fill'))).toEqual(['rgb(4,5,6)', 'rgb(4,5,6)']);
  });

  it('draws no icon at all when neither colors nor placeholders are wanted', () => {
    expect(legendIcons(mountChart({ legend: { visible: true, showIconColors: false, showIconPlaceholders: false } }))).toHaveLength(0);
    // a series that opts out of its color still gets a placeholder while placeholders are on
    expect(legendIcons(mountChart({
      series: [{ id: 'S0', property: 'sales', renderer: 'bar', showColorInLegend: false }],
      legend: { visible: true, showIconPlaceholders: true }
    }))).toHaveLength(1);
    expect(legendIcons(mountChart({
      series: [{ id: 'S0', property: 'sales', renderer: 'bar', showColorInLegend: false }],
      legend: { visible: true, showIconPlaceholders: false }
    }))).toHaveLength(0);
  });

  it('writes the icon border color, opacity and size onto the shape', () => {
    const icons = legendIcons(mountChart({
      legend: { visible: true, iconBorderColor: 'rgb(9,9,9)', iconBorderOpacity: 0.11, iconBorderSize: 2 }
    }));

    expect(icons[0].getAttribute('stroke')).toBe('rgb(9,9,9)');
    expect(icons[0].getAttribute('stroke-opacity')).toBe('0.11');
    expect(icons[0].getAttribute('stroke-width')).toBe('2');
  });

  it('widens the icon slot by the icon spacer size', () => {
    // the item text carries the translate; its x is the icon width plus the spacer
    const textX = (container: Element) => {
      const transform = container.querySelector(getDescendantCssSelector('legendItemText') + ' text')!.getAttribute('transform') ?? '';
      return Number(/translate\(\s*([-\d.]+)/.exec(transform)![1]);
    };
    const narrow = mountChart({ legend: { visible: true, iconSize: 10, iconSpacerSize: 2 } });
    const wide = mountChart({ legend: { visible: true, iconSize: 10, iconSpacerSize: 22 } });

    // the item text starts after the icon plus its spacer, so 20 more spacer is 20 more offset
    expect(textX(wide) - textX(narrow)).toBeCloseTo(20);
  });
});

describe('tooltip icon switches', () => {
  it('draws a colored icon per row by default', () => {
    const container = mountChart();
    openTooltip(container);

    expect(tooltipIcons(container).length).toBe(2);
  });

  it('drops the tooltip icons when neither colors nor placeholders are wanted', () => {
    const container = mountChart({ tooltip: { showIconColors: false, showIconPlaceholders: false } });
    openTooltip(container);

    expect(tooltipIcons(container)).toHaveLength(0);
  });

  it('keeps placeholder icons when only the colors are switched off', () => {
    const container = mountChart({ tooltip: { showIconColors: false, showIconPlaceholders: true, iconUnfilteredColor: 'rgb(4,5,6)' } });
    openTooltip(container);
    const icons = tooltipIcons(container);

    expect(icons.length).toBe(2);
    expect(icons.map(icon => icon.getAttribute('fill'))).toEqual(['rgb(4,5,6)', 'rgb(4,5,6)']);
  });

  it('takes the filtered color once its series is filtered', () => {
    const container = mountChart({ tooltip: { iconFilteredColor: 'rgb(7,7,7)' } });
    filterSeries(container, 'S0');
    openTooltip(container);
    const icons = tooltipIcons(container);

    expect(icons[0].getAttribute('fill')).toBe('rgb(7,7,7)');
    expect(icons[1].getAttribute('fill')).not.toBe('rgb(7,7,7)');
  });
});

describe('tooltip icon gradients', () => {
  const gradientConfig = {
    linearGradients: [{
      id: 'fade', x1: 0, y1: 0, x2: 0, y2: 1,
      stops: [{ offset: 0, color: '#1f77b4', opacity: 0.9 }, { offset: 1, color: '#1f77b4', opacity: 0.05 }]
    }],
    series: [{ id: 'S0', property: 'sales', renderer: 'area', gradient: 'fade' }]
  };

  it('gives a gradient-filled series its own gradient definition in the tooltip icon', () => {
    const container = mountChart(gradientConfig);
    openTooltip(container);
    const icons = tooltipIcons(container);

    expect(icons.length).toBe(1);
    // the swatch points at a gradient the icon defines for itself, not a flat color
    const fill = icons[0].getAttribute('fill') ?? '';
    expect(fill).toMatch(/^url\(#.+\)$/);
    const defs = container.querySelector(getCssSelector('tooltip') + ' defs linearGradient');
    expect(defs).not.toBeNull();
    expect(fill).toBe('url(#' + defs!.getAttribute('id') + ')');
  });

  it('does the same for a radial gradient', () => {
    const container = mountChart({
      radialGradients: [{
        id: 'glow', cx: 0.5, cy: 0.5, r: 0.5,
        stops: [{ offset: 0, color: '#fff', opacity: 1 }, { offset: 1, color: '#1f77b4', opacity: 1 }]
      }],
      series: [{ id: 'S0', property: 'sales', renderer: 'area', gradient: 'glow' }]
    });
    openTooltip(container);

    expect(container.querySelector(getCssSelector('tooltip') + ' defs radialGradient')).not.toBeNull();
  });

  it('builds a value-ramp gradient for a colorScale series', () => {
    const container = mountChart({
      series: [{ id: 'S0', property: 'sales', renderer: 'bar', colorProperty: 'sales', colorScale: { min: '#eee', max: '#036' } }]
    });
    openTooltip(container);
    const icons = tooltipIcons(container);

    expect(icons[0].getAttribute('fill')).toMatch(/^url\(#.+\)$/);
    expect(container.querySelector(getCssSelector('tooltip') + ' defs linearGradient')).not.toBeNull();
  });
});
