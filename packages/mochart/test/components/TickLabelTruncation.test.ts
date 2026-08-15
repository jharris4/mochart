// Regression: measured tick-label truncation state must survive unrelated prop
// updates instead of being wiped and re-measured (with one untruncated frame).
import { describe, it, expect, beforeAll } from 'vitest';
import { mountContainer, trackHandle } from './helpers';
import { createDefaultChart } from '../../src/createChart';
import type { ChartHandle } from '../../src/createChart';
import type { DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';
import { getDescendantCssSelector } from '../../src/utils/ChartDom';

const PX_PER_CHAR = 9.7;
let measureCalls = 0;

function rows(offset: number): Record<string, unknown>[] {
  return [
    { month: 'an-extremely-long-january-label-that-cannot-possibly-fit', sales: 10 + offset },
    { month: 'an-extremely-long-february-label-that-cannot-possibly-fit', sales: 20 + offset },
    { month: 'an-extremely-long-march-label-that-cannot-possibly-fit', sales: 30 + offset }
  ];
}

function mountChart(): { container: Element; handle: ChartHandle<DefaultChartProps> } {
  const container = mountContainer();
  const handle = trackHandle(createDefaultChart(container, {
    config: {
      version: '1.0.0',
      animation: { animate: false },
      categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
      series: [{ property: 'sales' }]
    } as unknown as MochartInputConfig,
    data: rows(0), width: 500, height: 400
  } as DefaultChartProps));
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
  // proportional like the text lengths: zero-size bboxes would keep the
  // default-bounds re-measure marker set, which wipes truncation every update
  svgProto.getBBox = function (this: SVGGraphicsElement) {
    return { x: 0, y: 0, width: (this.textContent ?? '').length * PX_PER_CHAR, height: 12 };
  };
});

describe('tick-label truncation state across updates', () => {
  it('keeps the measured truncation and stops measuring once settled', () => {
    const { container, handle } = mountChart();
    const labelTexts = () => [...container.querySelectorAll(getDescendantCssSelector('categoryAxis', 'axisTickLabel') + ' text')]
      .map(label => label.textContent ?? '');

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

  it('re-truncates from the new labels when a data update replaces them', () => {
    const { container, handle } = mountChart();
    const labelTexts = () => [...container.querySelectorAll(getDescendantCssSelector('categoryAxis', 'axisTickLabel') + ' text')]
      .map(label => label.textContent ?? '');
    const isTruncationOf = (rendered: string, full: string) =>
      rendered.endsWith('…') && rendered.length > 1 && full.startsWith(rendered.slice(0, -1));

    const originals = rows(0).map(row => String(row.month));
    handle.update({ focusedCategoryIndex: 0 } as Partial<DefaultChartProps>);
    expect(labelTexts().map((text, i) => isTruncationOf(text, originals[i]))).toEqual([true, true, true]);

    // same tick count, entirely new labels — the truncation cache must adopt
    // them instead of converging on truncations of the previous labels
    const replacements = [
      'replacement-lengthy-monday-label-that-cannot-possibly-fit',
      'replacement-lengthy-tuesday-label-that-cannot-possibly-fit',
      'replacement-lengthy-wednesday-label-that-cannot-possibly-fit'
    ];
    handle.update({ data: replacements.map((month, i) => ({ month, sales: 11 + 10 * i })) } as Partial<DefaultChartProps>);
    handle.update({ focusedCategoryIndex: 1 } as Partial<DefaultChartProps>);
    expect(labelTexts().map((text, i) => isTruncationOf(text, replacements[i]))).toEqual([true, true, true]);

    // labels that now fit must render whole, not as stale truncations
    handle.update({ data: [
      { month: 'Jan', sales: 12 },
      { month: 'Feb', sales: 22 },
      { month: 'Mar', sales: 32 }
    ] } as Partial<DefaultChartProps>);
    handle.update({ focusedCategoryIndex: 2 } as Partial<DefaultChartProps>);
    expect(labelTexts()).toEqual(['Jan', 'Feb', 'Mar']);
  });
});
