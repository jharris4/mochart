import { CHART_TYPE_PIE, migrateConfig, buildMochartConfig, getDefaults, applyDefaults, sectionKeyAllMap, validateConfig } from '@mochart/core';

import type { MochartDemoConfig } from './types';

type ConfigRecord = Record<string, unknown>;

export default function buildMochartDemoConfig(config: ConfigRecord): MochartDemoConfig {
  config = migrateConfig(config);
  const configDefaults = getDefaults(config);
  // buildMochartConfig wires back-references into the section objects it is
  // given, and applyDefaults reuses default section objects when the config
  // has none of its own — so the editor views get their own defaults graph,
  // or a config without e.g. valueAxisConfigs would produce a circular
  // (non-serializable) configWithDefaults.
  const viewDefaults = getDefaults(config);
  const configWithDefaults = applyDefaults(config, viewDefaults);
  const configWithoutDefaults = withoutDefaults(configWithDefaults, viewDefaults);
  const configValidation = validateConfig(config, configDefaults);
  const mochartConfig = buildMochartConfig(config, configDefaults, configValidation);

  // helper shortcuts
  const { valid } = configValidation;
  const { categoryAxis: categoryAxisConfig, series: seriesConfigs } = mochartConfig;
  const categoryProperty = categoryAxisConfig ? categoryAxisConfig.property : undefined;
  const seriesCount = Array.isArray(seriesConfigs) ? seriesConfigs.length : 0;
  const pieMode = mochartConfig.chart?.type === CHART_TYPE_PIE;

  return {
    config,
    configDefaults,
    configWithDefaults,
    configWithoutDefaults,
    configValidation,
    mochartConfig,
    valid,
    categoryProperty,
    seriesCount,
    pieMode
  };
}

function isObject(v: unknown): v is ConfigRecord {
  return v !== null && v !== undefined && typeof v === 'object';
}

function areEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  else if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length === b.length) {
      const count = a.length;
      let i;
      for (i = 0; i < count; i++) {
        if (!areEqual(a[i], b[i])) {
          return false;
        }
      }
      return true;
    }
  }
  else if (isObject(a) && isObject(b)) {
    const keys = Object.keys(a);
    if (areEqual(keys, Object.keys(b))) {
      for (const key of keys) {
        if (!areEqual(a[key], b[key])) {
          return false;
        }
      }
      return true;
    }
  }
  return false;
}

function removeSectionDefaults(configDefaultSection: unknown, allSection: ConfigRecord, configSection: unknown): unknown {
  if (isObject(configSection)) {
    const defaultSection = isObject(configDefaultSection) ? configDefaultSection : {};
    const sectionKeys = Object.keys(configSection);
    const newSection: ConfigRecord = {};
    for (const sectionKey of sectionKeys) {
      if (!areEqual(defaultSection[sectionKey], configSection[sectionKey]) &&
          !areEqual(allSection[sectionKey], configSection[sectionKey])) {
        newSection[sectionKey] = configSection[sectionKey];
      }
    }
    return newSection;
  }
  else {
    return configSection;
  }
}

function withoutDefaults(configWithDefaults: unknown, configDefaults: unknown): ConfigRecord {
  const configWithoutDefaults: ConfigRecord = {};
  if (isObject(configWithDefaults) && isObject(configDefaults)) {
    const sectionKeys = Object.keys(configWithDefaults);
    for (const sectionKey of sectionKeys) {
      const configSection = configWithDefaults[sectionKey];
      const allKey = sectionKeyAllMap[sectionKey];
      const allSectionValue = allKey && configWithDefaults[allKey] !== undefined ? configWithDefaults[allKey] : {};
      const allSection = isObject(allSectionValue) ? allSectionValue : {};
      if (configSection !== undefined) {
        const configDefaultSection = configDefaults[sectionKey];
        if (configDefaultSection !== undefined) {
          if (Array.isArray(configSection)) {
            const defaultSections = Array.isArray(configDefaultSection) ? configDefaultSection : [];
            const newSections: unknown[] = [];
            const count = defaultSections.length;
            let i, newSection;
            for (i = 0; i < count; i++) {
              newSection = removeSectionDefaults(defaultSections[i], allSection, configSection[i]);
              newSections.push(newSection);
            }
            configWithoutDefaults[sectionKey] = newSections;
          }
          else if (isObject(configSection)) {
            const newSection = removeSectionDefaults(configDefaultSection, allSection, configSection);
            if (isObject(newSection) && Object.keys(newSection).length > 0) {
              configWithoutDefaults[sectionKey] = newSection;
            }
          }
          else {
            configWithoutDefaults[sectionKey] = configSection;
          }
        }
        else {
          configWithoutDefaults[sectionKey] = configSection;
        }
      }
    }
  }
  return configWithoutDefaults;
}
