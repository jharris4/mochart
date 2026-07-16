import { CONFIG_VERSION } from '../core/constants';

export default function migrateConfig(config) {
  const { version } = config;
  const migrationSteps = [];
  switch(version) {
    case '1.0': // Handle the fact that initial version was not proper semver :-(
    case '1.0.0':
      migrationSteps.push(migrateConfig_1_0_0_TO_1_0_1);
    case '1.0.1':
      migrationSteps.push(migrateConfig_1_0_1_TO_1_0_2);
    case '1.0.2':
      migrationSteps.push(migrateConfig_1_0_2_TO_1_0_3);
  }

  let migratedConfig = config;
  for (let migrationStep of migrationSteps) {
    migratedConfig = migrationStep(migratedConfig);
  }
  return migratedConfig;
}

export function migrateConfig_1_0_0_TO_1_0_1(config) {
  const version = CONFIG_VERSION;
  const { version: oldVersion, seriesConfigs: oldSeriesConfigs, ...otherProps } = config;

  let seriesConfigs = oldSeriesConfigs;
  if (oldSeriesConfigs !== void 0 && Array.isArray(oldSeriesConfigs)) {
    seriesConfigs = oldSeriesConfigs.map(seriesConfig => {
      const { color, ...otherSettings } = seriesConfig;
      if (color !== void 0) {
        const strokeColor = color;
        const fillColor = color;
        seriesConfig = { ...otherSettings, strokeColor, fillColor };
      }
      return seriesConfig;
    });
    for (let seriesConfig of seriesConfigs) {
      const { color, ...otherSettings } = seriesConfig;
      if (color !== void 0) {
        seriesConfig = { ...otherSettings, }
      }
    }
  }
  return { ...otherProps, version, seriesConfigs };
}

export function migrateConfig_1_0_1_TO_1_0_2(config) {
  const version = CONFIG_VERSION;
  const { version: oldVersion, animationConfig: oldAnimationConfig, ...otherProps } = config;
  let animationConfig = oldAnimationConfig;
  if (animationConfig !== void 0 && animationConfig.valueChangeDuration !== void 0) {
    animationConfig = { ...oldAnimationConfig, initialDuration: animationConfig.valueChangeDuration };
  }
  return { ...otherProps, version, ...(animationConfig ? { animationConfig } : {}) };
}

export function migrateConfig_1_0_2_TO_1_0_3(config) {
  const version = CONFIG_VERSION;
  const { version: oldVersion, groupAxisConfig: oldGroupAxisConfig, seriesAxisConfigs: oldSeriesAxisConfigs, ...otherProps } = config;
  let groupAxisConfig = oldGroupAxisConfig;
  if (groupAxisConfig !== void 0 && groupAxisConfig.focusedTickMarks !== void 0) {
    groupAxisConfig = { ...groupAxisConfig, focusTickMarks: groupAxisConfig.focusedTickMarks };
    delete groupAxisConfig.focusedTickMarks;
  }
  let seriesAxisConfigs = oldSeriesAxisConfigs;
  if (seriesAxisConfigs !== void 0) {
    if (Array.isArray(seriesAxisConfigs)) {
      if (seriesAxisConfigs.some(axisConfig => axisConfig.focusedTickMarks !== void 0)) {
        seriesAxisConfigs = seriesAxisConfigs.map(axisConfig => {
          if (axisConfig.focusedTickMarks !== void 0) {
            axisConfig = { ...axisConfig, focusTickMarks: axisConfig.focusedTickMarks };
            delete axisConfig.focusedTickMarks;
          }
          return axisConfig;
        });
      }
    }
    else {
      if (seriesAxisConfigs.focusedTickMarks !== void 0) {
        seriesAxisConfigs = { ...seriesAxisConfigs, focusTickMarks: seriesAxisConfigs.focusedTickMarks };
        delete seriesAxisConfigs.focusedTickMarks;
      }
    }
  }
  return { ...otherProps, version, ...(groupAxisConfig ? { groupAxisConfig } : {}), ...(seriesAxisConfigs ? { seriesAxisConfigs } : {}) };
}