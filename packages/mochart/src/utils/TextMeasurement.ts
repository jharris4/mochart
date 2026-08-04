import { getWithMutations } from './WithMutations';
import { arrayToMap, idAccessor } from './utils';
import { NONE, SCALE_ORDINAL } from '../config/core/constants';
import { isObject } from '../config/defaults/utils';
import type { EnhancedMochartConfig } from '../types/enhanced';
import type { ChartDomAccessors } from '../types/chart';
import type { ChartTextBoundsData } from '../types/layout';
import type { Size, TextBounds } from '../types/geometry';

type AccessorSpec = keyof ChartDomAccessors | [keyof ChartDomAccessors, string];
type DomAccessor = (id?: string) => Element | ArrayLike<SVGGraphicsElement> | null;

const emptyBounds = { width: 0, height: 0, empty: true };
const defaultBounds = { width: 20, height: 20, default: true };

export function getChartTextBoundsData(mochartConfig: EnhancedMochartConfig, domAccessors?: ChartDomAccessors | null): ChartTextBoundsData {
  const titleTextBounds = getTitleTextBounds(mochartConfig, domAccessors);
  const titleTextRawBounds = getTitleTextRawBounds(mochartConfig, domAccessors);
  const titlePrefixBounds = getTitlePrefixBounds(mochartConfig, domAccessors);
  const titleSuffixBounds = getTitleSuffixBounds(mochartConfig, domAccessors);
  const categoryAxisTickBounds = getCategoryAxisTickLabelBounds(mochartConfig, domAccessors);
  const categoryAxisSizeTickBounds = getCategoryAxisSizeTickLabelBounds(mochartConfig, domAccessors);
  const categoryAxisTitleBounds = getCategoryAxisTitleBounds(mochartConfig, domAccessors);
  const categoryAxisThresholdTitleBounds = getCategoryAxisThresholdTitleBounds(mochartConfig, domAccessors);
  const valueAxisTickBounds = getValueAxisTickLabelBounds(mochartConfig, domAccessors);
  const valueAxisTitleBounds = getValueAxisTitleBounds(mochartConfig, domAccessors);
  const valueAxisThresholdTitleBounds = getValueAxisThresholdTitleBounds(mochartConfig, domAccessors);
  const legendBounds = getLegendBounds(mochartConfig, domAccessors);
  const legendItemTextBounds = getLegendItemTextBounds(mochartConfig, domAccessors);
  const legendItemTextRawBounds = getLegendItemTextRawBounds(mochartConfig, domAccessors);
  const legendItemMaxTextBounds = getMaxBounds(legendItemTextBounds);

  const chartTextBoundsData = {
    titleTextBounds,
    titleTextRawBounds,
    titlePrefixBounds,
    titleSuffixBounds,
    categoryAxisTickBounds,
    categoryAxisSizeTickBounds,
    categoryAxisTitleBounds,
    categoryAxisThresholdTitleBounds,
    valueAxisTickBounds,
    valueAxisTitleBounds,
    valueAxisThresholdTitleBounds,
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
    if (bounds.fontSize !== undefined && bounds.fontSize > (maxBounds.fontSize ?? 0)) {
      maxBounds.fontSize = bounds.fontSize;
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

function getSvgAllBoundsWithFontSize(domAccessors: ChartDomAccessors | null | undefined, getDomElementKey: AccessorSpec, fallbackBounds: TextBounds, list: readonly unknown[]): TextBounds[] {
  return getAllBounds<SVGGraphicsElement>(domAccessors, getDomElementKey, fallbackBounds, getSvgWidthHeightAndFontSize, list);
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

// measured height is the font's em box (1.15–1.25em), so anything sized to match the text needs the font size itself
export function getSvgWidthHeightAndFontSize(domElement: SVGGraphicsElement | null): TextBounds {
  const bounds: TextBounds = getSvgWidthAndHeight(domElement);
  if (domElement !== null && typeof getComputedStyle === 'function') {
    const fontSize = parseFloat(getComputedStyle(domElement).fontSize);
    if (isFinite(fontSize) && fontSize > 0) {
      bounds.fontSize = fontSize;
    }
  }
  return bounds;
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

export function getTitleTextBounds(mochartConfig: EnhancedMochartConfig, domAccessors?: ChartDomAccessors | null): TextBounds {
  let titleTextBounds: TextBounds = emptyBounds;
  if (mochartConfig.title.text !== NONE) {
    titleTextBounds = getSvgBounds(domAccessors, 'getTitleTextDomElement', defaultBounds);
  }
  return titleTextBounds;
}

export function getTitleTextRawBounds(mochartConfig: EnhancedMochartConfig, domAccessors?: ChartDomAccessors | null): TextBounds {
  let titleTextBounds: TextBounds = emptyBounds;
  if (mochartConfig.title.text !== NONE) {
    titleTextBounds = getSvgBounds(domAccessors, 'getTitleTextRawDomElement', defaultBounds);
  }
  return titleTextBounds;
}

export function getTitlePrefixBounds(mochartConfig: EnhancedMochartConfig, domAccessors?: ChartDomAccessors | null): TextBounds {
  let titlePrefixBounds: TextBounds = emptyBounds;
  if (mochartConfig.title.text !== NONE && mochartConfig.title.prefix !== NONE) {
    titlePrefixBounds = getSvgBounds(domAccessors, 'getTitlePrefixDomElement', defaultBounds);
  }
  return titlePrefixBounds;
}

export function getTitleSuffixBounds(mochartConfig: EnhancedMochartConfig, domAccessors?: ChartDomAccessors | null): TextBounds {
  let titleSuffixBounds: TextBounds = emptyBounds;
  if (mochartConfig.title.text !== NONE && mochartConfig.title.suffix !== NONE) {
    titleSuffixBounds = getSvgBounds(domAccessors, 'getTitleSuffixDomElement', defaultBounds);
  }
  return titleSuffixBounds;
}

export function getCategoryAxisTickLabelBounds(mochartConfig: EnhancedMochartConfig, domAccessors?: ChartDomAccessors | null): TextBounds {
  let categoryAxisTickBounds: TextBounds = emptyBounds;
  if (mochartConfig.categoryAxis.visible) {
    categoryAxisTickBounds = getSvgMaxBounds(domAccessors, 'getCategoryAxisTicksDomElements', defaultBounds);
  }
  return categoryAxisTickBounds;
}

export function getCategoryAxisSizeTickLabelBounds(mochartConfig: EnhancedMochartConfig, domAccessors?: ChartDomAccessors | null): TextBounds {
  let categoryAxisSizeTickBounds: TextBounds = emptyBounds;
  if (mochartConfig.categoryAxis.visible && mochartConfig.categoryAxis.scale === SCALE_ORDINAL && mochartConfig.categoryAxis.tickLabelTruncationEnabled) {
    categoryAxisSizeTickBounds = getSvgBounds(domAccessors, 'getCategoryAxisSizeTickDomElement', defaultBounds);
  }
  return categoryAxisSizeTickBounds;
}

export function getCategoryAxisTitleBounds(mochartConfig: EnhancedMochartConfig, domAccessors?: ChartDomAccessors | null): TextBounds {
  const { categoryAxis: categoryAxisConfig } = mochartConfig;
  let categoryAxisTitleBounds: TextBounds = emptyBounds;
  if (categoryAxisConfig.visible && categoryAxisConfig.title !== NONE) {
    categoryAxisTitleBounds = getSvgBounds(domAccessors, 'getCategoryAxisTitleDomElement', defaultBounds);
  }
  return categoryAxisTitleBounds;
}

export function getCategoryAxisThresholdTitleBounds(mochartConfig: EnhancedMochartConfig, domAccessors?: ChartDomAccessors | null): TextBounds {
  const { categoryAxis: categoryAxisConfig } = mochartConfig;
  let categoryAxisThresholdTitleBounds: TextBounds = emptyBounds;
  if (categoryAxisConfig.visible && categoryAxisConfig.threshold !== NONE&& categoryAxisConfig.thresholdTitle !== NONE) {
    categoryAxisThresholdTitleBounds = getSvgBounds(domAccessors, 'getCategoryAxisThresholdTitleDomElement', defaultBounds);
  }
  return categoryAxisThresholdTitleBounds;
}




export function getValueAxisTickLabelBounds(mochartConfig: EnhancedMochartConfig, domAccessors?: ChartDomAccessors | null): Record<string, TextBounds> {
  const { valueAxes: valueAxisConfigs } = mochartConfig;
  const valueAxisTickBounds = arrayToMap(valueAxisConfigs, idAccessor, valueAxisConfig => {
    let aValueAxisTickBounds: TextBounds = emptyBounds;
    if (valueAxisConfig.visible) {
      aValueAxisTickBounds = getSvgMaxBounds(domAccessors, ['getValueAxisTicksDomElementsForId', valueAxisConfig.id], defaultBounds);
    }
    return aValueAxisTickBounds;
  });
  return valueAxisTickBounds;
}

export function getValueAxisTitleBounds(mochartConfig: EnhancedMochartConfig, domAccessors?: ChartDomAccessors | null): Record<string, TextBounds> {
  const { valueAxes: valueAxisConfigs } = mochartConfig;
  const valueAxisTitleBounds = arrayToMap(valueAxisConfigs, idAccessor, valueAxisConfig => {
    let aValueAxisTitleBounds: TextBounds = emptyBounds;
    if (valueAxisConfig.visible && valueAxisConfig.title !== NONE) {
      aValueAxisTitleBounds = getSvgBounds(domAccessors, ['getValueAxisTitleDomElementForId', valueAxisConfig.id], defaultBounds);
    }
    return aValueAxisTitleBounds;
  });
  return valueAxisTitleBounds;
}

export function getValueAxisThresholdTitleBounds(mochartConfig: EnhancedMochartConfig, domAccessors?: ChartDomAccessors | null): Record<string, TextBounds> {
  const { valueAxes: valueAxisConfigs } = mochartConfig;
  const valueAxisThresholdTitleBounds = arrayToMap(valueAxisConfigs, idAccessor, valueAxisConfig => {
    let aValueAxisThresholdTitleBounds: TextBounds = emptyBounds;
    if (valueAxisConfig.visible && valueAxisConfig.threshold !== NONE && valueAxisConfig.thresholdTitle !== NONE) {
      aValueAxisThresholdTitleBounds = getSvgBounds(domAccessors, ['getValueAxisThresholdTitleDomElementForId', valueAxisConfig.id], defaultBounds);
    }
    return aValueAxisThresholdTitleBounds;
  });
  return valueAxisThresholdTitleBounds;
}




export function getLegendBounds(mochartConfig: EnhancedMochartConfig, domAccessors?: ChartDomAccessors | null): TextBounds {
  let legendBounds: TextBounds = emptyBounds;
  if (mochartConfig.legend.visible) {
    legendBounds = getHtmlBounds(domAccessors, 'getLegendDomElement', defaultBounds);
  }
  return legendBounds;
}

// The DOM only holds legend items for showInLegend series, so the expected
// list must be filtered the same way — a full seriesConfigs list would never
// match the element count and every item would fall back to default bounds,
// leaving phantom legend slots for the hidden series.
function getLegendSeriesConfigs(mochartConfig: EnhancedMochartConfig) {
  return mochartConfig.series.filter(seriesConfig => seriesConfig.showInLegend);
}

export function getLegendItemTextBounds(mochartConfig: EnhancedMochartConfig, domAccessors?: ChartDomAccessors | null): TextBounds | TextBounds[] {
  let legendItemTextBounds: TextBounds | TextBounds[] = emptyBounds;
  if (mochartConfig.legend.visible) {
    legendItemTextBounds = getSvgAllBoundsWithFontSize(domAccessors, 'getLegendItemTextDomElements', defaultBounds, getLegendSeriesConfigs(mochartConfig));
  }
  return legendItemTextBounds;
}

export function getLegendItemTextRawBounds(mochartConfig: EnhancedMochartConfig, domAccessors?: ChartDomAccessors | null): TextBounds | TextBounds[] {
  let legendItemTextBounds: TextBounds | TextBounds[] = emptyBounds;
  if (mochartConfig.legend.visible) {
    legendItemTextBounds = getSvgAllBounds(domAccessors, 'getLegendItemTextRawDomElements', defaultBounds, getLegendSeriesConfigs(mochartConfig));
  }
  return legendItemTextBounds;
}

export function getTooltipBounds(mochartConfig: EnhancedMochartConfig, domAccessors?: ChartDomAccessors | null): TextBounds {
  let tooltipBounds: TextBounds = emptyBounds;
  if (mochartConfig.tooltip.visible) {
    tooltipBounds = getHtmlBounds(domAccessors, 'getTooltipDomElement', defaultBounds);
  }
  return tooltipBounds;
}
