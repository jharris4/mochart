import { NONE } from './constants';

export const sectionKeyAllMap = {
  linearGradientConfigs: 'linearGradientAllConfig',
  radialGradientConfigs: 'radialGradientAllConfig',
  seriesAxisConfigs: 'seriesAxisAllConfig',
  seriesConfigs: 'seriesAllConfig',
  seriesGroupConfigs: 'seriesGroupAllConfig',
  seriesStackConfigs: 'seriesStackAllConfig'
};

function isObject(v) {
  return v !== null && v !== void 0 && typeof v === "object";
}

const shallowConfigListCopy = configs => {
  return Array.isArray(configs) ? configs.map(config => isObject(config) ? ({...config}) : config) : configs;
}

const configsToIdMap = (configs, value = config => config) => {
  const map = {};
  if (Array.isArray(configs)) {
    for (let config of configs) {
      map[config.id] = value(config);
    }
  }
  return map;
};

function isInteger(v) {
  return v !== void 0 && (typeof v === "number" || v instanceof Number) && isFinite(v as number) && (v as number) % 1 === 0;
}

function isString(v) {
  return v !== void 0 && (typeof v === "string" || v instanceof String);
}

function getOrder(v) {
  return isInteger(v) ? v : 0;
}

const orderComparator = (a, b) => (isObject(a) && isObject(b)) ? (getOrder(a.order) - getOrder(b.order)) : (isObject(a) ? -1 : (isObject(b) ? 1 : 0));

const configsToOrderedList = configs => {
  if (Array.isArray(configs)) {
    let ordered = configs.slice();
    ordered.sort(orderComparator);
    return ordered;
  }
  else {
    return configs;
  }
};

const addToIdMap = (idMap, configs, key) => {
  if (Array.isArray(configs)) {
    for (let config of configs) {
      if (isObject(config) && config[key] !== void 0 && config[key] !== NONE && idMap[config[key]] !== void 0) {
        idMap[config[key]].push(config);
      }
    }
  }
};

const copyConfigKeys = ['seriesAxisConfigs', 'seriesStackConfigs', 'seriesGroupConfigs', 'seriesConfigs'];

function shallowConfigCopy(config) {
  const copies = {};
  for (let configKey of copyConfigKeys) {
    copies[configKey] = shallowConfigListCopy(config[configKey])
  }
  return copies;
};

const assignConfigReferences = (configs, referenceKey, referenceName, configMap, configDescriptor) => {
  if (Array.isArray(configs)) {
    for (let config of configs) {
      if (isObject(config) && config[referenceKey] !== void 0) {
        if (config[referenceName] !== void 0) {
          console.warn('mochartConfig.' + configDescriptor + '[' + config.id + '] had a ' + referenceName + ' property that will be overriden');
        }
        config[referenceName] = configMap[config[referenceKey]];
      }
    }
  }
};

const assignConfigListReferences = (configs, referenceName, configListMap, configDescriptor) => {
  if (Array.isArray(configs)) {
    for (let config of configs) {
      if (isObject(config)) {
        if (config[referenceName] !== void 0) {
          console.warn('mochartConfig.' + configDescriptor + '[' + config.id + '] had a ' + referenceName + ' property that will be overriden');
        }
        config[referenceName] = configListMap[config.id];
      }
    }
  }
};

const assignConfigListIndexReferences = (configs, referenceName, listReferenceName, configDescriptor) => {
  if (Array.isArray(configs)) {
    for (let config of configs) {
      if (isObject(config)) {
        if (config[referenceName] !== void 0) {
          console.warn('mochartConfig.' + configDescriptor + '[' + config.id + '] had a ' + referenceName + ' property that will be overriden');
        }
        config[referenceName] = arrayToIdIndexMap(config[listReferenceName]);
      }
    }
  }
}

const arrayToIdIndexMap = configs => {
  const map = {};
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

function validateValidation(validation) {
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

export function filterConfigs(configs) {
  return Array.isArray(configs) ? configs.filter(filterConfig) : [];
}

export function filterConfig(config) {
  return isObject(config) && config.ignore !== true
}

function withoutUndefined(object) {
  const keys = Object.keys(object);
  const keysFiltered = keys.filter(key => object[key] !== void 0);
  if (keysFiltered.length < keys.length) {
    const clone = {};
    for (let key of keysFiltered) {
      clone[key] = object[key];
    }
    return clone;
  }
  return object;
}

export function applyDefaults(configWithoutDefaults, defaults) {
  if (isObject(configWithoutDefaults)) {
    const config = { ...configWithoutDefaults };
    const sectionKeys = Object.keys(defaults);
    let allSection, configSection, defaultsSection, listCount, i, aConfig, allKey;
    for (let sectionKey of sectionKeys) {
      allKey = sectionKeyAllMap[sectionKey];
      allSection = allKey && isObject(config[allKey]) ? config[allKey] : {};
      configSection = config[sectionKey];
      defaultsSection = defaults[sectionKey];
      if (Array.isArray(defaultsSection)) {
        if (Array.isArray(configSection)) {
          configSection = filterConfigs(configSection);
          listCount = configSection.length;
          for (i = 0; i < listCount; i++) {
            aConfig = configSection[i];
            if (isObject(aConfig)) {
              configSection[i] = { ...withoutUndefined(defaultsSection[i]), ...allSection, ...aConfig };
            }
          }
          config[sectionKey] = configSection;
        }
        else if (isObject(configSection)) {
          config[sectionKey] = [{ ...withoutUndefined(defaultsSection[0]), ...configSection }];
        }
        else if (configSection === void 0) {
          config[sectionKey] = defaultsSection;
        }
      }
      else if (isObject(defaultsSection)) {
        if (isObject(configSection)) {
          config[sectionKey] = { ...withoutUndefined(defaultsSection), ...configSection };
        }
        else if (configSection === void 0) {
          config[sectionKey] = withoutUndefined(defaultsSection);
        }
      }
    }
    return config;
  }
}

function applyAllConfig(configs, allConfig) {
  if (isObject(allConfig)) {
    if (Array.isArray(configs)) {
      configs = configs.map(config => isObject(config) ? {...allConfig, ...config} : allConfig);
    }
    else if (isObject(configs)) {
      configs = {...allConfig, ...configs};
    }
  }
  return configs;
}

export default function buildMochartConfig(configWithoutDefaults, configDefaults, validation) {
  if (validation === void 0) {
    validation = { valid: true, errors: [], warnings: [] };
  }
  else {
    validateValidation(validation);
  }

  if (!isObject(configWithoutDefaults)) {
    return {
      validation
    };
  }
  else if (configWithoutDefaults.validation !== void 0) {
    console.warn('mochartConfig had a validation property that will be overriden');
  }

  const config = applyDefaults(configWithoutDefaults, configDefaults);
  const shallowCopyConfig = shallowConfigCopy(config);
  let { seriesAxisConfigs, seriesStackConfigs, seriesGroupConfigs, seriesConfigs, linearGradientConfigs, radialGradientConfigs } = config;
  const { seriesAxisAllConfig, seriesStackAllConfig, seriesGroupAllConfig, seriesAllConfig, linearGradientAllConfig, radialGradientAllConfig } = configWithoutDefaults;

  seriesAxisConfigs = applyAllConfig(seriesAxisConfigs, seriesAxisAllConfig);
  seriesStackConfigs = applyAllConfig(seriesStackConfigs, seriesStackAllConfig);
  seriesGroupConfigs = applyAllConfig(seriesGroupConfigs, seriesGroupAllConfig);
  seriesConfigs = applyAllConfig(seriesConfigs, seriesAllConfig);
  linearGradientConfigs = applyAllConfig(linearGradientConfigs, linearGradientAllConfig);
  radialGradientConfigs = applyAllConfig(radialGradientConfigs, radialGradientAllConfig);

  const seriesAxisConfigsById = configsToIdMap(seriesAxisConfigs);
  const seriesAxisConfigsOrdered = configsToOrderedList(seriesAxisConfigs);
  const seriesAxisSeriesConfigsById = configsToIdMap(seriesAxisConfigs, value => []);

  const seriesStackConfigsById = configsToIdMap(seriesStackConfigs);
  const seriesStackSeriesConfigsById = configsToIdMap(seriesStackConfigs, value => []);

  const seriesGroupConfigsById = configsToIdMap(seriesGroupConfigs);
  const seriesGroupSeriesConfigsById = configsToIdMap(seriesGroupConfigs, value => []);

  const linearGradientConfigsById = configsToIdMap(linearGradientConfigs);
  const radialGradientConfigsById = configsToIdMap(radialGradientConfigs);

  const seriesConfigsById = configsToIdMap(seriesConfigs);
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
  };
}

export function hasConfigStructureChange(configOld, configNew) {
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

export function configWithAll(config, allConfig) {
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