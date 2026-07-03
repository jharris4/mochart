import { isObject } from './utils';
import { NONE } from '../core/constants';
import { configWithAll, filterConfigs, filterConfig } from '../core/mochartConfig';

import getAnimationDefaults from './animationConfig';
import getChartDefaults from './chartConfig';
import getColorPaletteDefaults from './colorPaletteConfig';
import getCrosshairDefaults from './crosshairConfig';
import getGroupAxisDefaults from './groupAxisConfig';
import getLegendDefaults from './legendConfig';
import getLinearGradientDefaults from './linearGradientConfig';
import getPlotDefaults from './plotConfig';
import getRadialGradientDefaults from './radialGradientConfig';
import getSeriesAxisDefaults from './seriesAxisConfig';
import getSeriesDefaults from './seriesConfig';
import getSeriesGroupDefaults from './seriesGroupConfig';
import getSeriesStackDefaults from './seriesStackConfig';
import getTitleDefaults from './titleConfig';
import getTooltipDefaults from './tooltipConfig';

function getWithDefault(config, configAll, defaults) {
  return {
    ...defaults,
    ...(isObject(configAll) ? configAll : {}),
    ...(isObject(config) ? config : {})
  };
}

function getOnlyIdWithDefaults(configs, configAll, defaults) {
  if (Array.isArray(configs)) {
    if (configs.length === 1) {
      const only = getWithDefault(configs[0], configAll, defaults[0]);
      const { id } = only;
      return id !== void 0 ? id : NONE;
    }
  }
  else if (isObject(configs)) {
    const only = getWithDefault(configs, configAll, defaults[0]);
    const { id } = only;
    return id !== void 0 ? id : NONE;
  }
  else if (Array.isArray(defaults) && defaults.length === 1) {
    const only = defaults[0];
    const { id } = only;
    return id !== void 0 ? id : NONE;
  }
  return NONE;
}

function getConfigCount(configs) {
  return Array.isArray(configs) ? filterConfigs(configs).length : (filterConfig(configs) ? 1 : 0);
}

export function getDefaults(config) {
  if (isObject(config)) {
    const seriesAxisConfigs = getSeriesAxisListOrSingleDefaults(config, true);
    const soleSeriesAxisId = getOnlyIdWithDefaults(config.seriesAxisConfigs, config.seriesAxisAllConfig, seriesAxisConfigs);

    const seriesStackConfigs = getListOrSingleDefaults(config.seriesStackConfigs, config.seriesStackAllConfig, (aConfig, index) => getSeriesStackDefaults(aConfig, index, soleSeriesAxisId));
    const soleSeriesStackId = getOnlyIdWithDefaults(config.seriesStackConfigs, config.seriesStackAllConfig, seriesStackConfigs);

    const seriesGroupConfigs = getListOrSingleDefaults(config.seriesGroupConfigs, config.seriesGroupAllConfig, (aConfig, index) => getSeriesGroupDefaults(aConfig, index));
    const soleSeriesGroupId = getOnlyIdWithDefaults(config.seriesGroupConfigs, config.seriesGroupAllConfig, seriesGroupConfigs);

    const linearGradientConfigs = getListOrSingleDefaults(config.linearGradientConfigs, config.linearGradientAllConfig, (aConfig, index) => getLinearGradientDefaults(aConfig, index));
    const soleLinearGradientConfigId = getOnlyIdWithDefaults(config.linearGradientConfigs, config.linearGradientAllConfig, linearGradientConfigs);

    const radialGradientConfigs = getListOrSingleDefaults(config.radialGradientConfigs, config.radialGradientAllConfig, (aConfig, index) => getRadialGradientDefaults(aConfig, index));
    const soleRadialGradientConfigId = getOnlyIdWithDefaults(config.radialGradientConfigs, config.radialGradientAllConfig, radialGradientConfigs);

    const soleGradientConfigId = soleLinearGradientConfigId ? soleLinearGradientConfigId : soleRadialGradientConfigId;

    const seriesCount = getConfigCount(config.seriesConfigs);

    const plotConfig = getPlotDefaults();
    const plotConfigDefault = getWithDefault(config.plotConfig, null, plotConfig);
    const { inverted } = plotConfigDefault;

    const seriesDefaults = (aConfig, index) =>
      getSeriesDefaults(aConfig, index, soleSeriesAxisId, soleSeriesStackId, soleSeriesGroupId, soleGradientConfigId);

    return {
      animationConfig: getAnimationDefaults(),
      chartConfig: getChartDefaults(),
      colorPaletteConfig: getColorPaletteDefaults(),
      crosshairConfig: getCrosshairDefaults(),
      groupAxisConfig: getGroupAxisDefaults(config.groupAxisConfig, inverted),
      legendConfig: getLegendDefaults(config.legendConfig, seriesCount),
      linearGradientConfigs,
      plotConfig,
      radialGradientConfigs,
      seriesAxisConfigs,
      seriesConfigs: getListOrSingleDefaults(config.seriesConfigs, config.seriesAllConfig, seriesDefaults),
      seriesGroupConfigs,
      seriesStackConfigs,
      titleConfig: getTitleDefaults(),
      tooltipConfig: getTooltipDefaults()
    };
  }
  else {
    return {};
  }
}

function getSeriesAxisListOrSingleDefaults(config, singleDefaultIfEmpty = false) {
  let configs = config.seriesAxisConfigs;
  configs = (!Array.isArray(configs) && filterConfig(configs)) ? [configs] : filterConfigs(configs);
  const allConfig = config.seriesAxisAllConfig;
  let stackConfigs = config.seriesStackConfigs || [];
  if (!Array.isArray(stackConfigs) && isObject(stackConfigs)) {
    stackConfigs = [stackConfigs];
  }
  const stackMap = {};
  for (let stackConfig of stackConfigs) {
    const { axis } = stackConfig;
    // Make sure the stackConfig.axis is never undefined. Use the first seriesConfig if necessary
    if (axis === void 0) {
      stackMap[configs[0].id] = true;
    }
    else {
      stackMap[axis] = true;
    }
  }
  const getDefaults = (aConfig, index) => getSeriesAxisDefaults(aConfig, index, stackMap[aConfig.id]);
  if (singleDefaultIfEmpty && configs.length === 0) {
    return [getDefaults(configWithAll({}, allConfig), 0)];
  }
  return configWithAll(configs, allConfig).map((config, i) => getDefaults(config, i));
}

function getListOrSingleDefaults(configs, allConfig, getDefaults, singleDefaultIfEmpty = false) {
  configs = (!Array.isArray(configs) && filterConfig(configs)) ? [configs] : filterConfigs(configs);
  if (singleDefaultIfEmpty && configs.length === 0) {
    return [getDefaults(configWithAll({}, allConfig), 0)];
  }
  return configWithAll(configs, allConfig).map((config, i) => getDefaults(config, i));
}
