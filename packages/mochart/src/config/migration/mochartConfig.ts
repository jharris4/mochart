import { CONFIG_VERSION } from '../core/constants';

type LegacyConfig = Record<string, unknown>;

function isRecord(value: unknown): value is LegacyConfig {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export default function migrateConfig(config: LegacyConfig): LegacyConfig {
  const { version } = config;
  const migrationSteps: Array<(config: LegacyConfig) => LegacyConfig> = [];
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

export function migrateConfig_1_0_0_TO_1_0_1(config: LegacyConfig): LegacyConfig {
  const version = CONFIG_VERSION;
  const { version: oldVersion, seriesConfigs: oldSeriesConfigs, ...otherProps } = config;

  let seriesConfigs = oldSeriesConfigs;
  if (oldSeriesConfigs !== void 0 && Array.isArray(oldSeriesConfigs)) {
    seriesConfigs = oldSeriesConfigs.map(item => {
      let seriesConfig = isRecord(item) ? item : {};
      const { color, ...otherSettings } = seriesConfig;
      if (color !== void 0) {
        const strokeColor = color;
        const fillColor = color;
        seriesConfig = { ...otherSettings, strokeColor, fillColor };
      }
      return seriesConfig;
    });
  }
  return { ...otherProps, version, seriesConfigs };
}

export function migrateConfig_1_0_1_TO_1_0_2(config: LegacyConfig): LegacyConfig {
  const version = CONFIG_VERSION;
  const { version: oldVersion, animationConfig: oldAnimationConfig, ...otherProps } = config;
  let animationConfig = oldAnimationConfig;
  if (isRecord(animationConfig) && animationConfig.valueChangeDuration !== void 0) {
    animationConfig = { ...animationConfig, initialDuration: animationConfig.valueChangeDuration };
  }
  return { ...otherProps, version, ...(animationConfig ? { animationConfig } : {}) };
}

export function migrateConfig_1_0_2_TO_1_0_3(config: LegacyConfig): LegacyConfig {
  const version = CONFIG_VERSION;
  const { version: oldVersion, groupAxisConfig: oldGroupAxisConfig, seriesAxisConfigs: oldSeriesAxisConfigs, ...otherProps } = config;
  let groupAxisConfig: unknown = oldGroupAxisConfig;
  if (isRecord(groupAxisConfig) && groupAxisConfig.focusedTickMarks !== void 0) {
    const { focusedTickMarks, ...remainingGroupAxisConfig } = groupAxisConfig;
    const migratedGroupAxisConfig = { ...remainingGroupAxisConfig, focusTickMarks: focusedTickMarks };
    groupAxisConfig = migratedGroupAxisConfig;
  }
  let seriesAxisConfigs = oldSeriesAxisConfigs;
  if (seriesAxisConfigs !== void 0) {
    if (Array.isArray(seriesAxisConfigs)) {
      if (seriesAxisConfigs.some(axisConfig => isRecord(axisConfig) && axisConfig.focusedTickMarks !== void 0)) {
        seriesAxisConfigs = seriesAxisConfigs.map(item => {
          let axisConfig = isRecord(item) ? item : {};
          if (axisConfig.focusedTickMarks !== void 0) {
            axisConfig = { ...axisConfig, focusTickMarks: axisConfig.focusedTickMarks };
            delete axisConfig.focusedTickMarks;
          }
          return axisConfig;
        });
      }
    }
    else {
      if (isRecord(seriesAxisConfigs) && seriesAxisConfigs.focusedTickMarks !== void 0) {
        const { focusedTickMarks, ...remainingSeriesAxisConfig } = seriesAxisConfigs;
        const migratedSeriesAxisConfigs = { ...remainingSeriesAxisConfig, focusTickMarks: focusedTickMarks };
        seriesAxisConfigs = migratedSeriesAxisConfigs;
      }
    }
  }
  return { ...otherProps, version, ...(groupAxisConfig ? { groupAxisConfig } : {}), ...(seriesAxisConfigs ? { seriesAxisConfigs } : {}) };
}
