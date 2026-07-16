import { getWithMutations } from './WithMutations';
import { arrayToMap, idAccessor } from './utils';
import { NONE, SCALE_ORDINAL } from '../config/core/constants';
import { isObject } from '../config/defaults/utils';

const emptyBounds = { width: 0, height: 0, empty: true };
const defaultBounds = { width: 20, height: 20, default: true };

export function getChartTextBoundsData(mochartConfig, domAccessors) {
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

  const chartTextBoundsData: any = {
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

  chartTextBoundsData.hasDefault = hasDefault(chartTextBoundsData);

  return chartTextBoundsData;
}

export function getChartTextBoundsDataWithMutations(oldChartTextBoundsData, newChartTextBoundsData) {
  return getWithMutations(oldChartTextBoundsData, newChartTextBoundsData);
}

function hasDefault(v) {
  if (isObject(v)) {
    if (v.default) {
      return true;
    }
    else {
      return Object.keys(v).some(key => hasDefault(v[key]));
    }
  }
  else if (Array.isArray(v)) {
    v.some(i => hasDefault(i));
  }
  return false;
}

function getBounds(domAccessors, getDomElementKey, defaultBounds, getBoundsFunction) {
  if (domAccessors) {
    const element = Array.isArray(getDomElementKey) ?
      domAccessors[getDomElementKey[0]](getDomElementKey.slice(1, getDomElementKey.length)) : domAccessors[getDomElementKey]()
    let bounds = getBoundsFunction(element);
    return (!bounds || bounds.width === 0 || bounds.height === 0) ? defaultBounds : bounds;
  }
  else {
    return defaultBounds;
  }
}

function getAllBounds(domAccessors, getDomElementKey, defaultBounds, getBoundsFunction, list) {
  if (domAccessors) {
    const elements = Array.isArray(getDomElementKey) ?
      domAccessors[getDomElementKey[0]](getDomElementKey.slice(1, getDomElementKey.length)) : domAccessors[getDomElementKey]()
    if (elements && elements.length === list.length) {
      const count = elements.length;
      const allBounds = [];
      let bounds;
      for (let i=0; i<count; i++) {
        bounds = getBoundsFunction(elements[i]);
        allBounds.push((!bounds || bounds.width === 0 || bounds.height === 0) ? defaultBounds : bounds);
      }
      return allBounds;
    }
    else {
      return list.map(item => defaultBounds);
    }
  }
  else {
    return list.map(item => defaultBounds);
  }
}

function getMaxBounds(allBounds) {
  const maxBounds = { width: 0, height: 0 };
  // when the legend is hidden this receives emptyBounds (not an array); the old
  // babel transform-for-of-as-array plugin made for-of silently skip non-arrays
  if (!Array.isArray(allBounds)) {
    return maxBounds;
  }
  for (let bounds of allBounds) {
    if (bounds.width > maxBounds.width) {
      maxBounds.width = bounds.width;
    }
    if (bounds.height > maxBounds.height) {
      maxBounds.height = bounds.height;
    }
  }
  return maxBounds;
}

function getSvgBounds(domAccessors, getDomElementKey, defaultBounds) {
  return getBounds(domAccessors, getDomElementKey, defaultBounds, getSvgWidthAndHeight);
}

function getSvgAllBounds(domAccessors, getDomElementKey, defaultBounds, list) {
  return getAllBounds(domAccessors, getDomElementKey, defaultBounds, getSvgWidthAndHeight, list);
}

function getSvgMaxBounds(domAccessors, getDomElementKey, defaultBounds) {
  return getBounds(domAccessors, getDomElementKey, defaultBounds, getSvgMaxWidthAndHeight);
}

function getHtmlBounds(domAccessors, getDomElementKey, defaultBounds) {
  return getBounds(domAccessors, getDomElementKey, defaultBounds, getHtmlWidthAndHeight);
}

export function getBoundsWithMutations(oldBounds, newBounds) {
  return getWithMutations(oldBounds, newBounds);
}

export function getSvgMaxWidthAndHeight(domElements) {
  let maxWidth = 0;
  let maxHeight = 0;
  if (domElements.length > 0) {
    maxWidth = Number.MIN_VALUE;
    maxHeight = Number.MIN_VALUE;
    let boundingBox;
    let count = domElements.length;
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

export function getSvgWidthAndHeight(domElement) {
  let width = 0;
  let height = 0;
  if (domElement !== null) {
    let boundingBox = domElement.getBBox();
    width = Math.ceil(boundingBox.width);
    height = Math.ceil(boundingBox.height);
  }
  return {
    width, height
  };
}

export function getHtmlWidthAndHeight(domElement) {
  let width = 0;
  let height = 0;
  if (domElement !== null) {
    let boundingBox = domElement.getBoundingClientRect();
    width = Math.ceil(boundingBox.width);
    height = Math.ceil(boundingBox.height);
  }
  return {
    width, height
  };
}

export function getTitleTextBounds(mochartConfig, domAccessors) {
  let titleTextBounds = emptyBounds;
  if (mochartConfig.titleConfig.title !== NONE) {
    titleTextBounds = getSvgBounds(domAccessors, 'getTitleTextDomElement', defaultBounds);
  }
  return titleTextBounds;
}

export function getTitleTextRawBounds(mochartConfig, domAccessors) {
  let titleTextBounds = emptyBounds;
  if (mochartConfig.titleConfig.title !== NONE) {
    titleTextBounds = getSvgBounds(domAccessors, 'getTitleTextRawDomElement', defaultBounds);
  }
  return titleTextBounds;
}

export function getTitlePrefixBounds(mochartConfig, domAccessors) {
  let titlePrefixBounds = emptyBounds;
  if (mochartConfig.titleConfig.title !== NONE && mochartConfig.titleConfig.titlePrefix !== NONE) {
    titlePrefixBounds = getSvgBounds(domAccessors, 'getTitlePrefixDomElement', defaultBounds);
  }
  return titlePrefixBounds;
}

export function getTitleSuffixBounds(mochartConfig, domAccessors) {
  let titleSuffixBounds = emptyBounds;
  if (mochartConfig.titleConfig.title !== NONE && mochartConfig.titleConfig.titleSuffix !== NONE) {
    titleSuffixBounds = getSvgBounds(domAccessors, 'getTitleSuffixDomElement', defaultBounds);
  }
  return titleSuffixBounds;
}

export function getGroupAxisTickLabelBounds(mochartConfig, domAccessors) {
  let groupAxisTickBounds = emptyBounds;
  if (mochartConfig.groupAxisConfig.visible) {
    groupAxisTickBounds = getSvgMaxBounds(domAccessors, 'getGroupAxisTicksDomElements', defaultBounds);
  }
  return groupAxisTickBounds;
}

export function getGroupAxisSizeTickLabelBounds(mochartConfig, domAccessors) {
  let groupAxisSizeTickBounds = emptyBounds;
  if (mochartConfig.groupAxisConfig.visible && mochartConfig.groupAxisConfig.scale === SCALE_ORDINAL && mochartConfig.groupAxisConfig.tickLabelTruncationEnabled) {
    groupAxisSizeTickBounds = getSvgBounds(domAccessors, 'getGroupAxisSizeTickDomElement', defaultBounds);
  }
  return groupAxisSizeTickBounds;
}

export function getGroupAxisTitleBounds(mochartConfig, domAccessors) {
  const { groupAxisConfig } = mochartConfig;
  let groupAxisTitleBounds = emptyBounds;
  if (groupAxisConfig.visible && groupAxisConfig.title !== NONE) {
    groupAxisTitleBounds = getSvgBounds(domAccessors, 'getGroupAxisTitleDomElement', defaultBounds);
  }
  return groupAxisTitleBounds;
}

export function getGroupAxisThresholdTitleBounds(mochartConfig, domAccessors) {
  const { groupAxisConfig } = mochartConfig;
  let groupAxisThresholdTitleBounds = emptyBounds;
  if (groupAxisConfig.visible && groupAxisConfig.threshold !== NONE&& groupAxisConfig.thresholdTitle !== NONE) {
    groupAxisThresholdTitleBounds = getSvgBounds(domAccessors, 'getGroupAxisThresholdTitleDomElement', defaultBounds);
  }
  return groupAxisThresholdTitleBounds;
}

export function getGroupAxisThresholdMinTitleBounds(mochartConfig, domAccessors) {

}

export function getGroupAxisThresholdMaxTitleBounds(mochartConfig, domAccessors) {

}

export function getGroupAxisThresholdRangeTitleBounds(mochartConfig, domAccessors) {

}

export function getSeriesAxisTickLabelBounds(mochartConfig, domAccessors) {
  const { seriesAxisConfigs } = mochartConfig;
  let seriesAxisTickBounds = arrayToMap(seriesAxisConfigs, idAccessor, seriesAxisConfig => {
    let aSeriesAxisTickBounds = emptyBounds;
    if (seriesAxisConfig.visible) {
      aSeriesAxisTickBounds = getSvgMaxBounds(domAccessors, ['getSeriesAxisTicksDomElementsForId', seriesAxisConfig.id], defaultBounds);
    }
    return aSeriesAxisTickBounds;
  });
  return seriesAxisTickBounds;
}

export function getSeriesAxisTitleBounds(mochartConfig, domAccessors) {
  const { seriesAxisConfigs } = mochartConfig;
  let seriesAxisTitleBounds = arrayToMap(seriesAxisConfigs, idAccessor, seriesAxisConfig => {
    let aSeriesAxisTitleBounds = emptyBounds;
    if (seriesAxisConfig.visible && seriesAxisConfig.title !== NONE) {
      aSeriesAxisTitleBounds = getSvgBounds(domAccessors, ['getSeriesAxisTitleDomElementForId', seriesAxisConfig.id], defaultBounds);
    }
    return aSeriesAxisTitleBounds;
  });
  return seriesAxisTitleBounds;
}

export function getSeriesAxisThresholdTitleBounds(mochartConfig, domAccessors) {
  const { seriesAxisConfigs } = mochartConfig;
  let seriesAxisThresholdTitleBounds = arrayToMap(seriesAxisConfigs, idAccessor, seriesAxisConfig => {
    let aSeriesAxisThresholdTitleBounds = emptyBounds;
    if (seriesAxisConfig.visible && seriesAxisConfig.threshold !== NONE && seriesAxisConfig.thresholdTitle !== NONE) {
      aSeriesAxisThresholdTitleBounds = getSvgBounds(domAccessors, ['getSeriesAxisThresholdTitleDomElementForId', seriesAxisConfig.id], defaultBounds);
    }
    return aSeriesAxisThresholdTitleBounds;
  });
  return seriesAxisThresholdTitleBounds;
}

export function getSeriesAxisThresholdMinTitleBounds(mochartConfig, domAccessors) {

}

export function getSeriesAxisThresholdMaxTitleBounds(mochartConfig, domAccessors) {

}

export function getSeriesAxisThresholdRangeTitleBounds(mochartConfig, domAccessors) {

}

export function getLegendBounds(mochartConfig, domAccessors) {
  let legendBounds = emptyBounds;
  if (mochartConfig.legendConfig.visible) {
    legendBounds = getHtmlBounds(domAccessors, 'getLegendDomElement', defaultBounds);
  }
  return legendBounds;
}

export function getLegendItemTextBounds(mochartConfig, domAccessors) {
  let legendItemTextBounds = emptyBounds;
  if (mochartConfig.legendConfig.visible) {
    legendItemTextBounds = getSvgAllBounds(domAccessors, 'getLegendItemTextDomElements', defaultBounds, mochartConfig.seriesConfigs);
  }
  return legendItemTextBounds;
}

export function getLegendItemTextRawBounds(mochartConfig, domAccessors) {
  let legendItemTextBounds = emptyBounds;
  if (mochartConfig.legendConfig.visible) {
    legendItemTextBounds = getSvgAllBounds(domAccessors, 'getLegendItemTextRawDomElements', defaultBounds, mochartConfig.seriesConfigs);
  }
  return legendItemTextBounds;
}

export function getTooltipBounds(mochartConfig, domAccessors) {
  let tooltipBounds = emptyBounds;
  if (mochartConfig.tooltipConfig.visible) {
    tooltipBounds = getHtmlBounds(domAccessors, 'getTooltipDomElement', defaultBounds);
  }
  return tooltipBounds;
}
