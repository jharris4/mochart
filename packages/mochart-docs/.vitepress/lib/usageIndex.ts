// Build-time index of where each config property is exercised: the docs
// site's own example configs (guide + recipe pages) and the demo gallery
// configs from @mochart/demo-data. Reference pages render the result as
// "Used in" links per property, so the links can never go stale — they are
// recomputed from the same JSON/TS sources on every build.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as basic from '../../examples/basic';
import * as hero from '../../examples/hero';
import * as animation from '../../examples/animation';
import * as interaction from '../../examples/interaction';
import * as stackedBars from '../../examples/stackedBars';
import * as dualAxes from '../../examples/dualAxes';
import * as dateAxis from '../../examples/dateAxis';
import * as groupedSeries from '../../examples/groupedSeries';
import * as horizontal from '../../examples/horizontal';
import * as thresholdRange from '../../examples/thresholdRange';
import * as gradients from '../../examples/gradients';
import * as markersLabels from '../../examples/markersLabels';
import * as tooltipFormat from '../../examples/tooltipFormat';
import * as histogram from '../../examples/histogram';
import * as waterfall from '../../examples/waterfall';
import * as sparkline from '../../examples/sparkline';
import * as heatmap from '../../examples/heatmap';
import * as errorBars from '../../examples/errorBars';

export interface UsageLink {
  text: string;
  link: string;
}

export interface UsageIndex {
  /** Keyed `${sectionId}.${propertyKey}` → docs pages first, then demos. */
  perProperty: Record<string, UsageLink[]>;
  /** Links beyond the per-property caps, keyed the same way. */
  overflow: Record<string, number>;
}

/** Caps keep "Used in" short for ubiquitous properties. */
const docsLinkCap = 3;
const demoLinkCap = 3;

const docsExamples: { config: object; page: UsageLink }[] = [
  { config: hero.config, page: { text: 'Home', link: '/' } },
  { config: basic.config, page: { text: 'Getting started', link: '/guide/getting-started' } },
  { config: animation.config, page: { text: 'Staged animation', link: '/guide/staged-animation' } },
  { config: interaction.config, page: { text: 'Interaction', link: '/guide/interaction' } },
  { config: stackedBars.config, page: { text: 'Stacked bars', link: '/recipes/stacked-bars' } },
  { config: dualAxes.config, page: { text: 'Dual value axes', link: '/recipes/dual-axes' } },
  { config: dateAxis.config, page: { text: 'Date axis', link: '/recipes/date-axis' } },
  { config: groupedSeries.config, page: { text: 'Grouped series', link: '/recipes/grouped-series' } },
  { config: horizontal.config, page: { text: 'Horizontal charts', link: '/recipes/horizontal-bars' } },
  { config: thresholdRange.config, page: { text: 'Thresholds and ranges', link: '/recipes/thresholds-ranges' } },
  { config: gradients.config, page: { text: 'Gradients', link: '/recipes/gradients' } },
  { config: markersLabels.config, page: { text: 'Markers and labels', link: '/recipes/markers-labels' } },
  { config: tooltipFormat.config, page: { text: 'Tooltip formatting', link: '/recipes/tooltip-formatting' } },
  { config: histogram.config, page: { text: 'Histogram', link: '/recipes/histogram' } },
  { config: waterfall.config, page: { text: 'Waterfall', link: '/recipes/waterfall' } },
  { config: sparkline.config, page: { text: 'Sparklines', link: '/recipes/sparklines' } },
  { config: heatmap.config, page: { text: 'Heatmap', link: '/recipes/heatmap' } },
  { config: errorBars.config, page: { text: 'Error Bars', link: '/recipes/error-bars' } }
];

// exported for scripts/checkSectionCoverage.ts, which verifies these
// registries against the sections the core enhancer actually emits
export const objectSectionIds = new Set([
  'accessibility', 'animation', 'chart', 'clipIndicator', 'colorPalette',
  'crosshair', 'categoryAxis', 'legend', 'pie', 'plot', 'title', 'tooltip'
]);

export const listSectionIds = new Set([
  'linearGradients', 'radialGradients', 'valueAxes',
  'series', 'seriesGroups', 'seriesStacks'
]);

export const allKeySectionMap: Record<string, string> = {
  linearGradientDefaults: 'linearGradients',
  radialGradientDefaults: 'radialGradients',
  valueAxisDefaults: 'valueAxes',
  seriesDefaults: 'series',
  seriesGroupDefaults: 'seriesGroups',
  seriesStackDefaults: 'seriesStacks'
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** All `${sectionId}.${propertyPath}` keys a raw config sets explicitly, nested objects included. */
function collectPropertyKeys(config: Record<string, unknown>): Set<string> {
  const keys = new Set<string>();
  const addSectionKeys = (prefix: string, section: unknown) => {
    if (!isRecord(section)) {
      return;
    }
    for (const [key, value] of Object.entries(section)) {
      const path = prefix + '.' + key;
      keys.add(path);
      addSectionKeys(path, value);
    }
  };
  for (const [topKey, value] of Object.entries(config)) {
    if (objectSectionIds.has(topKey)) {
      addSectionKeys(topKey, value);
    }
    else if (listSectionIds.has(topKey)) {
      for (const entry of Array.isArray(value) ? value : [value]) {
        addSectionKeys(topKey, entry);
      }
    }
    else if (allKeySectionMap[topKey] !== undefined) {
      addSectionKeys(allKeySectionMap[topKey]!, value);
    }
  }
  return keys;
}

export function buildUsageIndex(): UsageIndex {
  const demoDataDir = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..', '..', '..', 'mochart-demo-data', 'src'
  );
  const manifest = JSON.parse(fs.readFileSync(path.join(demoDataDir, 'demos.json'), 'utf-8')) as {
    demos: { id: string; title: string; config: string }[];
  };

  const docsLinks = new Map<string, UsageLink[]>();
  const demoLinks = new Map<string, UsageLink[]>();

  for (const example of docsExamples) {
    for (const key of collectPropertyKeys(example.config as Record<string, unknown>)) {
      let links = docsLinks.get(key);
      if (links === undefined) {
        docsLinks.set(key, links = []);
      }
      links.push(example.page);
    }
  }

  for (const demo of manifest.demos) {
    const config = JSON.parse(fs.readFileSync(path.join(demoDataDir, 'config', demo.config), 'utf-8')) as Record<string, unknown>;
    for (const key of collectPropertyKeys(config)) {
      let links = demoLinks.get(key);
      if (links === undefined) {
        demoLinks.set(key, links = []);
      }
      // Trailing slash keeps VitePress from appending .html — the path is a
      // history route inside the vanilla gallery, not a docs page.
      links.push({ text: demo.title, link: '/vanilla/single/' + demo.id + '/' });
    }
  }

  const perProperty: Record<string, UsageLink[]> = {};
  const overflow: Record<string, number> = {};
  const allKeys = new Set([...docsLinks.keys(), ...demoLinks.keys()]);
  for (const key of allKeys) {
    const docs = docsLinks.get(key) ?? [];
    const demos = demoLinks.get(key) ?? [];
    perProperty[key] = [...docs.slice(0, docsLinkCap), ...demos.slice(0, demoLinkCap)];
    const hidden = Math.max(0, docs.length - docsLinkCap) + Math.max(0, demos.length - demoLinkCap);
    if (hidden > 0) {
      overflow[key] = hidden;
    }
  }
  return { perProperty, overflow };
}
