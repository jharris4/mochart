/**
 * accessibility.respectReducedMotion: when the OS-level prefers-reduced-motion
 * setting is on, the managed chart swaps to the static (instant) data source
 * — unless the config opts out — and follows live preference changes.
 */
import { describe, it, beforeAll, beforeEach, afterEach, expect, vi } from 'vitest';

const FRAME_MS = 16;

let mochart: typeof import('../../src');

class FakeMediaQueryList extends EventTarget {
  matches = false;
  media = '(prefers-reduced-motion: reduce)';
}

let reducedMotionQuery: FakeMediaQueryList;

beforeAll(async () => {
  const svgProto = globalThis.SVGElement.prototype as any;
  if (typeof svgProto.getComputedTextLength !== 'function') {
    svgProto.getComputedTextLength = () => 0;
  }
  if (typeof svgProto.getSubStringLength !== 'function') {
    svgProto.getSubStringLength = () => 0;
  }
  if (typeof svgProto.getBBox !== 'function') {
    svgProto.getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 });
  }
  if (typeof globalThis.requestAnimationFrame !== 'function') {
    globalThis.requestAnimationFrame = (callback: FrameRequestCallback) =>
      setTimeout(() => callback(performance.now()), FRAME_MS) as unknown as number;
    globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id);
  }
  vi.useFakeTimers({
    toFake: [
      'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
      'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'
    ]
  });
  mochart = await import('../../src');
});

beforeEach(() => {
  reducedMotionQuery = new FakeMediaQueryList();
  vi.stubGlobal('matchMedia', () => reducedMotionQuery);
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
  vi.clearAllTimers();
});

function runFrames(maxFrames = 500) {
  let frames = 0;
  while (vi.getTimerCount() > 0 && frames < maxFrames) {
    vi.advanceTimersByTime(FRAME_MS);
    frames++;
  }
}

import type { MochartInputConfig } from '../../src/types/config';

const config = {
  version: '1.0.0',
  categoryAxis: { property: 'label', type: 'string', scale: 'ordinal' },
  series: [{ property: 'value', renderer: 'bar' }]
} as unknown as MochartInputConfig;

const configKeepAnimating = {
  ...(config as object),
  accessibility: { respectReducedMotion: false }
} as unknown as MochartInputConfig;

const initialData = () => [
  { label: 'a', value: 1 },
  { label: 'b', value: 3 }
];
const changedData = () => [
  { label: 'a', value: 5 },
  { label: 'b', value: 3 }
];

function mountContainer(): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

function barPaths(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('path.mochart-series-bar'))
    .map(path => path.getAttribute('d') ?? '');
}

/** The settled bar geometry of a chart mounted directly with the given data. */
function settledPaths(chartConfig: MochartInputConfig, data: Record<string, unknown>[]): string[] {
  const container = mountContainer();
  const chart = mochart.createDefaultChart(container, { config: chartConfig, data, width: 300, height: 200 });
  runFrames();
  const paths = barPaths(container);
  chart.destroy();
  container.remove();
  return paths;
}

describe('accessibility.respectReducedMotion', () => {
  it('applies data changes instantly when the system prefers reduced motion', () => {
    reducedMotionQuery.matches = true;
    const finalPaths = settledPaths(config, changedData());

    const container = mountContainer();
    const chart = mochart.createDefaultChart(container, { config, data: initialData(), width: 300, height: 200 });
    runFrames();
    chart.update({ data: changedData() });
    expect(barPaths(container)).toEqual(finalPaths); // no frames advanced: instant
    chart.destroy();
  });

  it('keeps animating when respectReducedMotion is false', () => {
    reducedMotionQuery.matches = true;
    const finalPaths = settledPaths(configKeepAnimating, changedData());

    const container = mountContainer();
    const chart = mochart.createDefaultChart(container, { config: configKeepAnimating, data: initialData(), width: 300, height: 200 });
    runFrames();
    chart.update({ data: changedData() });
    expect(barPaths(container)).not.toEqual(finalPaths); // tween in flight
    runFrames();
    expect(barPaths(container)).toEqual(finalPaths);
    chart.destroy();
  });

  it('follows a live preference change without re-creating the chart', () => {
    const finalPaths = settledPaths(config, changedData());

    const container = mountContainer();
    const chart = mochart.createDefaultChart(container, { config, data: initialData(), width: 300, height: 200 });
    runFrames();

    reducedMotionQuery.matches = true;
    reducedMotionQuery.dispatchEvent(new Event('change'));
    chart.update({ data: changedData() });
    expect(barPaths(container)).toEqual(finalPaths); // no frames advanced: instant

    chart.destroy();
    reducedMotionQuery.dispatchEvent(new Event('change')); // listener removed: no throw
  });
});
