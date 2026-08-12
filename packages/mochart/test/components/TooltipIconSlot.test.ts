/**
 * COMP-9: the tooltip row's colour icon sits in a different host element per layout, so the slot
 * holding it is rebuilt whenever tooltip.rightAlignValues flips. The outgoing slot used to stay
 * registered on the renderer with its SeriesColorIcon still mounted, growing without bound for a
 * host that lets users toggle the option.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { createDefaultChart } from '../../src/createChart';
import { mochartCssClasses } from '../../src/utils/ChartDom';
import SeriesColorIcon from '../../src/components/SeriesColorIcon';
import type { ChartHandle } from '../../src/createChart';
import type { DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';

const tooltipSelector = '.' + mochartCssClasses['tooltip'];
const lineIconSelector = '.' + mochartCssClasses['tooltipLineIcon'];

const rows = [
  { month: 'Jan', sales: 10 },
  { month: 'Feb', sales: 20 }
];

function makeConfig(rightAlignValues: boolean): MochartInputConfig {
  return {
    version: '1.0.0',
    animation: { animate: false },
    categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
    series: [{ id: 'S0', property: 'sales', renderer: 'bar' }],
    tooltip: { rightAlignValues }
  } as unknown as MochartInputConfig;
}

let handles: ChartHandle<DefaultChartProps>[] = [];

beforeAll(() => {
  installSvgMeasurementShims();
});

afterEach(() => {
  for (const handle of handles) {
    handle.destroy();
  }
  handles = [];
  document.body.innerHTML = '';
});

function mountChart(rightAlignValues: boolean): { container: Element; handle: ChartHandle<DefaultChartProps> } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const handle = createDefaultChart(container, {
    config: makeConfig(rightAlignValues), data: rows, width: 800, height: 600
  } as DefaultChartProps);
  handles.push(handle);
  return { container, handle };
}

function openTooltip(container: Element): void {
  const root = container.querySelector('[data-mochart-version]')!;
  root.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: 100, clientY: 100 }));
  root.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 100, clientY: 100 }));
}

function tooltipIconCount(container: Element): number {
  return container.querySelectorAll(`${tooltipSelector} ${lineIconSelector} svg`).length;
}

describe('tooltip row icon across rightAlignValues flips', () => {
  it('keeps exactly one mounted icon per row through repeated flips', () => {
    const { container, handle } = mountChart(true);
    openTooltip(container);
    expect(tooltipIconCount(container)).toBe(1);

    for (const rightAlignValues of [false, true, false, true]) {
      handle.update({ config: makeConfig(rightAlignValues) } as Partial<DefaultChartProps>);
      expect(tooltipIconCount(container)).toBe(1);
    }

    expect(container.querySelector(tooltipSelector)).not.toBeNull();
  });

  // The leaked icon's DOM went with the detached container, so only its teardown is observable:
  // the replaced slot must destroy the icon it held rather than leaving it mounted on the renderer.
  it('destroys the icon the replaced slot was holding', () => {
    const { container, handle } = mountChart(true);
    openTooltip(container);
    const destroy = vi.spyOn(SeriesColorIcon.prototype, 'destroy');

    // one per live tooltip - the visible one and the hidden sizer used for measurement
    handle.update({ config: makeConfig(false) } as Partial<DefaultChartProps>);
    const afterFirstFlip = destroy.mock.calls.length;
    expect(afterFirstFlip).toBeGreaterThan(0);

    handle.update({ config: makeConfig(true) } as Partial<DefaultChartProps>);
    expect(destroy.mock.calls.length).toBeGreaterThan(afterFirstFlip);
    destroy.mockRestore();
  });
});
