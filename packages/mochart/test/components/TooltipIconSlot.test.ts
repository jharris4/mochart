// The tooltip row icon's slot is rebuilt whenever tooltip.valueAlign flips; the outgoing slot used to stay registered with its SeriesColorIcon still mounted, leaking per toggle.
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { mountContainer, trackHandle } from './helpers';
import { createDefaultChart } from '../../src/createChart';
import SeriesColorIcon from '../../src/components/SeriesColorIcon';
import type { ChartHandle } from '../../src/createChart';
import type { DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';
import type { TooltipValueAlign } from '../../src/config/core/constants';
import { getCssSelector, getChartRootCssSelector } from '../../src/utils/ChartDom';

const tooltipSelector = getCssSelector('tooltip');
const lineIconSelector = getCssSelector('tooltipLineIcon');

const rows = [
  { month: 'Jan', sales: 10 },
  { month: 'Feb', sales: 20 }
];

function makeConfig(valueAlign: TooltipValueAlign): MochartInputConfig {
  return {
    version: '1.0.0',
    animation: { enabled: false },
    categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
    series: [{ id: 'S0', property: 'sales', renderer: 'bar' }],
    tooltip: { valueAlign }
  } as unknown as MochartInputConfig;
}

beforeAll(() => {
  installSvgMeasurementShims();
});

function mountChart(valueAlign: TooltipValueAlign): { container: Element; handle: ChartHandle<DefaultChartProps> } {
  const container = mountContainer();
  const handle = trackHandle(createDefaultChart(container, {
    config: makeConfig(valueAlign), data: rows, width: 800, height: 600
  } as DefaultChartProps));
  return { container, handle };
}

function openTooltip(container: Element): void {
  const root = container.querySelector(getChartRootCssSelector())!;
  root.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: 100, clientY: 100 }));
  root.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 100, clientY: 100 }));
}

function tooltipIconCount(container: Element): number {
  return container.querySelectorAll(`${tooltipSelector} ${lineIconSelector} svg`).length;
}

describe('tooltip row icon across valueAlign flips', () => {
  it('keeps exactly one mounted icon per row through repeated flips', () => {
    const { container, handle } = mountChart('right');
    openTooltip(container);
    expect(tooltipIconCount(container)).toBe(1);

    for (const valueAlign of ['left', 'right', 'left', 'right'] as const) {
      handle.update({ config: makeConfig(valueAlign) } as Partial<DefaultChartProps>);
      expect(tooltipIconCount(container)).toBe(1);
    }

    expect(container.querySelector(tooltipSelector)).not.toBeNull();
  });

  // The leaked icon's DOM went with the detached container, so only its teardown is observable:
  // the replaced slot must destroy the icon it held rather than leaving it mounted on the renderer.
  it('destroys the icon the replaced slot was holding', () => {
    const { container, handle } = mountChart('right');
    openTooltip(container);
    const destroy = vi.spyOn(SeriesColorIcon.prototype, 'destroy');

    // one per live tooltip - the visible one and the hidden sizer used for measurement
    handle.update({ config: makeConfig('left') } as Partial<DefaultChartProps>);
    const afterFirstFlip = destroy.mock.calls.length;
    expect(afterFirstFlip).toBeGreaterThan(0);

    handle.update({ config: makeConfig('right') } as Partial<DefaultChartProps>);
    expect(destroy.mock.calls.length).toBeGreaterThan(afterFirstFlip);
    destroy.mockRestore();
  });
});
