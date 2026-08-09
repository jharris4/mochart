/**
 * Arbitration of the chart's error/loading/no-data states: the error state
 * wins over the loading overlay, and the documented contract is "a provided
 * error (including '' or 0) is the error state; null/undefined are not".
 * Charts are mounted through the public createDefaultChart() API with
 * animation disabled so everything runs synchronously in jsdom.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { createChart, createDefaultChart } from '../../src/createChart';
import type { ChartHandle } from '../../src/createChart';
import { enhanceConfig } from '../../src/config/helper';
import { ArrayOfObjectsDataProvider } from '../../src/data/DataProvider';
import type { DefaultChartProps, ManagedChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';

const WIDTH = 800;
const HEIGHT = 600;

const config = {
  version: '1.0.0',
  animation: { animate: false },
  categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
  series: [{ property: 'sales' }]
} as unknown as MochartInputConfig;

const rows = [
  { month: 'Jan', sales: 10 },
  { month: 'Feb', sales: 20 }
];

let handles: ChartHandle<DefaultChartProps>[] = [];

function mountChart(extra: Partial<DefaultChartProps>): Element {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const handle = createDefaultChart(container, {
    config, data: rows, width: WIDTH, height: HEIGHT, ...extra
  } as DefaultChartProps);
  handles.push(handle);
  return container;
}

function stateClasses(container: Element): string[] {
  return [...container.querySelectorAll('[class]')]
    .map(el => el.getAttribute('class')!)
    .filter(c => /mochart-(loading|no-data)/.test(c));
}

beforeAll(() => {
  installSvgMeasurementShims();
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function () {
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

describe('chart state arbitration', () => {
  it('renders a normal chart with neither error nor loading', () => {
    const container = mountChart({});
    expect(stateClasses(container)).toEqual([]);
    expect(container.querySelector('path, rect.mochart-series-bar, svg')).not.toBeNull();
  });

  it('shows the loading overlay while loading', () => {
    const container = mountChart({ loading: true });
    expect(stateClasses(container)).toEqual(['mochart-loading']);
    expect(container.textContent).toContain('Loading...');
  });

  it('shows the error content in the no-data slot for an error', () => {
    const container = mountChart({ error: 'boom' });
    expect(stateClasses(container)).toEqual(['mochart-no-data']);
    expect(container.textContent).toContain('boom');
  });

  it('lets the error state win when error and loading are both set', () => {
    const container = mountChart({ error: 'boom', loading: true });
    expect(stateClasses(container)).toEqual(['mochart-no-data']);
    expect(container.textContent).toContain('boom');
    expect(container.textContent).not.toContain('Loading...');
  });

  it('treats explicitly provided falsy errors as the error state', () => {
    expect(stateClasses(mountChart({ error: '' }))).toEqual(['mochart-no-data']);
    const zeroError = mountChart({ error: 0 });
    expect(stateClasses(zeroError)).toEqual(['mochart-no-data']);
    expect(zeroError.textContent).toContain('0');
  });

  it('does not enter the error state for null or undefined', () => {
    expect(stateClasses(mountChart({ error: null }))).toEqual([]);
    expect(stateClasses(mountChart({ error: undefined }))).toEqual([]);
  });
});

/**
 * The managed entry point takes a null mochartConfig (what the bindings pass
 * while a host is still loading). Regression: only the config going *away* was
 * treated as structural, so a config arriving after mount threw.
 */
describe('a mochartConfig arriving after mount', () => {
  function mountManaged(props: Partial<ManagedChartProps>): { container: Element; handle: ChartHandle<ManagedChartProps> } {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const handle = createChart(container, {
      mochartConfig: null, dataProvider: null, width: WIDTH, height: HEIGHT, ...props
    } as unknown as ManagedChartProps);
    return { container, handle };
  }

  const enhanced = () => enhanceConfig(config);
  const provider = () => new ArrayOfObjectsDataProvider(rows, 'month');
  const seriesCount = (container: Element) => container.querySelectorAll('.mochart-series').length;

  it('renders the series once the config and provider arrive', () => {
    const { container, handle } = mountManaged({ loading: true });
    expect(seriesCount(container)).toBe(0);

    handle.update({ mochartConfig: enhanced(), dataProvider: provider(), loading: false });
    expect(seriesCount(container)).toBe(1);
  });

  it('survives the config going away and coming back', () => {
    const { container, handle } = mountManaged({});
    handle.update({ mochartConfig: enhanced(), dataProvider: provider() });
    expect(seriesCount(container)).toBe(1);

    // cast: ManagedChartProps still types both as non-null, though core and every
    // binding treat null as the loading state (see the findings report)
    handle.update({ mochartConfig: null, dataProvider: null, loading: true } as unknown as Partial<ManagedChartProps>);
    expect(seriesCount(container)).toBe(0);

    handle.update({ mochartConfig: enhanced(), dataProvider: provider(), loading: false });
    expect(seriesCount(container)).toBe(1);
  });

  it('accepts the arriving config through replace()', () => {
    const { container, handle } = mountManaged({});
    handle.replace({
      mochartConfig: enhanced(), dataProvider: provider(), width: WIDTH, height: HEIGHT
    } as unknown as ManagedChartProps);
    expect(seriesCount(container)).toBe(1);
  });
});
