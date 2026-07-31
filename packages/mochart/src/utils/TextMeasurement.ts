import { getWithMutations } from './WithMutations';
import { arrayToMap, idAccessor } from './utils';
import { NONE, SCALE_ORDINAL } from '../config/core/constants';
import { isObject } from '../config/defaults/utils';
import type { MochartConfig } from '../types/config';
import type { ChartDomAccessors } from '../types/chart';
import type { ChartTextBoundsData } from '../types/layout';
import type { Size, TextBounds } from '../types/geometry';

type AccessorSpec = keyof ChartDomAccessors | [keyof ChartDomAccessors, string];
type DomAccessor = (id?: string) => Element | ArrayLike<SVGGraphicsElement> | null;

const emptyBounds = { width: 0, height: 0, empty: true };
const defaultBounds = { width: 20, height: 20, default: true };

export function getChartTextBoundsData(mochartConfig: MochartConfig, domAccessors?: ChartDomAccessors | null): ChartTextBoundsData {
  const titleTextBounds = getTitleTextBounds(mochartConfig, domAccessors);
  const titleTextRawBounds = getTitleTextRawBounds(mochartConfig, domAccessors);
  const titlePrefixBounds = getTitlePrefixBounds(mochartConfig, domAccessors);
  const titleSuffixBounds = getTitleSuffixBounds(mochartConfig, domAccessors);
  const groupAxisTickBounds = getGroupAxisTickLabelBounds(mochartConfig, domAccessors);
  const groupAxisSizeTickBounds = getGroupAxisSizeTickLabelBounds(mochartConfig, domAccessors);
  const groupAxisTitleBounds = getGroupAxisTitleBounds(mochartConfig, domAccessors);
  const groupAxisThresholdTitleBounds = getGroupAxisThresholdTitleBounds(mochartConfig, domAccessors);
  const seriesAxisTickBounds = getSeriesAxisTickLabelBounds(mochartConfig, domAccessors);
  const seriesAxisTitleBounds = getSeriesAxisTitleBounds(mochartConfig, domAccessors);
  const seriesAxisThresholdTitleBounds = getSeriesAxisThresholdTitleBounds(mochartConfig, domAccessors);
  const legendBounds = getLegendBounds(mochartConfig, domAccessors);
  const legendItemTextBounds = getLegendItemTextBounds(mochartConfig, domAccessors);
  const legendItemTextRawBounds = getLegendItemTextRawBounds(mochartConfig, domAccessors);
  const legendItemMaxTextBounds = getMaxBounds(legendItemTextBounds);

  const chartTextBoundsData = {
    titleTextBounds,
    titleTextRawBounds,
    titlePrefixBounds,
    titleSuffixBounds,
    groupAxisTickBounds,
    groupAxisSizeTickBounds,
    groupAxisTitleBounds,
    groupAxisThresholdTitleBounds,
    seriesAxisTickBounds,
    seriesAxisTitleBounds,
    seriesAxisThresholdTitleBounds,
    legendBounds,
    legendItemTextBounds,
    legendItemTextRawBounds,
    legendItemMaxTextBounds
  };

  return { ...chartTextBoundsData, hasDefault: hasDefault(chartTextBoundsData) } as ChartTextBoundsData;
}

export function getChartTextBoundsDataWithMutations(oldChartTextBoundsData: ChartTextBoundsData, newChartTextBoundsData: ChartTextBoundsData): ChartTextBoundsData {
  return getWithMutations(oldChartTextBoundsData, newChartTextBoundsData);
}

function hasDefault(v: unknown): boolean {
  if (isObject(v)) {
    if (v.default) {
      return true;
    }
    else {
      return Object.keys(v).some(key => hasDefault(v[key]));
    }
  }
  else if (Array.isArray(v)) {
    return v.some(i => hasDefault(i));
  }
  return false;
}

function getBounds<T>(domAccessors: ChartDomAccessors | null | undefined, getDomElementKey: AccessorSpec, fallbackBounds: TextBounds, getBoundsFunction: (element: T) => Size): TextBounds {
  if (domAccessors) {
    const accessors = domAccessors as unknown as Record<keyof ChartDomAccessors, DomAccessor>;
    const element = Array.isArray(getDomElementKey) ?
      accessors[getDomElementKey[0]](getDomElementKey[1]) : accessors[getDomElementKey]();
    const bounds = getBoundsFunction(element as T);
    return (!bounds || bounds.width === 0 || bounds.height === 0) ? fallbackBounds : bounds;
  }
  else {
    return fallbackBounds;
  }
}

function getAllBounds<T>(domAccessors: ChartDomAccessors | null | undefined, getDomElementKey: AccessorSpec, fallbackBounds: TextBounds, getBoundsFunction: (element: T) => Size, list: readonly unknown[]): TextBounds[] {
  if (domAccessors) {
    const accessors = domAccessors as unknown as Record<keyof ChartDomAccessors, DomAccessor>;
    const elements = (Array.isArray(getDomElementKey) ?
      accessors[getDomElementKey[0]](getDomElementKey[1]) : accessors[getDomElementKey]()) as ArrayLike<T> | null;
    if (elements && elements.length === list.length) {
      const count = elements.length;
      const allBounds: TextBounds[] = [];
      let bounds;
      for (let i=0; i<count; i++) {
        bounds = getBoundsFunction(elements[i]);
        allBounds.push((!bounds || bounds.width === 0 || bounds.height === 0) ? fallbackBounds : bounds);
      }
      return allBounds;
    }
    else {
      return list.map(() => fallbackBounds);
    }
  }
  else {
    return list.map(() => fallbackBounds);
  }
}

function getMaxBounds(allBounds: TextBounds | TextBounds[]): TextBounds {
  const maxBounds: TextBounds = { width: 0, height: 0 };
  // when the legend is hidden this receives emptyBounds (not an array); the old
  // babel transform-for-of-as-array plugin made for-of silently skip non-arrays
  if (!Array.isArray(allBounds)) {
    return maxBounds;
  }
  for (const bounds of allBounds) {
    if (bounds.default) {
      maxBounds.default = true;
    }
    if (bounds.width > maxBounds.width) {
      maxBounds.width = bounds.width;
    }
    if (bounds.height > maxBounds.height) {
      maxBounds.height = bounds.height;
    }
  }
  return maxBounds;
}

function getSvgBounds(domAccessors: ChartDomAccessors | null | undefined, getDomElementKey: AccessorSpec, fallbackBounds: TextBounds): TextBounds {
  return getBounds<SVGGraphicsElement | null>(domAccessors, getDomElementKey, fallbackBounds, getSvgWidthAndHeight);
}

function getSvgAllBounds(domAccessors: ChartDomAccessors | null | undefined, getDomElementKey: AccessorSpec, fallbackBounds: TextBounds, list: readonly unknown[]): TextBounds[] {
  return getAllBounds<SVGGraphicsElement>(domAccessors, getDomElementKey, fallbackBounds, getSvgWidthAndHeight, list);
}

function getSvgMaxBounds(domAccessors: ChartDomAccessors | null | undefined, getDomElementKey: AccessorSpec, fallbackBounds: TextBounds): TextBounds {
  return getBounds<ArrayLike<SVGGraphicsElement>>(domAccessors, getDomElementKey, fallbackBounds, getSvgMaxWidthAndHeight);
}

function getHtmlBounds(domAccessors: ChartDomAccessors | null | undefined, getDomElementKey: AccessorSpec, fallbackBounds: TextBounds): TextBounds {
  return getBounds<Element | null>(domAccessors, getDomElementKey, fallbackBounds, getHtmlWidthAndHeight);
}

export function getBoundsWithMutations<T extends Size>(oldBounds: T | null, newBounds: T): T {
  return getWithMutations(oldBounds, newBounds);
}

export function getSvgMaxWidthAndHeight(domElements: ArrayLike<SVGGraphicsElement>): Size {
  let maxWidth = 0;
  let maxHeight = 0;
  if (domElements.length > 0) {
    maxWidth = Number.MIN_VALUE;
    maxHeight = Number.MIN_VALUE;
    let boundingBox;
    const count = domElements.length;
    for (let i = 0; i < count; i++) {
      boundingBox = domElements[i].getBBox();
      if (boundingBox.width > maxWidth) {
        maxWidth = boundingBox.width;
      }
      if (boundingBox.height > maxHeight) {
        maxHeight = boundingBox.height;
      }
    }
  }
  return {
    width: Math.ceil(maxWidth),
    height: Math.ceil(maxHeight)
  };
}

export function getSvgWidthAndHeight(domElement: SVGGraphicsElement | null): Size {
  let width = 0;
  let height = 0;
  if (domElement !== null) {
    const boundingBox = domElement.getBBox();
    width = Math.ceil(boundingBox.width);
    height = Math.ceil(boundingBox.height);
  }
  return {
    width, height
  };
}

export function getHtmlWidthAndHeight(domElement: Element | null): Size {
  let width = 0;
  let height = 0;
  if (domElement !== null) {
    const boundingBox = domElement.getBoundingClientRect();
    width = Math.ceil(boundingBox.width);
    height = Math.ceil(boundingBox.height);
  }
  return {
    width, height
  };
}

export function getTitleTextBounds(mochartConfig: MochartConfig, domAccessors?: ChartDomAccessors | null): TextBounds {
  let titleTextBounds: TextBounds = emptyBounds;
  if (mochartConfig.titleConfig.title !== NONE) {
    titleTextBounds = getSvgBounds(domAccessors, 'getTitleTextDomElement', defaultBounds);
  }
  return titleTextBounds;
}

export function getTitleTextRawBounds(mochartConfig: MochartConfig, domAccessors?: ChartDomAccessors | null): TextBounds {
  let titleTextBounds: TextBounds = emptyBounds;
  if (mochartConfig.titleConfig.title !== NONE) {
    titleTextBounds = getSvgBounds(domAccessors, 'getTitleTextRawDomElement', defaultBounds);
  }
  return titleTextBounds;
}

export function getTitlePrefixBounds(mochartConfig: MochartConfig, domAccessors?: ChartDomAccessors | null): TextBounds {
  let titlePrefixBounds: TextBounds = emptyBounds;
  if (mochartConfig.titleConfig.title !== NONE && mochartConfig.titleConfig.titlePrefix !== NONE) {
    titlePrefixBounds = getSvgBounds(domAccessors, 'getTitlePrefixDomElement', defaultBounds);
  }
  return titlePrefixBounds;
}

export function getTitleSuffixBounds(mochartConfig: MochartConfig, domAccessors?: ChartDomAccessors | null): TextBounds {
  let titleSuffixBounds: TextBounds = emptyBounds;
  if (mochartConfig.titleConfig.title !== NONE && mochartConfig.titleConfig.titleSuffix !== NONE) {
    titleSuffixBounds = getSvgBounds(domAccessors, 'getTitleSuffixDomElement', defaultBounds);
  }
  return titleSuffixBounds;
}

export function getGroupAxisTickLabelBounds(mochartConfig: MochartConfig, domAccessors?: ChartDomAccessors | null): TextBounds {
  let groupAxisTickBounds: TextBounds = emptyBounds;
  if (mochartConfig.groupAxisConfig.visible) {
    groupAxisTickBounds = getSvgMaxBounds(domAccessors, 'getGroupAxisTicksDomElements', defaultBounds);
  }
  return groupAxisTickBounds;
}

export function getGroupAxisSizeTickLabelBounds(mochartConfig: MochartConfig, domAccessors?: ChartDomAccessors | null): TextBounds {
  let groupAxisSizeTickBounds: TextBounds = emptyBounds;
  if (mochartConfig.groupAxisConfig.visible && mochartConfig.groupAxisConfig.scale === SCALE_ORDINAL && mochartConfig.groupAxisConfig.tickLabelTruncationEnabled) {
    groupAxisSizeTickBounds = getSvgBounds(domAccessors, 'getGroupAxisSizeTickDomElement', defaultBounds);
  }
  return groupAxisSizeTickBounds;
}

export function getGroupAxisTitleBounds(mochartConfig: MochartConfig, domAccessors?: ChartDomAccessors | null): TextBounds {
  const { groupAxisConfig } = mochartConfig;
  let groupAxisTitleBounds: TextBounds = emptyBounds;
  if (groupAxisConfig.visible && groupAxisConfig.title !== NONE) {
    groupAxisTitleBounds = getSvgBounds(domAccessors, 'getGroupAxisTitleDomElement', defaultBounds);
  }
  return groupAxisTitleBounds;
}

export function getGroupAxisThresholdTitleBounds(mochartConfig: MochartConfig, domAccessors?: ChartDomAccessors | null): TextBounds {
  const { groupAxisConfig } = mochartConfig;
  let groupAxisThresholdTitleBounds: TextBounds = emptyBounds;
  if (groupAxisConfig.visible && groupAxisConfig.threshold !== NONE&& groupAxisConfig.thresholdTitle !== NONE) {
    groupAxisThresholdTitleBounds = getSvgBounds(domAccessors, 'getGroupAxisThresholdTitleDomElement', defaultBounds);
  }
  return groupAxisThresholdTitleBounds;
}




export function getSeriesAxisTickLabelBounds(mochartConfig: MochartConfig, domAccessors?: ChartDomAccessors | null): Record<string, TextBounds> {
  const { seriesAxisConfigs } = mochartConfig;
  const seriesAxisTickBounds = arrayToMap(seriesAxisConfigs, idAccessor, seriesAxisConfig => {
    let aSeriesAxisTickBounds: TextBounds = emptyBounds;
    if (seriesAxisConfig.visible) {
      aSeriesAxisTickBounds = getSvgMaxBounds(domAccessors, ['getSeriesAxisTicksDomElementsForId', seriesAxisConfig.id], defaultBounds);
    }
    return aSeriesAxisTickBounds;
  });
  return seriesAxisTickBounds;
}

export function getSeriesAxisTitleBounds(mochartConfig: MochartConfig, domAccessors?: ChartDomAccessors | null): Record<string, TextBounds> {
  const { seriesAxisConfigs } = mochartConfig;
  const seriesAxisTitleBounds = arrayToMap(seriesAxisConfigs, idAccessor, seriesAxisConfig => {
    let aSeriesAxisTitleBounds: TextBounds = emptyBounds;
    if (seriesAxisConfig.visible && seriesAxisConfig.title !== NONE) {
      aSeriesAxisTitleBounds = getSvgBounds(domAccessors, ['getSeriesAxisTitleDomElementForId', seriesAxisConfig.id], defaultBounds);
    }
    return aSeriesAxisTitleBounds;
  });
  return seriesAxisTitleBounds;
}

export function getSeriesAxisThresholdTitleBounds(mochartConfig: MochartConfig, domAccessors?: ChartDomAccessors | null): Record<string, TextBounds> {
  const { seriesAxisConfigs } = mochartConfig;
  const seriesAxisThresholdTitleBounds = arrayToMap(seriesAxisConfigs, idAccessor, seriesAxisConfig => {
    let aSeriesAxisThresholdTitleBounds: TextBounds = emptyBounds;
    if (seriesAxisConfig.visible && seriesAxisConfig.threshold !== NONE && seriesAxisConfig.thresholdTitle !== NONE) {
      aSeriesAxisThresholdTitleBounds = getSvgBounds(domAccessors, ['getSeriesAxisThresholdTitleDomElementForId', seriesAxisConfig.id], defaultBounds);
    }
    return aSeriesAxisThresholdTitleBounds;
  });
  return seriesAxisThresholdTitleBounds;
}




export function getLegendBounds(mochartConfig: MochartConfig, domAccessors?: ChartDomAccessors | null): TextBounds {
  let legendBounds: TextBounds = emptyBounds;
  if (mochartConfig.legendConfig.visible) {
    legendBounds = getHtmlBounds(domAccessors, 'getLegendDomElement', defaultBounds);
  }
  return legendBounds;
}

// The DOM only holds legend items for showInLegend series, so the expected
// list must be filtered the same way — a full seriesConfigs list would never
// match the element count and every item would fall back to default bounds,
// leaving phantom legend slots for the hidden series.
function getLegendSeriesConfigs(mochartConfig: MochartConfig) {
  return mochartConfig.seriesConfigs.filter(seriesConfig => seriesConfig.showInLegend);
}

export function getLegendItemTextBounds(mochartConfig: MochartConfig, domAccessors?: ChartDomAccessors | null): TextBounds | TextBounds[] {
  let legendItemTextBounds: TextBounds | TextBounds[] = emptyBounds;
  if (mochartConfig.legendConfig.visible) {
    legendItemTextBounds = getSvgAllBounds(domAccessors, 'getLegendItemTextDomElements', defaultBounds, getLegendSeriesConfigs(mochartConfig));
  }
  return legendItemTextBounds;
}

export function getLegendItemTextRawBounds(mochartConfig: MochartConfig, domAccessors?: ChartDomAccessors | null): TextBounds | TextBounds[] {
  let legendItemTextBounds: TextBounds | TextBounds[] = emptyBounds;
  if (mochartConfig.legendConfig.visible) {
    legendItemTextBounds = getSvgAllBounds(domAccessors, 'getLegendItemTextRawDomElements', defaultBounds, getLegendSeriesConfigs(mochartConfig));
  }
  return legendItemTextBounds;
}

export function getTooltipBounds(mochartConfig: MochartConfig, domAccessors?: ChartDomAccessors | null): TextBounds {
  let tooltipBounds: TextBounds = emptyBounds;
  if (mochartConfig.tooltipConfig.visible) {
    tooltipBounds = getHtmlBounds(domAccessors, 'getTooltipDomElement', defaultBounds);
  }
  return tooltipBounds;
}
