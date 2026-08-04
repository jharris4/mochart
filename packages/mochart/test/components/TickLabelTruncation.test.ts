/**
 * Regression test for the axis tick-label truncation bookkeeping: the measured
 * truncation state must survive unrelated prop updates instead of being wiped
 * and re-measured (with one untruncated frame) on every update.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createDefaultChart } from '../../src/createChart';
import type { ChartHandle } from '../../src/createChart';
import type { DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';

const PX_PER_CHAR = 9.7;
let measureCalls = 0;

let handles: ChartHandle<DefaultChartProps>[] = [];

function rows(offset: number): Record<string, unknown>[] {
  return [
    { month: 'an-extremely-long-january-label-that-cannot-possibly-fit', sales: 10 + offset },
    { month: 'an-extremely-long-february-label-that-cannot-possibly-fit', sales: 20 + offset },
    { month: 'an-extremely-long-march-label-that-cannot-possibly-fit', sales: 30 + offset }
  ];
}

function mountChart(): { container: Element; handle: ChartHandle<DefaultChartProps> } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const handle = createDefaultChart(container, {
    config: {
      version: '1.0.0',
      animation: { animate: false },
      categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
      series: [{ property: 'sales' }]
    } as unknown as MochartInputConfig,
    data: rows(0), width: 500, height: 400
  } as DefaultChartProps);
  handles.push(handle);
  return { container, handle };
}

beforeAll(() => {
  // Character-proportional measurements (instead of the usual zero-size shims)
  // so tick-label truncation actually engages in jsdom.
  const svgProto = (globalThis as any).SVGElement.prototype;
  svgProto.getComputedTextLength = function (this: SVGTextContentElement) {
    measureCalls++;
    return (this.textContent ?? '').length * PX_PER_CHAR;
  };
  svgProto.getSubStringLength = (_start: number, count: number) => {
    measureCalls++;
    return count * PX_PER_CHAR;
  };
  if (typeof svgProto.getBBox !== 'function') {
    svgProto.getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 });
  }
});

afterEach(() => {
  for (const handle of handles) {
    handle.destroy();
  }
  handles = [];
  document.body.innerHTML = '';
});

describe('tick-label truncation state across updates', () => {
  it('keeps the measured truncation and stops measuring once settled', () => {
    const { container, handle } = mountChart();
    const labelTexts = () => [...container.querySelectorAll('.mochart-category-axis .mochart-axis-tick-label text')]
      .map(label => label.textContent ?? '');

    // one update flushes any tail of the mount-time measurement passes
    // a real prop change flushes the tail of the mount-time measurement passes
    handle.update({ focusedCategoryIndex: 0 } as Partial<DefaultChartProps>);
    const truncated = labelTexts();
    expect(truncated.length).toBeGreaterThan(0);
    expect(truncated.every(text => text.includes('…'))).toBe(true);

    // focus updates reach the axis props; the retained truncation state must
    // hold steady with no re-measuring (pre-fix every update re-measured)
    measureCalls = 0;
    for (let i = 0; i < 5; i++) {
      handle.update({ focusedCategoryIndex: (i + 1) % 3 } as Partial<DefaultChartProps>);
      expect(labelTexts()).toEqual(truncated);
    }
    expect(measureCalls).toBe(0);
  });
});
