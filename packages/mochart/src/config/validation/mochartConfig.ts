import validators from './validators';
import { getMessage, getPropertyMessage, getMessages, addErrorMessage, addWarningMessages, DEFAULT } from './messages';
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
import type { Validator } from '@mochart/movalid';
import type { ConfigValidation } from '../../types/config';

type ConfigRecord = Record<string, unknown>;
type ValidatorMap = Record<string, Validator>;
type SectionReference = { section: string | string[]; key: string; commonKey?: string };
interface ConfigSectionValidator {
  validator: Validator;
  validators?: (configSection: ConfigRecord) => ValidatorMap;
  list?: boolean;
  uniqueKeys?: string[];
  references?: Record<string, SectionReference>;
  commonReferences?: Record<string, SectionReference>;
  allKey?: string;
}

function isConfigRecord(value: unknown): value is ConfigRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const objectValidator = validators.object();
const arrayOfObjectsOrEmpty = validators.arrayOf(objectValidator, true);
const arrayOfObjectsNonEmpty = validators.arrayOf(objectValidator, false);

export const allValidator = validators.object();

export function getUniqueMessage() {
  return 'should be unique';
}

function formatSectionKey(sectionKey: string | string[]): string {
  if (Array.isArray(sectionKey)) {
    return sectionKey.join(' or ');
  }
  else {
    return sectionKey;
  }
}

export function getReferenceMessage(sourceSectionKey: string | string[], sourceProperty: string): string {
  return 'should equal the ' + sourceProperty + ' property of one of the ' + formatSectionKey(sourceSectionKey);
}

export function getCommonReferenceMessage(sourceSectionKey: string | string[], sourceProperty: string, commonProperty: string): string {
  return 'should equal the ' + sourceProperty + ' property of one of the ' + formatSectionKey(sourceSectionKey) + ' that has the same ' + commonProperty + ' property';
}

export const configWithoutAllValidators: Record<string, ConfigSectionValidator> = {
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
    validators: (configSection: ConfigRecord) => groupAxisValidators(configSection)
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
    validators: (configSection: ConfigRecord) => seriesValidators(configSection),
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
let validator: ConfigSectionValidator;
for (let allKey of allKeys) {
  validator = configSectionValidators[allKey];
  validator.allKey = sectionKeyAllMap[allKey];
  configSectionValidators[validator.allKey] = validator;
}

export default function validateConfig(configWithoutDefaults: unknown, configDefaults: ConfigRecord, strict = true): ConfigValidation {
  let errors: string[] = [];
  let warnings: string[] = [];
  if (objectValidator(configWithoutDefaults) && isConfigRecord(configWithoutDefaults)) {
    const config = applyDefaults(configWithoutDefaults, configDefaults);
    addWarningMessages('config', config, configSectionValidators, warnings);
    const sectionKeys = Object.keys(configWithoutAllValidators);
    for (let sectionKey of sectionKeys) {
      const { validator, allKey } = configWithoutAllValidators[sectionKey]!;
      if (allKey && config[allKey] !== undefined) { // all is optional, only validate if set
        if (!objectValidator(configWithoutDefaults[allKey])) {
          errors.push(getMessage(allKey, objectValidator.getErrorMessage(config[allKey])));
        }
      }
      const { list, validators, uniqueKeys, references, commonReferences } = configWithoutAllValidators[sectionKey]!;
      const priorErrorCount = errors.length;
      if (list === true) {
        if (configWithoutDefaults[sectionKey] !== undefined) {
          if (!validator(configWithoutDefaults[sectionKey]) && !objectValidator(configWithoutDefaults[sectionKey])) {
            errors.push(getMessage(sectionKey, validator.getErrorMessage(configWithoutDefaults[sectionKey])));
          }
        }
        if ((configDefaults[sectionKey] !== undefined || configWithoutDefaults[sectionKey] === undefined) && !validator(configDefaults[sectionKey])) {
          const prefix = configDefaults[sectionKey] === undefined ? '' : DEFAULT;
          errors.push(getMessage(prefix + sectionKey, validator.getErrorMessage(configDefaults[sectionKey])));
        }
      }
      else {
        if (configWithoutDefaults[sectionKey] !== undefined) {
          if (!validator(configWithoutDefaults[sectionKey])) {
            errors.push(getMessage(sectionKey, validator.getErrorMessage(configWithoutDefaults[sectionKey])));
          }
        }
        if ((configDefaults[sectionKey] !== undefined || configWithoutDefaults[sectionKey] === undefined) && !validator(configDefaults[sectionKey])) {
          const prefix = configDefaults[sectionKey] === undefined ? '' : DEFAULT;
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
        if (Array.isArray(uniqueKeys)) {
          for (let uniqueKey of uniqueKeys) {
            validateUnique(config, configWithoutDefaults, configDefaults, sectionKey, allKey, uniqueKey, errors);
          }
        }
        if (references) {
          const referenceKeys = Object.keys(references);
          for (let referenceKey of referenceKeys) {
            if (references[referenceKey]) {
              const { section, key } = references[referenceKey]!;
              validateReferences(config, configWithoutDefaults, configDefaults, sectionKey, allKey, referenceKey, section, key, errors);
            }
          }
        }
        if (commonReferences) {
          const referenceKeys = Object.keys(commonReferences);
          for (let referenceKey of referenceKeys) {
            const reference = commonReferences[referenceKey];
            if (reference && typeof reference.section === 'string' && reference.commonKey) {
              const { section, key, commonKey } = reference;
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

function validateConfigSection(config: ConfigRecord, configWithoutDefaults: ConfigRecord, configDefaults: ConfigRecord, sectionKey: string, allKey: string | undefined, sectionValidators: (section: ConfigRecord) => ValidatorMap, uniqueKeys: string[] | undefined, errors: string[], warnings: string[]): void {
  validateSection(sectionKey, allKey, config[sectionKey], configWithoutDefaults[sectionKey], configDefaults[sectionKey], allKey ? config[allKey] : null, sectionValidators, uniqueKeys, errors, warnings, false);
}

function safeIndex(array: unknown, i: number): unknown {
  return Array.isArray(array) ? array[i] : undefined;
}

function validateConfigSections(config: ConfigRecord, configWithoutDefaults: ConfigRecord, configDefaults: ConfigRecord, sectionKey: string, allKey: string | undefined, sectionValidators: (section: ConfigRecord) => ValidatorMap, uniqueKeys: string[] | undefined, errors: string[], warnings: string[]): void {
  const sections = config[sectionKey] as unknown[];
  const sectionsWithoutDefaults = Array.isArray(configWithoutDefaults[sectionKey]) ? configWithoutDefaults[sectionKey] : [configWithoutDefaults[sectionKey]];
  const sectionDefaults = configDefaults[sectionKey];
  const all = allKey ? config[allKey] : null;
  for (let i = 0; i < sections.length; i++) {
    validateSection(sectionKey, allKey, safeIndex(sections, i), safeIndex(sectionsWithoutDefaults, i), safeIndex(sectionDefaults, i),
      all, sectionValidators, uniqueKeys, errors, warnings, false, i);
  }
  if (sections.length === 0 && all) {
    validateSection(sectionKey, allKey, all, undefined, undefined, all, sectionValidators, uniqueKeys, errors, warnings, true);
  }
}

function pushAll(target: string[], source: string[]): void {
  if (source.length > 0) {
    for (let item of source) {
      target.push(item);
    }
  }
}

function validateSection(sectionKey: string, allKey: string | undefined, section: unknown, sectionWithoutDefaults: unknown, sectionDefaults: unknown, all: unknown, sectionValidators: (section: ConfigRecord) => ValidatorMap, uniqueKeys: string[] | undefined, errors: string[], warnings: string[], onlyAll: boolean, i: number | undefined = undefined): void {
  const sectionAll = configWithAll(section, all);
  let { errorMessages, warningMessages } = getMessages(sectionKey, allKey, uniqueKeys, sectionWithoutDefaults, sectionDefaults, all, sectionValidators(isConfigRecord(sectionAll) ? sectionAll : {}), onlyAll, i);
  pushAll(errors, errorMessages);
  pushAll(warnings, warningMessages);
}

function validateUniqueInternal(config: ConfigRecord, sectionKey: string, property: string, errors: string[]): void {
  let sections = config[sectionKey];
  if (Array.isArray(sections)) {
    let sources: Record<string, boolean> = {};
    for (const section of sections) {
      if (isConfigRecord(section) && section[property] !== undefined) {
        const value = String(section[property]);
        sources[value] = sources[value] !== undefined;
      }
    }
    let section;
    for (let i = 0; i < sections.length; i++) {
      section = sections[i];
      if (isConfigRecord(section) && section[property] !== undefined && sources[String(section[property])] === true) {
        errors.push(getPropertyMessage(sectionKey, property,
          getUniqueMessage() + ': ' + JSON.stringify(section[property]), i));
      }
    }
  }
}

function validateUnique(_config: ConfigRecord, configWithoutDefaults: ConfigRecord, configDefaults: ConfigRecord, sectionKey: string, _allKey: string | undefined, property: string, errors: string[]): void {
  validateUniqueInternal(configDefaults, DEFAULT + sectionKey, property, errors);
  validateUniqueInternal(configWithoutDefaults, sectionKey, property, errors);
}

function validateReferencesInternal(config: ConfigRecord, targetSections: unknown, targetSectionKey: string, targetProperty: string, sourceSectionKey: string | string[], sourceProperty: string, errors: string[]): void {
  let sourceSections: unknown = undefined;
  if (Array.isArray(sourceSectionKey)) {
    let combinedSourceSections: unknown[] = [];
    for (let sectionKey of sourceSectionKey) {
      if (Array.isArray(config[sectionKey])) {
        combinedSourceSections = combinedSourceSections.concat(config[sectionKey]);
      }
    }
    sourceSections = combinedSourceSections;
  }
  else {
    sourceSections = config[sourceSectionKey];
  }
  if (Array.isArray(sourceSections)) {
    let sources: Record<string, boolean> = {};
    const sourceSectionRecords = sourceSections.filter(isConfigRecord);
    for (let sourceSection of sourceSectionRecords) {
      if (sourceSection[sourceProperty] !== undefined) {
        sources[String(sourceSection[sourceProperty])] = true;
      }
    }
    if (Array.isArray(targetSections)) {
      let target: unknown;
      for (let i = 0; i < targetSections.length; i++) {
        target = targetSections[i];
        if (isConfigRecord(target) && target[targetProperty] !== undefined && target[targetProperty] !== NONE && sources[String(target[targetProperty])] !== true) {
          errors.push(getPropertyMessage(targetSectionKey, targetProperty,
            getReferenceMessage(sourceSectionKey, sourceProperty) + ': ' + JSON.stringify(target[targetProperty]), i));
        }
      }
    }
    else if (isConfigRecord(targetSections)) {
      let target = targetSections;
      if (target[targetProperty] !== undefined && target[targetProperty] !== NONE && sources[String(target[targetProperty])] !== true) {
        errors.push(getPropertyMessage(targetSectionKey, targetProperty,
          getReferenceMessage(sourceSectionKey, sourceProperty) + ': ' + JSON.stringify(target[targetProperty])));
      }
    }
  }
}

function validateReferences(config: ConfigRecord, configWithoutDefaults: ConfigRecord, configDefaults: ConfigRecord, targetSectionKey: string, targetAllKey: string | undefined, targetProperty: string, sourceSectionKey: string | string[], sourceProperty: string, errors: string[]): void {
  if (targetAllKey) {
    validateReferencesInternal(config, configDefaults[targetAllKey], DEFAULT + targetAllKey, targetProperty, sourceSectionKey, sourceProperty, errors);
  }
  validateReferencesInternal(config, configDefaults[targetSectionKey], DEFAULT + targetSectionKey, targetProperty, sourceSectionKey, sourceProperty, errors);

  if (targetAllKey) {
    validateReferencesInternal(config, configWithoutDefaults[targetAllKey], targetAllKey, targetProperty, sourceSectionKey, sourceProperty, errors);
  }
  validateReferencesInternal(config, configWithoutDefaults[targetSectionKey], targetSectionKey, targetProperty, sourceSectionKey, sourceProperty, errors);
}

function validateCommonReferencesInternal(config: ConfigRecord, targetSections: unknown, targetSectionKey: string, targetProperty: string, sourceSectionKey: string, sourceProperty: string, errors: string[], commonProperty: string): void {
  let sourceSections = config[sourceSectionKey];
  if (Array.isArray(sourceSections)) {
    let sourceProperties: Record<string, unknown> = {};
    const sourceSectionRecords = sourceSections.filter(isConfigRecord);
    for (let sourceSection of sourceSectionRecords) {
      if (sourceSection[sourceProperty] !== undefined && sourceSection[commonProperty] !== undefined) {
        sourceProperties[String(sourceSection[sourceProperty])] = sourceSection[commonProperty];
      }
    }
    let target: unknown;
    let i: number | undefined;
    if (Array.isArray(targetSections)) {
      for (i = 0; i < targetSections.length; i++) {
        target = targetSections[i];
        if (isConfigRecord(target) && target[targetProperty] !== undefined && target[commonProperty] !== undefined &&
          sourceProperties[String(target[targetProperty])] !== undefined && sourceProperties[String(target[targetProperty])] !== target[commonProperty]) {
          errors.push(getPropertyMessage(targetSectionKey, targetProperty,
            getCommonReferenceMessage(sourceSectionKey, sourceProperty, commonProperty) + ': ' +
            JSON.stringify(sourceProperties[String(target[targetProperty])]) + ' vs  ' + JSON.stringify(target[commonProperty]), i));
        }
      }
    }
    else if (isConfigRecord(targetSections)) {
      const targetRecord = targetSections;
      if (targetRecord[targetProperty] !== undefined && targetRecord[commonProperty] !== undefined &&
        sourceProperties[String(targetRecord[targetProperty])] !== undefined && sourceProperties[String(targetRecord[targetProperty])] !== targetRecord[commonProperty]) {
        errors.push(getPropertyMessage(targetSectionKey, targetProperty,
          getCommonReferenceMessage(sourceSectionKey, sourceProperty, commonProperty) + ': ' +
          JSON.stringify(sourceProperties[String(targetRecord[targetProperty])]) + ' vs  ' + JSON.stringify(targetRecord[commonProperty]), i));
      }
    }
  }
}

function validateCommonReferences(config: ConfigRecord, configWithoutDefaults: ConfigRecord, configDefaults: ConfigRecord, targetSectionKey: string, targetAllKey: string | undefined, targetProperty: string, sourceSectionKey: string, sourceProperty: string, commonProperty: string, errors: string[]): void {
  if (targetAllKey) {
    validateCommonReferencesInternal(config, configDefaults[targetAllKey], DEFAULT + targetAllKey, targetProperty, sourceSectionKey, sourceProperty, errors, commonProperty);
  }
  validateCommonReferencesInternal(config, configDefaults[targetSectionKey], DEFAULT + targetSectionKey, targetProperty, sourceSectionKey, sourceProperty, errors, commonProperty);

  if (targetAllKey) {
    validateCommonReferencesInternal(config, configWithoutDefaults[targetAllKey], targetAllKey, targetProperty, sourceSectionKey, sourceProperty, errors, commonProperty);
  }
  validateCommonReferencesInternal(config, configWithoutDefaults[targetSectionKey], targetSectionKey, targetProperty, sourceSectionKey, sourceProperty, errors, commonProperty);

}
