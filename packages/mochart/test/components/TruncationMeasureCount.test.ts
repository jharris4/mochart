/**
 * Guards the cost of text truncation: every getComputedTextLength call forces layout, so the number
 * of calls each truncating host makes across an animated update sequence is pinned here. The counts
 * were recorded before the truncation state machine moved into TruncationTracker and must not grow.
 */
import { describe, it, beforeAll, expect } from 'vitest';
import { installFakeFrameClock, runFrames, mountContainer } from './helpers';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EnhancedMochartConfig } from '../../src/types/enhanced';
import type { MochartInputConfig } from '../../src';
import { mochartCssClasses } from '../../src/utils/ChartDom';
import { installTextMetrics } from '../golden/textMetrics';

const here = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(here, '../../../mochart-demo-data/src/config/truncated-text-config.json');
const dataPath = path.resolve(here, '../../../mochart-demo-data/src/data/long-category-string-values-data.json');

const WIDTH = 800;
const HEIGHT = 600;

type Host = 'tickLabels' | 'title' | 'axisTitle' | 'legendItem' | 'other';
type Counts = Record<Host, number>;

const HOST_SELECTORS: [Host, string][] = [
  ['tickLabels', '.' + mochartCssClasses['axisTickLabels']],
  ['title', '.' + mochartCssClasses['title']],
  ['axisTitle', '.' + mochartCssClasses['axisTitle']],
  ['legendItem', '.' + mochartCssClasses['legend']]
];

let counts: Counts;

function resetCounts(): void {
  counts = { tickLabels: 0, title: 0, axisTitle: 0, legendItem: 0, other: 0 };
}

function hostOf(element: Element): Host {
  for (const [host, selector] of HOST_SELECTORS) {
    if (element.closest(selector) !== null) {
      return host;
    }
  }
  return 'other';
}

let mochart: typeof import('../../src');

beforeAll(async () => {
  installTextMetrics();
  const svgProto = globalThis.SVGElement.prototype as any;
  const measure = svgProto.getComputedTextLength as (this: SVGElement) => number;
  svgProto.getComputedTextLength = function (this: SVGElement): number {
    counts[hostOf(this)]++;
    return measure.call(this);
  };
  installFakeFrameClock();
  mochart = await import('../../src');
});

function loadJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function buildConfig(): EnhancedMochartConfig {
  const migrated = mochart.migrateConfig(loadJson(configPath)) as Record<string, any>;
  migrated.animation = { ...(migrated.animation || {}), animate: true };
  return mochart.enhanceConfig(migrated as MochartInputConfig) as EnhancedMochartConfig;
}

function scaleValues(mochartConfig: EnhancedMochartConfig, rows: Record<string, any>[], factor: number): Record<string, any>[] {
  const properties = mochartConfig.series.map(seriesConfig => seriesConfig.property).filter(Boolean) as string[];
  return rows.map(row => {
    const next = { ...row };
    for (const property of properties) {
      if (typeof next[property] === 'number') {
        next[property] = Math.round(next[property] * factor);
      }
    }
    return next;
  });
}

describe('truncation measurement cost', () => {
  it('makes a fixed number of getComputedTextLength calls per host across an animated update sequence', () => {
    const mochartConfig = buildConfig();
    const rows: Record<string, any>[] = loadJson(dataPath);
    const container = mountContainer();
    const provider = (data: Record<string, any>[]) => new mochart.ArrayOfObjectsDataProvider(data);

    resetCounts();
    const chart = mochart.createChart(container, { mochartConfig, dataProvider: provider(rows), width: WIDTH, height: HEIGHT });
    runFrames();
    const initial = { ...counts };

    // value axis expands, then contracts: tick label slots change every animation frame
    resetCounts();
    chart.update({ dataProvider: provider(scaleValues(mochartConfig, rows, 12)) });
    runFrames();
    chart.update({ dataProvider: provider(scaleValues(mochartConfig, rows, 0.3)) });
    runFrames();
    const valuesAnimated = { ...counts };

    // resize: every host's available width changes at once
    resetCounts();
    chart.update({ width: WIDTH / 2 });
    runFrames();
    chart.update({ width: WIDTH });
    runFrames();
    const resized = { ...counts };

    // category churn: tick count changes, so the tick label truncation data is rebuilt
    resetCounts();
    chart.update({ dataProvider: provider(rows.slice(0, rows.length - 2)) });
    runFrames();
    chart.update({ dataProvider: provider(rows) });
    runFrames();
    const categoriesChurned = { ...counts };

    chart.destroy();

    expect({ initial, valuesAnimated, resized, categoriesChurned }).toEqual({
      initial: { tickLabels: 1303, title: 324, axisTitle: 134, legendItem: 524, other: 0 },
      valuesAnimated: { tickLabels: 6542, title: 1387, axisTitle: 570, legendItem: 2232, other: 0 },
      resized: { tickLabels: 108, title: 12, axisTitle: 73, legendItem: 30, other: 0 },
      categoriesChurned: { tickLabels: 3815, title: 745, axisTitle: 296, legendItem: 1168, other: 0 }
    });
  });
});
