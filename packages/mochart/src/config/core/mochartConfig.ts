import { NONE } from './constants';
import type { ConfigValidation, MochartConfig } from '../../types/config';

type ConfigRecord = Record<string, unknown>;

export const sectionKeyAllMap: Record<string, string> = {
  linearGradientConfigs: 'linearGradientAllConfig',
  radialGradientConfigs: 'radialGradientAllConfig',
  seriesAxisConfigs: 'seriesAxisAllConfig',
  seriesConfigs: 'seriesAllConfig',
  seriesGroupConfigs: 'seriesGroupAllConfig',
  seriesStackConfigs: 'seriesStackAllConfig'
};

function isObject(v: unknown): v is ConfigRecord {
  return v !== null && v !== undefined && typeof v === "object";
}

const configsToIdMap = <T>(configs: ConfigRecord[], value: (config: ConfigRecord) => T): Record<string, T> => {
  const map: Record<string, T> = {};
  if (Array.isArray(configs)) {
    for (let config of configs) {
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
    let ordered = configs.slice();
    ordered.sort(orderComparator);
    return ordered;
  }
  return [];
};

const addToIdMap = (idMap: Record<string, ConfigRecord[]>, configs: ConfigRecord[], key: string): void => {
  if (Array.isArray(configs)) {
    for (let config of configs) {
      const reference = config[key];
      if (isObject(config) && typeof reference === 'string' && reference !== NONE && idMap[reference] !== undefined) {
        idMap[reference]!.push(config);
      }
    }
  }
};

const assignConfigReferences = (configs: ConfigRecord[], referenceKey: string, referenceName: string, configMap: Record<string, ConfigRecord>, configDescriptor: string): void => {
  if (Array.isArray(configs)) {
    for (let config of configs) {
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
    for (let config of configs) {
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
    for (let config of configs) {
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

function withoutUndefined(object: ConfigRecord): ConfigRecord {
  const keys = Object.keys(object);
  const keysFiltered = keys.filter(key => object[key] !== undefined);
  if (keysFiltered.length < keys.length) {
    const clone: ConfigRecord = {};
    for (let key of keysFiltered) {
      clone[key] = object[key];
    }
    return clone;
  }
  return object;
}

export function applyDefaults(configWithoutDefaults: unknown, defaults: ConfigRecord): ConfigRecord {
  if (isObject(configWithoutDefaults)) {
    const config = { ...configWithoutDefaults };
    const sectionKeys = Object.keys(defaults);
    let allSection: ConfigRecord, configSection: unknown, defaultsSection: unknown, listCount: number, i: number, aConfig: unknown, allKey: string | undefined;
    for (let sectionKey of sectionKeys) {
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
              filteredConfigSection[i] = { ...withoutUndefined(defaultsSection[i]), ...allSection, ...aConfig };
            }
          }
          config[sectionKey] = filteredConfigSection;
        }
        else if (isObject(configSection)) {
          config[sectionKey] = [{ ...(isObject(defaultsSection[0]) ? withoutUndefined(defaultsSection[0]) : {}), ...configSection }];
        }
        else if (configSection === undefined) {
          config[sectionKey] = defaultsSection;
        }
      }
      else if (isObject(defaultsSection)) {
        if (isObject(configSection)) {
          config[sectionKey] = { ...withoutUndefined(defaultsSection), ...configSection };
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
      configs = configs.map(config => isObject(config) ? {...allConfig, ...config} : allConfig);
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
  let seriesAxisConfigs = config.seriesAxisConfigs as ConfigRecord[];
  let seriesStackConfigs = config.seriesStackConfigs as ConfigRecord[];
  let seriesGroupConfigs = config.seriesGroupConfigs as ConfigRecord[];
  let seriesConfigs = config.seriesConfigs as ConfigRecord[];
  let linearGradientConfigs = config.linearGradientConfigs as ConfigRecord[];
  let radialGradientConfigs = config.radialGradientConfigs as ConfigRecord[];
  const { seriesAxisAllConfig, seriesStackAllConfig, seriesGroupAllConfig, seriesAllConfig, linearGradientAllConfig, radialGradientAllConfig } = configWithoutDefaults;

  seriesAxisConfigs = applyAllConfig(seriesAxisConfigs, seriesAxisAllConfig);
  seriesStackConfigs = applyAllConfig(seriesStackConfigs, seriesStackAllConfig);
  seriesGroupConfigs = applyAllConfig(seriesGroupConfigs, seriesGroupAllConfig);
  seriesConfigs = applyAllConfig(seriesConfigs, seriesAllConfig);
  linearGradientConfigs = applyAllConfig(linearGradientConfigs, linearGradientAllConfig);
  radialGradientConfigs = applyAllConfig(radialGradientConfigs, radialGradientAllConfig);

  const seriesAxisConfigsById = configsToIdMap(seriesAxisConfigs, value => value);
  const seriesAxisConfigsOrdered = configsToOrderedList(seriesAxisConfigs);
  const seriesAxisSeriesConfigsById = configsToIdMap(seriesAxisConfigs, () => []);

  const seriesStackConfigsById = configsToIdMap(seriesStackConfigs, value => value);
  const seriesStackSeriesConfigsById = configsToIdMap(seriesStackConfigs, () => []);

  const seriesGroupConfigsById = configsToIdMap(seriesGroupConfigs, value => value);
  const seriesGroupSeriesConfigsById = configsToIdMap(seriesGroupConfigs, () => []);

  const linearGradientConfigsById = configsToIdMap(linearGradientConfigs, value => value);
  const radialGradientConfigsById = configsToIdMap(radialGradientConfigs, value => value);

  const seriesConfigsById = configsToIdMap(seriesConfigs, value => value);
  const seriesConfigsOrdered = configsToOrderedList(seriesConfigs);

  addToIdMap(seriesAxisSeriesConfigsById, seriesConfigsOrdered, 'axis');
  addToIdMap(seriesStackSeriesConfigsById, seriesConfigsOrdered, 'stack');
  addToIdMap(seriesGroupSeriesConfigsById, seriesConfigsOrdered, 'group');

  assignConfigReferences(seriesStackConfigs, 'axis', 'seriesAxisConfig', seriesAxisConfigsById, 'seriesStackConfigs');
  assignConfigReferences(seriesConfigs, 'axis', 'seriesAxisConfig', seriesAxisConfigsById, 'seriesConfigs');
  assignConfigReferences(seriesConfigs, 'stack', 'seriesStackConfig', seriesStackConfigsById, 'seriesConfigs');
  assignConfigReferences(seriesConfigs, 'group', 'seriesGroupConfig', seriesGroupConfigsById, 'seriesConfigs');
  assignConfigReferences(seriesConfigs, 'gradient', 'linearGradientConfig', linearGradientConfigsById, 'seriesConfigs');
  assignConfigReferences(seriesConfigs, 'gradient', 'radialGradientConfig', radialGradientConfigsById, 'seriesConfigs');

  assignConfigListReferences(seriesAxisConfigs, 'seriesConfigs', seriesAxisSeriesConfigsById, 'seriesAxisConfigs');
  assignConfigListReferences(seriesStackConfigs, 'seriesConfigs', seriesStackSeriesConfigsById, 'seriesStackConfigs');
  assignConfigListReferences(seriesGroupConfigs, 'seriesConfigs', seriesGroupSeriesConfigsById, 'seriesGroupConfigs');

  const seriesAxisConfigIndicesById = arrayToIdIndexMap(seriesAxisConfigsOrdered);
  const seriesConfigIndicesById = arrayToIdIndexMap(seriesConfigsOrdered);

  assignConfigListIndexReferences(seriesAxisConfigs, 'seriesConfigIndicesById', 'seriesConfigs', 'seriesAxisConfigs');
  assignConfigListIndexReferences(seriesStackConfigs, 'seriesConfigIndicesById', 'seriesConfigs', 'seriesStackConfigs');
  assignConfigListIndexReferences(seriesGroupConfigs, 'seriesConfigIndicesById', 'seriesConfigs', 'seriesGroupConfigs');

  return {
    ...config,
    seriesAxisConfigs: seriesAxisConfigsOrdered,
    seriesAxisConfigsById,
    seriesAxisConfigIndicesById,
    seriesGroupConfigs,
    seriesGroupConfigsById,
    seriesStackConfigs,
    seriesStackConfigsById,
    seriesConfigs: seriesConfigsOrdered,
    seriesConfigsById,
    seriesConfigIndicesById,
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
  const { groupAxisConfig } = configOld;
  const { groupAxisConfig: newGroupAxisConfig } = configNew;
  if (groupAxisConfig.property !== newGroupAxisConfig.property ||
      groupAxisConfig.type !== newGroupAxisConfig.type ||
      groupAxisConfig.scale !== newGroupAxisConfig.scale ||
      groupAxisConfig.dateUTC !== newGroupAxisConfig.dateUTC) {
    return true;
  }

  const { seriesAxisConfigs } = configOld;
  const { seriesAxisConfigs: newSeriesAxisConfigs } = configNew;
  if (seriesAxisConfigs.length !== newSeriesAxisConfigs.length) {
    return true;
  }
  for (let seriesAxisIndex = 0; seriesAxisIndex < seriesAxisConfigs.length; seriesAxisIndex++) {
    let seriesAxisConfig = seriesAxisConfigs[seriesAxisIndex];
    let newSeriesAxisConfig = newSeriesAxisConfigs[seriesAxisIndex];
    if (seriesAxisConfig.id !== newSeriesAxisConfig.id) {
      return true;
    }
  }

  const { seriesStackConfigs } = configOld;
  const { seriesStackConfigs: newSeriesStackConfigs } = configNew;
  if (seriesStackConfigs.length !== newSeriesStackConfigs.length) {
    return true;
  }
  for (let seriesStackIndex = 0; seriesStackIndex < seriesStackConfigs.length; seriesStackIndex++) {
    let seriesStackConfig = seriesStackConfigs[seriesStackIndex];
    let newSeriesStackConfig = newSeriesStackConfigs[seriesStackIndex];
    if (seriesStackConfig.id !== newSeriesStackConfig.id ||
        seriesStackConfig.axis !== newSeriesStackConfig.axis) {
      return true;
    }
  }

  const { seriesConfigs } = configOld;
  const { seriesConfigs: newSeriesConfigs } = configNew;
  if (seriesConfigs.length !== newSeriesConfigs.length) {
    return true;
  }

  for (let seriesIndex = 0; seriesIndex < seriesConfigs.length; seriesIndex++) {
    let seriesConfig = seriesConfigs[seriesIndex];
    let newSeriesConfig = newSeriesConfigs[seriesIndex];
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
      return { ...allConfig, ...config };
    }
    else {
      return { ...allConfig };
    }
  }
  else {
    return config;
  }
}
