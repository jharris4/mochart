import validators from './validators';
import { getMessage, getPropertyMessage, getMessages, addErrorMessages, addErrorMessage, addWarningMessages, DEFAULT } from './messages';
import { NONE, CONFIG_VERSION } from '../core/constants';
import { applyDefaults, configWithAll, sectionKeyAllMap } from '../core/mochartConfig';

import animationValidators from './animationConfig';
import chartValidators from './chartConfig';
import colorPaletteValidators from './colorPaletteConfig';
import crosshairValidators from './crosshairConfig';
import groupAxisValidators from './groupAxisConfig';
import legendValidators from './legendConfig';
import linearGradientValidators from './linearGradientConfig';
import plotValidators from './plotConfig';
import radialGradientValidators from './radialGradientConfig';
import seriesAxisValidators from './seriesAxisConfig';
import seriesValidators from './seriesConfig';
import seriesGroupValidators from './seriesGroupConfig';
import seriesStackValidators from './seriesStackConfig';
import titleValidators from './titleConfig';
import tooltipValidators from './tooltipConfig';

const objectValidator = validators.object();
const arrayValidator = validators.array();
const arrayOfObjectsOrEmpty = validators.arrayOf(objectValidator, true);
const arrayOfObjectsNonEmpty = validators.arrayOf(objectValidator, false);

export const allValidator = validators.object();

export function getUniqueMessage() {
  return 'should be unique';
}

function formatSectionKey(sectionKey) {
  if (arrayValidator(sectionKey)) {
    return sectionKey.join(' or ');
  }
  else {
    return sectionKey;
  }
}

export function getReferenceMessage(sourceSectionKey, sourceProperty) {
  return 'should equal the ' + sourceProperty + ' property of one of the ' + formatSectionKey(sourceSectionKey);
}

export function getCommonReferenceMessage(sourceSectionKey, sourceProperty, commonProperty) {
  return 'should equal the ' + sourceProperty + ' property of one of the ' + formatSectionKey(sourceSectionKey) + ' that has the same ' + commonProperty + ' property';
}

export const configWithoutAllValidators = {
  version: {
    validator: validators.equal(CONFIG_VERSION)
  },
  id: {
    validator: validators.any()
  },
  animationConfig: {
    validator: objectValidator,
    validators: () => animationValidators()
  },
  chartConfig: {
    validator: objectValidator,
    validators: () => chartValidators()
  },
  colorPaletteConfig: {
    validator: objectValidator,
    validators: () => colorPaletteValidators()
  },
  crosshairConfig: {
    validator: objectValidator,
    validators: () => crosshairValidators()
  },
  groupAxisConfig: {
    validator: objectValidator,
    validators: (configSection) => groupAxisValidators(configSection)
  },
  legendConfig: {
    validator: objectValidator,
    validators: () => legendValidators()
  },
  linearGradientConfigs: {
    list: true,
    validator: arrayOfObjectsOrEmpty,
    validators: () => linearGradientValidators(),
    uniqueKeys: ['id']
  },
  plotConfig: {
    validator: objectValidator,
    validators: () => plotValidators()
  },
  radialGradientConfigs: {
    list: true,
    validator: arrayOfObjectsOrEmpty,
    validators: () => radialGradientValidators(),
    uniqueKeys: ['id']
  },
  seriesAxisConfigs: {
    list: true,
    validator: arrayOfObjectsNonEmpty,
    validators: () => seriesAxisValidators(),
    uniqueKeys: ['id', 'order']
  },
  seriesConfigs: {
    list: true,
    validator: arrayOfObjectsOrEmpty,
    validators: (configSection) => seriesValidators(configSection),
    uniqueKeys: ['id', 'order'],
    references: {
      axis: { section: 'seriesAxisConfigs', key: 'id' },
      group: { section: 'seriesGroupConfigs', key: 'id' },
      stack: { section: 'seriesStackConfigs', key: 'id' },
      gradient: { section: ['linearGradientConfigs', 'radialGradientConfigs'], key: 'id' }
    },
    commonReferences: {
      stack: { section: 'seriesStackConfigs', key: 'id', commonKey: 'axis' }
    }
  },
  seriesGroupConfigs: {
    list: true,
    validator: arrayOfObjectsOrEmpty,
    validators: () => seriesGroupValidators(),
    uniqueKeys: ['id']
  },
  seriesStackConfigs: {
    list: true,
    validator: arrayOfObjectsOrEmpty,
    validators: () => seriesStackValidators(),
    uniqueKeys: ['id'],
    references: {
      axis: { section: 'seriesAxisConfigs', key: 'id' }
    }
  },
  titleConfig: {
    validator: objectValidator,
    validators: () => titleValidators()
  },
  tooltipConfig: {
    validator: objectValidator,
    validators: () => tooltipValidators()
  }
};

export const configSectionValidators = {
  ...configWithoutAllValidators
};

const allKeys = Object.keys(sectionKeyAllMap);
let validator;
for (let allKey of allKeys) {
  validator = configSectionValidators[allKey];
  validator.allKey = sectionKeyAllMap[allKey];
  configSectionValidators[validator.allKey] = validator;
}

export default function validateConfig(configWithoutDefaults, configDefaults, strict = true) {
  let errors = [];
  let warnings = [];
  if (objectValidator(configWithoutDefaults)) {
    const config = applyDefaults(configWithoutDefaults, configDefaults);
    addWarningMessages('config', config, configSectionValidators, warnings);
    const sectionKeys = Object.keys(configWithoutAllValidators);
    for (let sectionKey of sectionKeys) {
      const { validator, allKey } = configWithoutAllValidators[sectionKey];
      if (allKey && config[allKey] !== void 0) { // all is optional, only validate if set
        if (!objectValidator(configWithoutDefaults[allKey])) {
          errors.push(getMessage(allKey, objectValidator.getErrorMessage(config[allKey])));
        }
      }
      const { list, validators, uniqueKeys, references, commonReferences } = configWithoutAllValidators[sectionKey];
      const priorErrorCount = errors.length;
      if (list === true) {
        if (configWithoutDefaults[sectionKey] !== void 0) {
          if (!validator(configWithoutDefaults[sectionKey]) && !objectValidator(configWithoutDefaults[sectionKey])) {
            errors.push(getMessage(sectionKey, validator.getErrorMessage(configWithoutDefaults[sectionKey])));
          }
        }
        if ((configDefaults[sectionKey] !== void 0 || configWithoutDefaults[sectionKey] === void 0) && !validator(configDefaults[sectionKey])) {
          const prefix = configDefaults[sectionKey] === void 0 ? '' : DEFAULT;
          errors.push(getMessage(prefix + sectionKey, validator.getErrorMessage(configDefaults[sectionKey])));
        }
      }
      else {
        if (configWithoutDefaults[sectionKey] !== void 0) {
          if (!validator(configWithoutDefaults[sectionKey])) {
            errors.push(getMessage(sectionKey, validator.getErrorMessage(configWithoutDefaults[sectionKey])));
          }
        }
        if ((configDefaults[sectionKey] !== void 0 || configWithoutDefaults[sectionKey] === void 0) && !validator(configDefaults[sectionKey])) {
          const prefix = configDefaults[sectionKey] === void 0 ? '' : DEFAULT;
          errors.push(getMessage(prefix + sectionKey, validator.getErrorMessage(configDefaults[sectionKey])));
        }
      }
      if (priorErrorCount === errors.length && validators) {
        if (list === true) {
          validateConfigSections(config, configWithoutDefaults, configDefaults, sectionKey, allKey, validators, uniqueKeys, errors, warnings);
        }
        else {
          validateConfigSection(config, configWithoutDefaults, configDefaults, sectionKey, allKey, validators, uniqueKeys, errors, warnings);
        }
        if (arrayValidator(uniqueKeys)) {
          for (let uniqueKey of uniqueKeys) {
            validateUnique(config, configWithoutDefaults, configDefaults, sectionKey, allKey, uniqueKey, errors);
          }
        }
        if (objectValidator(references)) {
          const referenceKeys = Object.keys(references);
          for (let referenceKey of referenceKeys) {
            if (objectValidator(references[referenceKey])) {
              const { section, key } = references[referenceKey];
              validateReferences(config, configWithoutDefaults, configDefaults, sectionKey, allKey, referenceKey, section, key, errors);
            }
          }
        }
        if (objectValidator(commonReferences)) {
          const referenceKeys = Object.keys(commonReferences);
          for (let referenceKey of referenceKeys) {
            if (objectValidator(commonReferences[referenceKey])) {
              const { section, key, commonKey } = commonReferences[referenceKey];
              validateCommonReferences(config, configWithoutDefaults, configDefaults, sectionKey, allKey, referenceKey, section, key, commonKey, errors);
            }
          }
        }
      }
    }
  }
  else {
    addErrorMessage('config', configWithoutDefaults, objectValidator, errors);
  }
  let valid = errors.length === 0 && (strict === false || warnings.length === 0);

  return {
    valid,
    errors,
    warnings
  };
}

function validateConfigSection(config, configWithoutDefaults, configDefaults, sectionKey, allKey, sectionValidators, uniqueKeys, errors, warnings) {
  validateSection(sectionKey, allKey, config[sectionKey], configWithoutDefaults[sectionKey], configDefaults[sectionKey], allKey ? config[allKey] : null, sectionValidators, uniqueKeys, errors, warnings, false);
}

function safeIndex(array, i) {
  return array === void 0 ? void 0 : array[i];
}

function validateConfigSections(config, configWithoutDefaults, configDefaults, sectionKey, allKey, sectionValidators, uniqueKeys, errors, warnings) {
  const sections = config[sectionKey];
  const sectionsWithoutDefaults = Array.isArray(configWithoutDefaults[sectionKey]) ? configWithoutDefaults[sectionKey] : [configWithoutDefaults[sectionKey]];
  const sectionDefaults = configDefaults[sectionKey];
  const all = allKey ? config[allKey] : null;
  for (let i = 0; i < sections.length; i++) {
    validateSection(sectionKey, allKey, safeIndex(sections, i), safeIndex(sectionsWithoutDefaults, i), safeIndex(sectionDefaults, i),
      all, sectionValidators, uniqueKeys, errors, warnings, false, i);
  }
  if (sections.length === 0 && all) {
    validateSection(sectionKey, allKey, all, void 0, void 0, all, sectionValidators, uniqueKeys, errors, warnings, true);
  }
}

function pushAll(target, source) {
  if (source.length > 0) {
    for (let item of source) {
      target.push(item);
    }
  }
}

function validateSection(sectionKey, allKey, section, sectionWithoutDefaults, sectionDefaults, all, sectionValidators, uniqueKeys, errors, warnings, onlyAll, i = void 0) {
  const sectionAll = configWithAll(section, all);
  let { errorMessages, warningMessages } = getMessages(sectionKey, allKey, uniqueKeys, sectionWithoutDefaults, sectionDefaults, all, sectionValidators(sectionAll), onlyAll, i);
  pushAll(errors, errorMessages);
  pushAll(warnings, warningMessages);
}

function validateUniqueInternal(config, sectionKey, property, errors) {
  let sections = config[sectionKey];
  if (arrayValidator(sections)) {
    let sources = {};
    for (const section of sections) {
      if (section[property] !== void 0) {
        sources[section[property]] = sources[section[property]] !== void 0;
      }
    }
    let section;
    for (let i = 0; i < sections.length; i++) {
      section = sections[i];
      if (objectValidator(section) && section[property] !== void 0 && sources[section[property]] === true) {
        errors.push(getPropertyMessage(sectionKey, property,
          getUniqueMessage() + ': ' + JSON.stringify(section[property]), i));
      }
    }
  }
}

function validateUnique(config, configWithoutDefaults, configDefaults, sectionKey, allKey, property, errors) {
  validateUniqueInternal(configDefaults, DEFAULT + sectionKey, property, errors);
  validateUniqueInternal(configWithoutDefaults, sectionKey, property, errors);
}

function validateReferencesInternal(config, targetSections, targetSectionKey, targetProperty, sourceSectionKey, sourceProperty, errors) {
  let sourceSections;
  if (arrayValidator(sourceSectionKey)) {
    sourceSections = [];
    for (let sectionKey of sourceSectionKey) {
      if (arrayValidator(config[sectionKey])) {
        sourceSections = sourceSections.concat(config[sectionKey]);
      }
    }
  }
  else {
    sourceSections = config[sourceSectionKey];
  }
  if (arrayValidator(sourceSections)) {
    let sources = {};
    sourceSections = sourceSections.filter(sourceSection => objectValidator(sourceSection));
    for (let sourceSection of sourceSections) {
      if (sourceSection[sourceProperty] !== void 0) {
        sources[sourceSection[sourceProperty]] = true;
      }
    }
    if (arrayValidator(targetSections)) {
      let target;
      for (let i = 0; i < targetSections.length; i++) {
        target = targetSections[i];
        if (objectValidator(target) && target[targetProperty] !== void 0 && target[targetProperty] !== NONE && sources[target[targetProperty]] !== true) {
          errors.push(getPropertyMessage(targetSectionKey, targetProperty,
            getReferenceMessage(sourceSectionKey, sourceProperty) + ': ' + JSON.stringify(target[targetProperty]), i));
        }
      }
    }
    else if (objectValidator(targetSections)) {
      let target = targetSections;
      if (objectValidator(target) && target[targetProperty] !== void 0 && target[targetProperty] !== NONE && sources[target[targetProperty]] !== true) {
        errors.push(getPropertyMessage(targetSectionKey, targetProperty,
          getReferenceMessage(sourceSectionKey, sourceProperty) + ': ' + JSON.stringify(target[targetProperty])));
      }
    }
  }
}

function validateReferences(config, configWithoutDefaults, configDefaults, targetSectionKey, targetAllKey, targetProperty, sourceSectionKey, sourceProperty, errors) {
  if (targetAllKey) {
    validateReferencesInternal(config, configDefaults[targetAllKey], DEFAULT + targetAllKey, targetProperty, sourceSectionKey, sourceProperty, errors);
  }
  validateReferencesInternal(config, configDefaults[targetSectionKey], DEFAULT + targetSectionKey, targetProperty, sourceSectionKey, sourceProperty, errors);

  if (targetAllKey) {
    validateReferencesInternal(config, configWithoutDefaults[targetAllKey], targetAllKey, targetProperty, sourceSectionKey, sourceProperty, errors);
  }
  validateReferencesInternal(config, configWithoutDefaults[targetSectionKey], targetSectionKey, targetProperty, sourceSectionKey, sourceProperty, errors);
}

// TODO: pre-existing bug kept intact by the TypeScript conversion — the call sites
// below never pass commonProperty, so this check has always been inert at runtime.
function validateCommonReferencesInternal(config, targetSections, targetSectionKey, targetProperty, sourceSectionKey, sourceProperty, errors, commonProperty?) {
  let sourceSections = config[sourceSectionKey];
  if (arrayValidator(sourceSections)) {
    let sourceProperties = {};
    sourceSections = sourceSections.filter(sourceSection => objectValidator(sourceSection));
    for (let sourceSection of sourceSections) {
      if (sourceSection[sourceProperty] !== void 0 && sourceSection[commonProperty] !== void 0) {
        sourceProperties[sourceSection[sourceProperty]] = sourceSection[commonProperty];
      }
    }
    let target;
    let i;
    if (arrayValidator(targetSections)) {
      for (i = 0; i < targetSections.length; i++) {
        target = targetSections[i];
        if (objectValidator(target) && target[targetProperty] !== void 0 && target[commonProperty] !== void 0 &&
          sourceProperties[target[targetProperty]] !== void 0 && sourceProperties[target[targetProperty]] !== target[commonProperty]) {
          errors.push(getPropertyMessage(targetSectionKey, targetProperty,
            getCommonReferenceMessage(sourceSectionKey, sourceProperty, commonProperty) + ': ' +
            JSON.stringify(sourceProperties[target[targetProperty]]) + ' vs  ' + JSON.stringify(target[commonProperty]), i));
        }
      }
    }
    else if (objectValidator(targetSections)) {
      target = targetSections;
      if (objectValidator(target) && target[targetProperty] !== void 0 && target[commonProperty] !== void 0 &&
        sourceProperties[target[targetProperty]] !== void 0 && sourceProperties[target[targetProperty]] !== target[commonProperty]) {
        errors.push(getPropertyMessage(targetSectionKey, targetProperty,
          getCommonReferenceMessage(sourceSectionKey, sourceProperty, commonProperty) + ': ' +
          JSON.stringify(sourceProperties[target[targetProperty]]) + ' vs  ' + JSON.stringify(target[commonProperty]), i));
      }
    }
  }
}

function validateCommonReferences(config, configWithoutDefaults, configDefaults, targetSectionKey, targetAllKey, targetProperty, sourceSectionKey, sourceProperty, commonProperty, errors) {
  if (targetAllKey) {
    validateCommonReferencesInternal(config, configDefaults[targetAllKey], DEFAULT + targetAllKey, targetProperty, sourceSectionKey, sourceProperty, errors);
  }
  validateCommonReferencesInternal(config, configDefaults[targetSectionKey], DEFAULT + targetSectionKey, targetProperty, sourceSectionKey, sourceProperty, errors);

  if (targetAllKey) {
    validateCommonReferencesInternal(config, configWithoutDefaults[targetAllKey], targetAllKey, targetProperty, sourceSectionKey, sourceProperty, errors);
  }
  validateCommonReferencesInternal(config, configWithoutDefaults[targetSectionKey], targetSectionKey, targetProperty, sourceSectionKey, sourceProperty, errors);

}