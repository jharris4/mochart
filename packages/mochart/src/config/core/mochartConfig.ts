import { NONE } from './constants';
import { deepMerge, deepMergeAll, withoutUndefined } from './deepMerge';
import type { ConfigValidation, MochartConfig } from '../../types/config';

type ConfigRecord = Record<string, unknown>;

export const sectionKeyAllMap: Record<string, string> = {
  linearGradients: 'linearGradientDefaults',
  radialGradients: 'radialGradientDefaults',
  valueAxes: 'valueAxisDefaults',
  series: 'seriesDefaults',
  seriesGroups: 'seriesGroupDefaults',
  seriesStacks: 'seriesStackDefaults'
};

function isObject(v: unknown): v is ConfigRecord {
  return v !== null && v !== undefined && typeof v === "object";
}

const configsToIdMap = <T>(configs: ConfigRecord[], value: (config: ConfigRecord) => T): Record<string, T> => {
  const map: Record<string, T> = {};
  if (Array.isArray(configs)) {
    for (const config of configs) {
      map[String(config.id)] = value(config);
    }
  }
  return map;
};

function isInteger(v: unknown): v is number {
  return v !== undefined && (typeof v === "number" || v instanceof Number) && isFinite(v as number) && (v as number) % 1 === 0;
}

function isString(v: unknown): v is string {
  return v !== undefined && (typeof v === "string" || v instanceof String);
}

function getOrder(v: unknown): number {
  return isInteger(v) ? v : 0;
}

const orderComparator = (a: unknown, b: unknown): number => (isObject(a) && isObject(b)) ? (getOrder(a.order) - getOrder(b.order)) : (isObject(a) ? -1 : (isObject(b) ? 1 : 0));

const configsToOrderedList = (configs: ConfigRecord[]): ConfigRecord[] => {
  if (Array.isArray(configs)) {
    const ordered = configs.slice();
    ordered.sort(orderComparator);
    return ordered;
  }
  return [];
};

const addToIdMap = (idMap: Record<string, ConfigRecord[]>, configs: ConfigRecord[], key: string): void => {
  if (Array.isArray(configs)) {
    for (const config of configs) {
      const reference = config[key];
      if (isObject(config) && typeof reference === 'string' && reference !== NONE && idMap[reference] !== undefined) {
        idMap[reference]!.push(config);
      }
    }
  }
};

const assignConfigReferences = (configs: ConfigRecord[], referenceKey: string, referenceName: string, configMap: Record<string, ConfigRecord>, configDescriptor: string): void => {
  if (Array.isArray(configs)) {
    for (const config of configs) {
      if (isObject(config) && config[referenceKey] !== undefined) {
        if (config[referenceName] !== undefined) {
          console.warn('mochartConfig.' + configDescriptor + '[' + config.id + '] had a ' + referenceName + ' property that will be overriden');
        }
        config[referenceName] = configMap[String(config[referenceKey])];
      }
    }
  }
};

const assignConfigListReferences = (configs: ConfigRecord[], referenceName: string, configListMap: Record<string, ConfigRecord[]>, configDescriptor: string): void => {
  if (Array.isArray(configs)) {
    for (const config of configs) {
      if (isObject(config)) {
        if (config[referenceName] !== undefined) {
          console.warn('mochartConfig.' + configDescriptor + '[' + config.id + '] had a ' + referenceName + ' property that will be overriden');
        }
        config[referenceName] = configListMap[String(config.id)];
      }
    }
  }
};

const assignConfigListIndexReferences = (configs: ConfigRecord[], referenceName: string, listReferenceName: string, configDescriptor: string): void => {
  if (Array.isArray(configs)) {
    for (const config of configs) {
      if (isObject(config)) {
        if (config[referenceName] !== undefined) {
          console.warn('mochartConfig.' + configDescriptor + '[' + config.id + '] had a ' + referenceName + ' property that will be overriden');
        }
        config[referenceName] = arrayToIdIndexMap(config[listReferenceName]);
      }
    }
  }
}

const arrayToIdIndexMap = (configs: unknown): Record<string, number> => {
  const map: Record<string, number> = {};
  if (Array.isArray(configs)) {
    const count = configs.length;
    let i, config;
    for (i = 0; i < count; i++) {
      config = configs[i];
      if (isObject(config) && isString(config.id)) {
        map[config.id] = i;
      }
    }
  }
  return map;
}

function validateValidation(validation: unknown): asserts validation is ConfigValidation {
  if (!isObject(validation)) {
    throw new Error('mochartConfig validation must be an object: ');
  }
  const { valid, errors, warnings } = validation;
  if (!(valid === true || valid === false)) {
    throw new Error('mochartConfig validation.valid must be a boolean');
  }
  if (!Array.isArray(errors)) {
    throw new Error('mochartConfig validation.errors must be an array');
  }
  if (!Array.isArray(warnings)) {
    throw new Error('mochartConfig validation.warnings must be an array');
  }
}

export function filterConfigs(configs: unknown): ConfigRecord[] {
  return Array.isArray(configs) ? configs.filter(filterConfig) : [];
}

export function filterConfig(config: unknown): config is ConfigRecord {
  return isObject(config) && config.ignore !== true
}

export function applyDefaults(configWithoutDefaults: unknown, defaults: ConfigRecord): ConfigRecord {
  if (isObject(configWithoutDefaults)) {
    const config = { ...configWithoutDefaults };
    const sectionKeys = Object.keys(defaults);
    let allSection: ConfigRecord, configSection: unknown, defaultsSection: unknown, listCount: number, i: number, aConfig: unknown, allKey: string | undefined;
    for (const sectionKey of sectionKeys) {
      allKey = sectionKeyAllMap[sectionKey];
      const possibleAllSection = allKey ? config[allKey] : undefined;
      allSection = isObject(possibleAllSection) ? possibleAllSection : {};
      configSection = config[sectionKey];
      defaultsSection = defaults[sectionKey];
      if (Array.isArray(defaultsSection)) {
        if (Array.isArray(configSection)) {
          const filteredConfigSection = filterConfigs(configSection);
          listCount = filteredConfigSection.length;
          for (i = 0; i < listCount; i++) {
            aConfig = filteredConfigSection[i];
            if (isObject(aConfig) && isObject(defaultsSection[i])) {
              filteredConfigSection[i] = deepMergeAll<ConfigRecord>(defaultsSection[i], allSection, aConfig);
            }
          }
          // every entry ignored/non-object means the section was effectively not specified
          config[sectionKey] = listCount === 0 ? defaultsSection : filteredConfigSection;
        }
        else if (isObject(configSection)) {
          config[sectionKey] = filterConfig(configSection)
            ? [deepMergeAll<ConfigRecord>(isObject(defaultsSection[0]) ? defaultsSection[0] : {}, allSection, configSection)]
            : defaultsSection;
        }
        else if (configSection === undefined) {
          config[sectionKey] = defaultsSection;
        }
      }
      else if (isObject(defaultsSection)) {
        if (isObject(configSection)) {
          config[sectionKey] = deepMerge<ConfigRecord>(defaultsSection, configSection);
        }
        else if (configSection === undefined) {
          config[sectionKey] = withoutUndefined(defaultsSection);
        }
      }
    }
    return config;
  }
  return {};
}

function applyAllConfig(configs: ConfigRecord[], allConfig: unknown): ConfigRecord[] {
  if (isObject(allConfig)) {
    if (Array.isArray(configs)) {
      configs = configs.map(config => isObject(config) ? deepMerge<ConfigRecord>(allConfig, config) : allConfig);
    }
  }
  return configs;
}

export default function buildMochartConfig(configWithoutDefaults: unknown, configDefaults: ConfigRecord, validation?: ConfigValidation): MochartConfig {
  if (validation === undefined) {
    validation = { valid: true, errors: [], warnings: [] };
  }
  else {
    validateValidation(validation);
  }

  if (!isObject(configWithoutDefaults)) {
    return {
      validation
    } as MochartConfig;
  }
  else if (configWithoutDefaults.validation !== undefined) {
    console.warn('mochartConfig had a validation property that will be overriden');
  }

  const config = applyDefaults(configWithoutDefaults, configDefaults);
  let valueAxisConfigs = config.valueAxes as ConfigRecord[];
  let seriesStackConfigs = config.seriesStacks as ConfigRecord[];
  let seriesGroupConfigs = config.seriesGroups as ConfigRecord[];
  let seriesConfigs = config.series as ConfigRecord[];
  let linearGradientConfigs = config.linearGradients as ConfigRecord[];
  let radialGradientConfigs = config.radialGradients as ConfigRecord[];
  const { valueAxisDefaults, seriesStackDefaults, seriesGroupDefaults, seriesDefaults, linearGradientDefaults, radialGradientDefaults } = configWithoutDefaults;

  valueAxisConfigs = applyAllConfig(valueAxisConfigs, valueAxisDefaults);
  seriesStackConfigs = applyAllConfig(seriesStackConfigs, seriesStackDefaults);
  seriesGroupConfigs = applyAllConfig(seriesGroupConfigs, seriesGroupDefaults);
  seriesConfigs = applyAllConfig(seriesConfigs, seriesDefaults);
  linearGradientConfigs = applyAllConfig(linearGradientConfigs, linearGradientDefaults);
  radialGradientConfigs = applyAllConfig(radialGradientConfigs, radialGradientDefaults);

  const valueAxisConfigsById = configsToIdMap(valueAxisConfigs, value => value);
  const valueAxisConfigsOrdered = configsToOrderedList(valueAxisConfigs);
  const valueAxisSeriesConfigsById = configsToIdMap(valueAxisConfigs, () => []);

  const seriesStackConfigsById = configsToIdMap(seriesStackConfigs, value => value);
  const seriesStackSeriesConfigsById = configsToIdMap(seriesStackConfigs, () => []);

  const seriesGroupConfigsById = configsToIdMap(seriesGroupConfigs, value => value);
  const seriesGroupSeriesConfigsById = configsToIdMap(seriesGroupConfigs, () => []);

  const linearGradientConfigsById = configsToIdMap(linearGradientConfigs, value => value);
  const radialGradientConfigsById = configsToIdMap(radialGradientConfigs, value => value);

  const seriesConfigsById = configsToIdMap(seriesConfigs, value => value);
  const seriesConfigsOrdered = configsToOrderedList(seriesConfigs);

  addToIdMap(valueAxisSeriesConfigsById, seriesConfigsOrdered, 'axis');
  addToIdMap(seriesStackSeriesConfigsById, seriesConfigsOrdered, 'stack');
  addToIdMap(seriesGroupSeriesConfigsById, seriesConfigsOrdered, 'group');

  assignConfigReferences(seriesStackConfigs, 'axis', 'valueAxisConfig', valueAxisConfigsById, 'seriesStacks');
  assignConfigReferences(seriesConfigs, 'axis', 'valueAxisConfig', valueAxisConfigsById, 'series');
  assignConfigReferences(seriesConfigs, 'stack', 'seriesStackConfig', seriesStackConfigsById, 'series');
  assignConfigReferences(seriesConfigs, 'group', 'seriesGroupConfig', seriesGroupConfigsById, 'series');
  assignConfigReferences(seriesConfigs, 'gradient', 'linearGradientConfig', linearGradientConfigsById, 'series');
  assignConfigReferences(seriesConfigs, 'gradient', 'radialGradientConfig', radialGradientConfigsById, 'series');

  assignConfigListReferences(valueAxisConfigs, 'seriesConfigs', valueAxisSeriesConfigsById, 'valueAxisConfigs');
  assignConfigListReferences(seriesStackConfigs, 'seriesConfigs', seriesStackSeriesConfigsById, 'seriesStacks');
  assignConfigListReferences(seriesGroupConfigs, 'seriesConfigs', seriesGroupSeriesConfigsById, 'seriesGroups');

  const valueAxisConfigIndicesById = arrayToIdIndexMap(valueAxisConfigsOrdered);
  const seriesConfigIndicesById = arrayToIdIndexMap(seriesConfigsOrdered);

  assignConfigListIndexReferences(valueAxisConfigs, 'seriesConfigIndicesById', 'seriesConfigs', 'valueAxisConfigs');
  assignConfigListIndexReferences(seriesStackConfigs, 'seriesConfigIndicesById', 'seriesConfigs', 'seriesStacks');
  assignConfigListIndexReferences(seriesGroupConfigs, 'seriesConfigIndicesById', 'seriesConfigs', 'seriesGroups');

  return {
    ...config,
    valueAxes: valueAxisConfigsOrdered,
    valueAxesById: valueAxisConfigsById,
    valueAxisIndicesById: valueAxisConfigIndicesById,
    seriesGroups: seriesGroupConfigs,
    seriesGroupsById: seriesGroupConfigsById,
    seriesStacks: seriesStackConfigs,
    seriesStacksById: seriesStackConfigsById,
    series: seriesConfigsOrdered,
    seriesById: seriesConfigsById,
    seriesIndicesById: seriesConfigIndicesById,
    validation,
  } as unknown as MochartConfig;
}

export function hasConfigStructureChange(configOld: MochartConfig, configNew: MochartConfig): boolean {
  if (configOld.validation.valid !== configNew.validation.valid || !configNew.validation.valid) {
    return true;
  }
  if (configOld.id !== configNew.id) {
    return true;
  }
  if (configOld.chart.type !== configNew.chart.type) {
    return true;
  }
  const { categoryAxis: categoryAxisConfig } = configOld;
  const { categoryAxis: newCategoryAxisConfig } = configNew;
  if (categoryAxisConfig.property !== newCategoryAxisConfig.property ||
      categoryAxisConfig.type !== newCategoryAxisConfig.type ||
      categoryAxisConfig.scale !== newCategoryAxisConfig.scale ||
      categoryAxisConfig.dateUTC !== newCategoryAxisConfig.dateUTC) {
    return true;
  }

  const { valueAxes: valueAxisConfigs } = configOld;
  const { valueAxes: newValueAxisConfigs } = configNew;
  if (valueAxisConfigs.length !== newValueAxisConfigs.length) {
    return true;
  }
  for (let valueAxisIndex = 0; valueAxisIndex < valueAxisConfigs.length; valueAxisIndex++) {
    const valueAxisConfig = valueAxisConfigs[valueAxisIndex];
    const newValueAxisConfig = newValueAxisConfigs[valueAxisIndex];
    if (valueAxisConfig.id !== newValueAxisConfig.id) {
      return true;
    }
  }

  const { seriesStacks: seriesStackConfigs } = configOld;
  const { seriesStacks: newSeriesStackConfigs } = configNew;
  if (seriesStackConfigs.length !== newSeriesStackConfigs.length) {
    return true;
  }
  for (let seriesStackIndex = 0; seriesStackIndex < seriesStackConfigs.length; seriesStackIndex++) {
    const seriesStackConfig = seriesStackConfigs[seriesStackIndex];
    const newSeriesStackConfig = newSeriesStackConfigs[seriesStackIndex];
    if (seriesStackConfig.id !== newSeriesStackConfig.id ||
        seriesStackConfig.axis !== newSeriesStackConfig.axis) {
      return true;
    }
  }

  const { series: seriesConfigs } = configOld;
  const { series: newSeriesConfigs } = configNew;
  if (seriesConfigs.length !== newSeriesConfigs.length) {
    return true;
  }

  for (let seriesIndex = 0; seriesIndex < seriesConfigs.length; seriesIndex++) {
    const seriesConfig = seriesConfigs[seriesIndex];
    const newSeriesConfig = newSeriesConfigs[seriesIndex];
    if (seriesConfig.property !== newSeriesConfig.property ||
        seriesConfig.rangeProperty !== newSeriesConfig.rangeProperty ||
        seriesConfig.errorLowProperty !== newSeriesConfig.errorLowProperty ||
        seriesConfig.errorHighProperty !== newSeriesConfig.errorHighProperty ||
        seriesConfig.markerProperty !== newSeriesConfig.markerProperty ||
        seriesConfig.colorProperty !== newSeriesConfig.colorProperty ||
        seriesConfig.labelProperty !== newSeriesConfig.labelProperty ||
        seriesConfig.axis !== newSeriesConfig.axis ||
        seriesConfig.stack !== newSeriesConfig.stack ||
        seriesConfig.group !== newSeriesConfig.group) {
      return true;
    }
  }
  return false;
}

export function configWithAll(config: unknown, allConfig: unknown): unknown {
  if (isObject(allConfig)) {
    if (Array.isArray(config)) {
      return config.map(aConfig => configWithAll(aConfig, allConfig));
    }
    else if (isObject(config)) {
      return deepMerge<ConfigRecord>(allConfig, config);
    }
    else {
      return { ...allConfig };
    }
  }
  else {
    return config;
  }
}
