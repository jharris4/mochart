import { isObject } from './utils';
import { CHART_TYPE_PIE, NONE } from '../core/constants';
import { deepMergeAll } from '../core/deepMerge';
import { configWithAll, filterConfigs, filterConfig } from '../core/mochartConfig';

import getAnimationDefaults from './animationConfig';
import getChartDefaults from './chartConfig';
import getColorPaletteDefaults from './colorPaletteConfig';
import getCrosshairDefaults from './crosshairConfig';
import getGroupAxisDefaults from './groupAxisConfig';
import getLegendDefaults from './legendConfig';
import getLinearGradientDefaults from './linearGradientConfig';
import getPieDefaults from './pieConfig';
import getPlotDefaults from './plotConfig';
import getRadialGradientDefaults from './radialGradientConfig';
import getSeriesAxisDefaults from './seriesAxisConfig';
import getSeriesDefaults from './seriesConfig';
import getSeriesGroupDefaults from './seriesGroupConfig';
import getSeriesStackDefaults from './seriesStackConfig';
import getTitleDefaults from './titleConfig';
import getTooltipDefaults from './tooltipConfig';
import type {
  DeepPartial, LinearGradientConfig, MochartInputConfig, RadialGradientConfig,
  SeriesAxisConfig, SeriesConfig, SeriesGroupConfig, SeriesStackConfig
} from '../../types/config';

function getWithDefault<T extends object>(config: unknown, configAll: unknown, defaults: T): T {
  return deepMergeAll<T>(defaults, isObject(configAll) ? configAll : {}, isObject(config) ? config : {});
}

function getOnlyIdWithDefaults<T extends { id?: string }>(configs: unknown, configAll: unknown, defaults: T[]): string | null {
  if (Array.isArray(configs)) {
    if (configs.length === 1) {
      const only = getWithDefault(configs[0], configAll, defaults[0]);
      const { id } = only;
      return id !== undefined ? id : NONE;
    }
  }
  else if (isObject(configs)) {
    const only = getWithDefault(configs, configAll, defaults[0]);
    const { id } = only;
    return id !== undefined ? id : NONE;
  }
  else if (Array.isArray(defaults) && defaults.length === 1) {
    const only = defaults[0];
    const { id } = only;
    return id !== undefined ? id : NONE;
  }
  return NONE;
}

function getConfigCount(configs: unknown): number {
  return Array.isArray(configs) ? filterConfigs(configs).length : (filterConfig(configs) ? 1 : 0);
}

export function getDefaults(config: MochartInputConfig | unknown): Record<string, unknown> {
  if (isObject(config)) {
    const inputConfig = config as MochartInputConfig;
    const chartConfig = getChartDefaults();
    const chartConfigDefault = getWithDefault(inputConfig.chartConfig, null, chartConfig);
    const pieMode = chartConfigDefault.type === CHART_TYPE_PIE;

    const seriesAxisConfigs = getSeriesAxisListOrSingleDefaults(inputConfig, true, pieMode);
    const soleSeriesAxisId = getOnlyIdWithDefaults(inputConfig.seriesAxisConfigs, inputConfig.seriesAxisAllConfig, seriesAxisConfigs);

    const seriesStackConfigs = getListOrSingleDefaults<SeriesStackConfig>(inputConfig.seriesStackConfigs, inputConfig.seriesStackAllConfig, (aConfig, index) => getSeriesStackDefaults(aConfig, index, soleSeriesAxisId));
    const soleSeriesStackId = getOnlyIdWithDefaults(inputConfig.seriesStackConfigs, inputConfig.seriesStackAllConfig, seriesStackConfigs);

    const seriesGroupConfigs = getListOrSingleDefaults<SeriesGroupConfig>(inputConfig.seriesGroupConfigs, inputConfig.seriesGroupAllConfig, (aConfig, index) => getSeriesGroupDefaults(aConfig, index));
    const soleSeriesGroupId = getOnlyIdWithDefaults(inputConfig.seriesGroupConfigs, inputConfig.seriesGroupAllConfig, seriesGroupConfigs);

    const linearGradientConfigs = getListOrSingleDefaults<LinearGradientConfig>(inputConfig.linearGradientConfigs, inputConfig.linearGradientAllConfig, (aConfig, index) => getLinearGradientDefaults(aConfig, index));
    const soleLinearGradientConfigId = getOnlyIdWithDefaults(inputConfig.linearGradientConfigs, inputConfig.linearGradientAllConfig, linearGradientConfigs);

    const radialGradientConfigs = getListOrSingleDefaults<RadialGradientConfig>(inputConfig.radialGradientConfigs, inputConfig.radialGradientAllConfig, (aConfig, index) => getRadialGradientDefaults(aConfig, index));
    const soleRadialGradientConfigId = getOnlyIdWithDefaults(inputConfig.radialGradientConfigs, inputConfig.radialGradientAllConfig, radialGradientConfigs);

    const soleGradientConfigId = soleLinearGradientConfigId ? soleLinearGradientConfigId : soleRadialGradientConfigId;

    const seriesCount = getConfigCount(inputConfig.seriesConfigs);

    const plotConfig = getPlotDefaults();
    const plotConfigDefault = getWithDefault(inputConfig.plotConfig, null, plotConfig);
    const { inverted } = plotConfigDefault;

    const seriesDefaults = (aConfig: DeepPartial<SeriesConfig>, index: number) =>
      getSeriesDefaults(aConfig, index, soleSeriesAxisId, soleSeriesStackId, soleSeriesGroupId, soleGradientConfigId);

    return {
      animationConfig: getAnimationDefaults(),
      chartConfig,
      colorPaletteConfig: getColorPaletteDefaults(),
      crosshairConfig: getCrosshairDefaults(),
      groupAxisConfig: getGroupAxisDefaults(inputConfig.groupAxisConfig, inverted, pieMode),
      legendConfig: getLegendDefaults(inputConfig.legendConfig, seriesCount),
      linearGradientConfigs,
      pieConfig: getPieDefaults(inputConfig.pieConfig),
      plotConfig,
      radialGradientConfigs,
      seriesAxisConfigs,
      seriesConfigs: getListOrSingleDefaults<SeriesConfig>(inputConfig.seriesConfigs, inputConfig.seriesAllConfig, seriesDefaults),
      seriesGroupConfigs,
      seriesStackConfigs,
      titleConfig: getTitleDefaults(),
      tooltipConfig: getTooltipDefaults(inputConfig.tooltipConfig, pieMode)
    };
  }
  else {
    return {};
  }
}

function getSeriesAxisListOrSingleDefaults(config: MochartInputConfig, singleDefaultIfEmpty = false, pieMode = false): SeriesAxisConfig[] {
  const rawConfigs = config.seriesAxisConfigs;
  const configs = ((!Array.isArray(rawConfigs) && filterConfig(rawConfigs)) ? [rawConfigs] : filterConfigs(rawConfigs)) as DeepPartial<SeriesAxisConfig>[];
  const allConfig = config.seriesAxisAllConfig;
  let stackConfigs = config.seriesStackConfigs || [];
  if (!Array.isArray(stackConfigs) && isObject(stackConfigs)) {
    stackConfigs = [stackConfigs];
  }
  const stackMap: Record<string, boolean> = {};
  for (const stackConfig of stackConfigs) {
    const { axis } = stackConfig;
    // Make sure the stackConfig.axis is never undefined. Use the first seriesConfig if necessary
    if (axis === undefined) {
      stackMap[String(configs[0]?.id)] = true;
    }
    else {
      stackMap[axis] = true;
    }
  }
  const getDefaults = (aConfig: DeepPartial<SeriesAxisConfig>, index: number) => getSeriesAxisDefaults(aConfig, index, stackMap[aConfig.id!], pieMode);
  if (singleDefaultIfEmpty && configs.length === 0) {
    return [getDefaults(configWithAll({}, allConfig) as DeepPartial<SeriesAxisConfig>, 0) as SeriesAxisConfig];
  }
  return (configWithAll(configs, allConfig) as DeepPartial<SeriesAxisConfig>[]).map((config, i) => getDefaults(config, i) as SeriesAxisConfig);
}

function getListOrSingleDefaults<T extends object>(configs: unknown, allConfig: unknown, getDefaults: (config: DeepPartial<T>, index: number) => Partial<T>, singleDefaultIfEmpty = false): T[] {
  const filteredConfigs = (!Array.isArray(configs) && filterConfig(configs)) ? [configs] : filterConfigs(configs);
  if (singleDefaultIfEmpty && filteredConfigs.length === 0) {
    return [getDefaults(configWithAll({}, allConfig) as DeepPartial<T>, 0) as T];
  }
  return (configWithAll(filteredConfigs, allConfig) as DeepPartial<T>[]).map((config, i) => getDefaults(config, i) as T);
}
