import { migrateConfig, buildMochartConfig, getDefaults, applyDefaults, sectionKeyAllMap, validateConfig } from 'mochart';

export default function buildMochartDemoConfig(config) {
  config = migrateConfig(config);
  const configDefaults = getDefaults(config);
  const configWithDefaults = applyDefaults(config, configDefaults);
  const configWithoutDefaults = withoutDefaults(configWithDefaults, configDefaults)
  const configValidation = validateConfig(config, configDefaults);
  const mochartConfig = buildMochartConfig(config, configDefaults, configValidation);

  // helper shortcuts
  const { valid } = configValidation;
  const { groupAxisConfig, seriesConfigs } = mochartConfig;
  const groupProperty = groupAxisConfig ? groupAxisConfig.property : void 0;
  const seriesCount = Array.isArray(seriesConfigs) ? seriesConfigs.length : 0;

  return {
    config,
    configDefaults,
    configWithDefaults,
    configWithoutDefaults,
    configValidation,
    mochartConfig,
    valid,
    groupProperty,
    seriesCount
  };
}

function isObject(v) {
  return v !== null && v !== void 0 && typeof v === "object";
}

function areEqual(a, b) {
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
      for (let key of keys) {
        if (!areEqual(a[key], b[key])) {
          return false;
        }
      }
      return true;
    }
  }
  return false;
}

function removeSectionDefaults(configDefaultSection, allSection, configSection) {
  if (isObject(configSection)) {
    const sectionKeys = Object.keys(configSection);
    const newSection = {};
    for (let sectionKey of sectionKeys) {
      if (!areEqual(configDefaultSection[sectionKey], configSection[sectionKey]) &&
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

function withoutDefaults(configWithDefaults, configDefaults) {
  const configWithoutDefaults = {};
  if (isObject(configWithDefaults) && isObject(configDefaults)) {
    const sectionKeys = Object.keys(configWithDefaults);
    for (let sectionKey of sectionKeys) {
      const configSection = configWithDefaults[sectionKey];
      const allKey = sectionKeyAllMap[sectionKey];
      const allSection = allKey && configWithDefaults[allKey] !== void 0 ? configWithDefaults[allKey] : {};
      if (configSection !== void 0) {
        const configDefaultSection = configDefaults[sectionKey];
        if (configDefaultSection !== void 0) {
          if (Array.isArray(configSection)) {
            const newSections = [];
            const count = configDefaultSection.length;
            let i, newSection;
            for (i = 0; i < count; i++) {
              newSection = removeSectionDefaults(configDefaultSection[i], allSection, configSection[i]);
              newSections.push(newSection);
            }
            configWithoutDefaults[sectionKey] = newSections;
          }
          else if (isObject(configSection)) {
            const newSection = removeSectionDefaults(configDefaultSection, allSection, configSection);
            if (Object.keys(newSection).length > 0) {
              configWithoutDefaults[sectionKey] = newSection;
            }
          }
          else {
            configWithoutDefaults[sectionKey] = configWithDefaults[sectionKey];
          }
        }
        else {
          configWithoutDefaults[sectionKey] = configWithDefaults[sectionKey];
        }
      }
    }
  }
  return configWithoutDefaults;
}