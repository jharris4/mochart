import validators from './validators';
import { getMessage, getPropertyMessage, getMessages, addWarningMessages, DEFAULT } from './messages';
import type { LocatedValidationMessage } from './messages';
import { NONE, CONFIG_VERSION } from '../core/constants';
import { applyDefaults, configWithAll, filterConfig, sectionKeyAllMap } from '../core/mochartConfig';

import accessibilityValidators from './accessibilityConfig';
import animationValidators from './animationConfig';
import chartValidators from './chartConfig';
import colorPaletteValidators from './colorPaletteConfig';
import crosshairValidators from './crosshairConfig';
import categoryAxisValidators from './categoryAxisConfig';
import legendValidators from './legendConfig';
import linearGradientValidators from './linearGradientConfig';
import pieValidators from './pieConfig';
import plotValidators from './plotConfig';
import radialGradientValidators from './radialGradientConfig';
import valueAxisValidators from './valueAxisConfig';
import seriesValidators from './seriesConfig';
import seriesGroupValidators from './seriesGroupConfig';
import seriesStackValidators from './seriesStackConfig';
import titleValidators from './titleConfig';
import tooltipValidators from './tooltipConfig';
import type { Validator } from '@mochart/movalid';
import type { ConfigDiagnostic, ConfigValidation, DetailedConfigValidation } from '../../types/config';

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

interface InternalConfigValidation extends ConfigValidation {
  errorDetails: LocatedValidationMessage[];
  warningDetails: LocatedValidationMessage[];
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

export function getFollowSeriesMessage(): string {
  return 'should equal the id property of a series that does not itself set followSeries';
}

export const configWithoutAllValidators: Record<string, ConfigSectionValidator> = {
  version: {
    // optional: an omitted version means the current config format; a present
    // version must be one the migration machinery knows
    validator: validators.equal(CONFIG_VERSION).orEqual(undefined)
  },
  id: {
    validator: validators.any()
  },
  accessibility: {
    validator: objectValidator,
    validators: () => accessibilityValidators()
  },
  animation: {
    validator: objectValidator,
    validators: () => animationValidators()
  },
  chart: {
    validator: objectValidator,
    validators: () => chartValidators()
  },
  colorPalette: {
    validator: objectValidator,
    validators: () => colorPaletteValidators()
  },
  crosshair: {
    validator: objectValidator,
    validators: () => crosshairValidators()
  },
  categoryAxis: {
    validator: objectValidator,
    validators: (configSection: ConfigRecord) => categoryAxisValidators(configSection)
  },
  legend: {
    validator: objectValidator,
    validators: () => legendValidators()
  },
  linearGradients: {
    list: true,
    validator: arrayOfObjectsOrEmpty,
    validators: () => linearGradientValidators(),
    uniqueKeys: ['id']
  },
  pie: {
    validator: objectValidator,
    validators: () => pieValidators()
  },
  plot: {
    validator: objectValidator,
    validators: () => plotValidators()
  },
  radialGradients: {
    list: true,
    validator: arrayOfObjectsOrEmpty,
    validators: () => radialGradientValidators(),
    uniqueKeys: ['id']
  },
  valueAxes: {
    list: true,
    validator: arrayOfObjectsNonEmpty,
    validators: () => valueAxisValidators(),
    uniqueKeys: ['id', 'order']
  },
  series: {
    list: true,
    validator: arrayOfObjectsOrEmpty,
    validators: (configSection: ConfigRecord) => seriesValidators(configSection),
    uniqueKeys: ['id', 'order'],
    references: {
      axis: { section: 'valueAxes', key: 'id' },
      group: { section: 'seriesGroups', key: 'id' },
      stack: { section: 'seriesStacks', key: 'id' },
      gradient: { section: ['linearGradients', 'radialGradients'], key: 'id' },
      followSeries: { section: 'series', key: 'id' }
    },
    commonReferences: {
      stack: { section: 'seriesStacks', key: 'id', commonKey: 'axis' }
    }
  },
  seriesGroups: {
    list: true,
    validator: arrayOfObjectsOrEmpty,
    validators: () => seriesGroupValidators(),
    uniqueKeys: ['id']
  },
  seriesStacks: {
    list: true,
    validator: arrayOfObjectsOrEmpty,
    validators: () => seriesStackValidators(),
    uniqueKeys: ['id'],
    references: {
      axis: { section: 'valueAxes', key: 'id' }
    }
  },
  title: {
    validator: objectValidator,
    validators: () => titleValidators()
  },
  tooltip: {
    validator: objectValidator,
    validators: () => tooltipValidators()
  }
};

export const configSectionValidators = {
  ...configWithoutAllValidators
};

const allKeys = Object.keys(sectionKeyAllMap);
let validator: ConfigSectionValidator;
for (const allKey of allKeys) {
  validator = configSectionValidators[allKey];
  validator.allKey = sectionKeyAllMap[allKey];
  configSectionValidators[validator.allKey] = validator;
}

export default function validateConfig(configWithoutDefaults: unknown, configDefaults: ConfigRecord, strict = true): ConfigValidation {
  const { valid, errors, warnings } = validateConfigInternal(configWithoutDefaults, configDefaults, strict);
  return { valid, errors, warnings };
}

function validateConfigInternal(configWithoutDefaults: unknown, configDefaults: ConfigRecord, strict = true): InternalConfigValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const errorDetails: LocatedValidationMessage[] = [];
  const warningDetails: LocatedValidationMessage[] = [];
  if (objectValidator(configWithoutDefaults) && isConfigRecord(configWithoutDefaults)) {
    const config = applyDefaults(configWithoutDefaults, configDefaults);
    addWarningMessages('config', config, configSectionValidators, warnings, warningDetails);
    const sectionKeys = Object.keys(configWithoutAllValidators);
    for (const sectionKey of sectionKeys) {
      const { validator, allKey } = configWithoutAllValidators[sectionKey]!;
      if (allKey && config[allKey] !== undefined) { // all is optional, only validate if set
        if (!isConfigRecord(configWithoutDefaults[allKey])) {
          const message = objectValidator.getErrorMessage(config[allKey]);
          errors.push(getMessage(allKey, message));
          errorDetails.push({ path: [allKey], message });
        }
      }
      const { list, validators, uniqueKeys, references, commonReferences } = configWithoutAllValidators[sectionKey]!;
      const priorErrorCount = errors.length;
      if (list === true) {
        const sectionValue = configWithoutDefaults[sectionKey];
        if (sectionValue !== undefined) {
          // tolerated shapes: the single-object shorthand and the empty array (behaves like an unspecified
          // section); an array with invalid entries must report the arrayOf message
          if (!validator(sectionValue) && !isConfigRecord(sectionValue) && !(Array.isArray(sectionValue) && sectionValue.length === 0)) {
            const message = validator.getErrorMessage(sectionValue);
            errors.push(getMessage(sectionKey, message));
            errorDetails.push({ path: [sectionKey], message });
          }
        }
        if ((configDefaults[sectionKey] !== undefined || configWithoutDefaults[sectionKey] === undefined) && !validator(configDefaults[sectionKey])) {
          const prefix = configDefaults[sectionKey] === undefined ? '' : DEFAULT;
          const message = validator.getErrorMessage(configDefaults[sectionKey]);
          errors.push(getMessage(prefix + sectionKey, message));
          errorDetails.push({ path: [sectionKey], message });
        }
      }
      else {
        if (configWithoutDefaults[sectionKey] !== undefined) {
          if (!validator(configWithoutDefaults[sectionKey])) {
            const message = validator.getErrorMessage(configWithoutDefaults[sectionKey]);
            errors.push(getMessage(sectionKey, message));
            errorDetails.push({ path: [sectionKey], message });
          }
        }
        if ((configDefaults[sectionKey] !== undefined || configWithoutDefaults[sectionKey] === undefined) && !validator(configDefaults[sectionKey])) {
          const prefix = configDefaults[sectionKey] === undefined ? '' : DEFAULT;
          const message = validator.getErrorMessage(configDefaults[sectionKey]);
          errors.push(getMessage(prefix + sectionKey, message));
          errorDetails.push({ path: [sectionKey], message });
        }
      }
      if (priorErrorCount === errors.length && validators) {
        if (list === true) {
          validateConfigSections(config, configWithoutDefaults, configDefaults, sectionKey, allKey, validators, uniqueKeys,
            errors, warnings, errorDetails, warningDetails);
        }
        else {
          validateConfigSection(config, configWithoutDefaults, configDefaults, sectionKey, allKey, validators, uniqueKeys,
            errors, warnings, errorDetails, warningDetails);
        }
        if (Array.isArray(uniqueKeys)) {
          for (const uniqueKey of uniqueKeys) {
            validateUnique(config, configWithoutDefaults, configDefaults, sectionKey, allKey, uniqueKey, errors, errorDetails);
          }
        }
        if (references) {
          const referenceKeys = Object.keys(references);
          for (const referenceKey of referenceKeys) {
            if (references[referenceKey]) {
              const { section, key } = references[referenceKey]!;
              validateReferences(config, configWithoutDefaults, configDefaults, sectionKey, allKey, referenceKey, section, key,
                errors, errorDetails);
            }
          }
        }
        if (commonReferences) {
          const referenceKeys = Object.keys(commonReferences);
          for (const referenceKey of referenceKeys) {
            const reference = commonReferences[referenceKey];
            if (reference && typeof reference.section === 'string' && reference.commonKey) {
              const { section, key, commonKey } = reference;
              validateCommonReferences(config, configWithoutDefaults, configDefaults, sectionKey, allKey, referenceKey, section,
                key, commonKey, errors, errorDetails);
            }
          }
        }
      }
    }
    validateFollowSeries(config, configWithoutDefaults, errors, errorDetails);
  }
  else {
    const message = objectValidator.getErrorMessage(configWithoutDefaults);
    errors.push(getMessage('config', message));
    errorDetails.push({ path: [], message });
  }
  const valid = errors.length === 0 && (strict === false || warnings.length === 0);

  return {
    valid,
    errors,
    warnings,
    errorDetails,
    warningDetails
  };
}

function diagnosticFromDetail(detail: LocatedValidationMessage, severity: 'error' | 'warning'): ConfigDiagnostic {
  return { ...detail, severity, source: 'mochart' };
}

/**
 * Validate a config and additionally return path-addressable diagnostics for
 * editor integrations. The legacy validateConfig result deliberately keeps
 * its exact three-property shape.
 */
export function validateConfigDetailed(configWithoutDefaults: unknown, configDefaults: ConfigRecord, strict = true): DetailedConfigValidation {
  const { errorDetails, warningDetails, ...validation } = validateConfigInternal(configWithoutDefaults, configDefaults, strict);
  return {
    ...validation,
    diagnostics: [
      ...errorDetails.map(detail => diagnosticFromDetail(detail, 'error')),
      ...warningDetails.map(detail => diagnosticFromDetail(detail, 'warning'))
    ]
  };
}

function validateConfigSection(config: ConfigRecord, configWithoutDefaults: ConfigRecord, configDefaults: ConfigRecord, sectionKey: string, allKey: string | undefined, sectionValidators: (section: ConfigRecord) => ValidatorMap, uniqueKeys: string[] | undefined, errors: string[], warnings: string[], errorDetails: LocatedValidationMessage[], warningDetails: LocatedValidationMessage[]): void {
  validateSection(sectionKey, allKey, config[sectionKey], configWithoutDefaults[sectionKey], configDefaults[sectionKey],
    allKey ? config[allKey] : null, sectionValidators, uniqueKeys, errors, warnings, errorDetails, warningDetails, false);
}

function safeIndex(array: unknown, i: number): unknown {
  return Array.isArray(array) ? array[i] : undefined;
}

function validateConfigSections(config: ConfigRecord, configWithoutDefaults: ConfigRecord, configDefaults: ConfigRecord, sectionKey: string, allKey: string | undefined, sectionValidators: (section: ConfigRecord) => ValidatorMap, uniqueKeys: string[] | undefined, errors: string[], warnings: string[], errorDetails: LocatedValidationMessage[], warningDetails: LocatedValidationMessage[]): void {
  const sections = config[sectionKey] as unknown[];
  const rawSections = Array.isArray(configWithoutDefaults[sectionKey]) ? configWithoutDefaults[sectionKey] : [configWithoutDefaults[sectionKey]];
  const sectionDefaults = configDefaults[sectionKey];
  const all = allKey ? config[allKey] : null;
  // built sections drop ignored/non-object raw entries, so pair by filtered raw index
  const rawIndices: number[] = [];
  for (let i = 0; i < rawSections.length; i++) {
    if (filterConfig(rawSections[i])) {
      rawIndices.push(i);
    }
  }
  let rawIndex: number | undefined;
  for (let i = 0; i < sections.length; i++) {
    rawIndex = rawIndices[i];
    validateSection(sectionKey, allKey, safeIndex(sections, i), rawIndex === undefined ? undefined : rawSections[rawIndex], safeIndex(sectionDefaults, i),
      all, sectionValidators, uniqueKeys, errors, warnings, errorDetails, warningDetails, false, rawIndex ?? i, i === 0);
  }
  if (sections.length === 0 && all) {
    validateSection(sectionKey, allKey, all, undefined, undefined, all, sectionValidators, uniqueKeys, errors, warnings,
      errorDetails, warningDetails, true);
  }
}

function pushAll(target: string[], source: string[]): void {
  if (source.length > 0) {
    for (const item of source) {
      target.push(item);
    }
  }
}

function validateSection(sectionKey: string, allKey: string | undefined, section: unknown, sectionWithoutDefaults: unknown, sectionDefaults: unknown, all: unknown, sectionValidators: (section: ConfigRecord) => ValidatorMap, uniqueKeys: string[] | undefined, errors: string[], warnings: string[], errorDetails: LocatedValidationMessage[], warningDetails: LocatedValidationMessage[], onlyAll: boolean, i: number | undefined = undefined, first: boolean = i === undefined || i === 0): void {
  const sectionAll = configWithAll(section, all);
  const messages = getMessages(sectionKey, allKey, uniqueKeys, sectionWithoutDefaults, sectionDefaults, all,
    sectionValidators(isConfigRecord(sectionAll) ? sectionAll : {}), onlyAll, i, first);
  const { errorMessages, warningMessages } = messages;
  pushAll(errors, errorMessages);
  pushAll(warnings, warningMessages);
  errorDetails.push(...messages.errorDetails);
  warningDetails.push(...messages.warningDetails);
}

function validateUnique(config: ConfigRecord, configWithoutDefaults: ConfigRecord, _configDefaults: ConfigRecord, sectionKey: string, _allKey: string | undefined, property: string, errors: string[], errorDetails: LocatedValidationMessage[]): void {
  // Uniqueness holds on the built entries (raw and defaulted values merged);
  // checking raw and defaults separately misses cross collisions, e.g. an
  // explicit id equal to another entry's defaulted id.
  const sections = config[sectionKey];
  if (!Array.isArray(sections)) {
    return;
  }
  const rawSections = Array.isArray(configWithoutDefaults[sectionKey]) ? configWithoutDefaults[sectionKey] as unknown[] : [configWithoutDefaults[sectionKey]];
  const rawIndices: number[] = [];
  for (let i = 0; i < rawSections.length; i++) {
    if (filterConfig(rawSections[i])) {
      rawIndices.push(i);
    }
  }
  const seen: Record<string, boolean> = Object.create(null); // null proto: ids like "constructor" must not hit Object.prototype
  for (const section of sections) {
    if (isConfigRecord(section) && section[property] !== undefined) {
      const value = String(section[property]);
      seen[value] = seen[value] !== undefined;
    }
  }
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (isConfigRecord(section) && section[property] !== undefined && seen[String(section[property])] === true) {
      const message = getUniqueMessage() + ': ' + JSON.stringify(section[property]);
      const reportIndex = rawIndices[i] ?? i;
      errors.push(getPropertyMessage(sectionKey, property, message, reportIndex));
      errorDetails.push({ path: [sectionKey, reportIndex, property], message });
    }
  }
}

function validateReferencesInternal(config: ConfigRecord, targetSections: unknown, targetSectionKey: string, targetProperty: string, sourceSectionKey: string | string[], sourceProperty: string, errors: string[], errorDetails: LocatedValidationMessage[]): void {
  let sourceSections: unknown = undefined;
  if (Array.isArray(sourceSectionKey)) {
    let combinedSourceSections: unknown[] = [];
    for (const sectionKey of sourceSectionKey) {
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
    const sources: Record<string, boolean> = Object.create(null); // null proto: ids like "__proto__" must be storable
    const sourceSectionRecords = sourceSections.filter(isConfigRecord);
    for (const sourceSection of sourceSectionRecords) {
      if (sourceSection[sourceProperty] !== undefined) {
        sources[String(sourceSection[sourceProperty])] = true;
      }
    }
    if (Array.isArray(targetSections)) {
      let target: unknown;
      for (let i = 0; i < targetSections.length; i++) {
        target = targetSections[i];
        if (isConfigRecord(target) && target[targetProperty] !== undefined && target[targetProperty] !== NONE && sources[String(target[targetProperty])] !== true) {
          const message = getReferenceMessage(sourceSectionKey, sourceProperty) + ': ' + JSON.stringify(target[targetProperty]);
          errors.push(getPropertyMessage(targetSectionKey, targetProperty, message, i));
          const cleanSectionKey = targetSectionKey.startsWith(DEFAULT)
            ? targetSectionKey.slice(DEFAULT.length) : targetSectionKey;
          errorDetails.push({ path: [cleanSectionKey, i, targetProperty], message });
        }
      }
    }
    else if (isConfigRecord(targetSections)) {
      const target = targetSections;
      if (target[targetProperty] !== undefined && target[targetProperty] !== NONE && sources[String(target[targetProperty])] !== true) {
        const message = getReferenceMessage(sourceSectionKey, sourceProperty) + ': ' + JSON.stringify(target[targetProperty]);
        errors.push(getPropertyMessage(targetSectionKey, targetProperty, message));
        const cleanSectionKey = targetSectionKey.startsWith(DEFAULT)
          ? targetSectionKey.slice(DEFAULT.length) : targetSectionKey;
        errorDetails.push({ path: [cleanSectionKey, targetProperty], message });
      }
    }
  }
}

function validateReferences(config: ConfigRecord, configWithoutDefaults: ConfigRecord, configDefaults: ConfigRecord, targetSectionKey: string, targetAllKey: string | undefined, targetProperty: string, sourceSectionKey: string | string[], sourceProperty: string, errors: string[], errorDetails: LocatedValidationMessage[]): void {
  if (targetAllKey) {
    validateReferencesInternal(config, configDefaults[targetAllKey], DEFAULT + targetAllKey, targetProperty, sourceSectionKey,
      sourceProperty, errors, errorDetails);
  }
  validateReferencesInternal(config, configDefaults[targetSectionKey], DEFAULT + targetSectionKey, targetProperty,
    sourceSectionKey, sourceProperty, errors, errorDetails);

  if (targetAllKey) {
    validateReferencesInternal(config, configWithoutDefaults[targetAllKey], targetAllKey, targetProperty, sourceSectionKey,
      sourceProperty, errors, errorDetails);
  }
  validateReferencesInternal(config, configWithoutDefaults[targetSectionKey], targetSectionKey, targetProperty,
    sourceSectionKey, sourceProperty, errors, errorDetails);
}

// follower lookups never walk transitively, so a follower must not itself be followed
function validateFollowSeries(config: ConfigRecord, configWithoutDefaults: ConfigRecord, errors: string[], errorDetails: LocatedValidationMessage[]): void {
  const seriesSections = config['series'];
  if (!Array.isArray(seriesSections)) {
    return;
  }
  const isFollower: Record<string, boolean> = Object.create(null); // null proto: ids like "__proto__" must be storable
  for (const section of seriesSections.filter(isConfigRecord)) {
    if (section['id'] !== undefined && section['followSeries'] !== undefined && section['followSeries'] !== NONE) {
      isFollower[String(section['id'])] = true;
    }
  }
  // built sections drop ignored/non-object raw entries, so report at the filtered raw index
  const rawSections = Array.isArray(configWithoutDefaults['series']) ? configWithoutDefaults['series'] as unknown[] : [configWithoutDefaults['series']];
  const rawIndices: number[] = [];
  for (let i = 0; i < rawSections.length; i++) {
    if (filterConfig(rawSections[i])) {
      rawIndices.push(i);
    }
  }
  for (let i = 0; i < seriesSections.length; i++) {
    const section = seriesSections[i];
    if (!isConfigRecord(section)) {
      continue;
    }
    const followSeries = section['followSeries'];
    if (followSeries === undefined || followSeries === NONE || isFollower[String(followSeries)] !== true) {
      continue;
    }
    const message = getFollowSeriesMessage() + ': ' + JSON.stringify(followSeries);
    const reportIndex = rawIndices[i] ?? i;
    errors.push(getPropertyMessage('series', 'followSeries', message, reportIndex));
    errorDetails.push({ path: ['series', reportIndex, 'followSeries'], message });
  }
}

function validateCommonReferences(config: ConfigRecord, configWithoutDefaults: ConfigRecord, _configDefaults: ConfigRecord, targetSectionKey: string, _targetAllKey: string | undefined, targetProperty: string, sourceSectionKey: string, sourceProperty: string, commonProperty: string, errors: string[], errorDetails: LocatedValidationMessage[]): void {
  // The common invariant holds on the built entries (raw, defaulted and
  // all-section values merged); checking raw and defaults separately misses
  // cross pairings, e.g. an explicit axis combined with a defaulted stack.
  const sourceSections = config[sourceSectionKey];
  const targetSections = config[targetSectionKey];
  if (!Array.isArray(sourceSections) || !Array.isArray(targetSections)) {
    return;
  }
  const sourceProperties: Record<string, unknown> = Object.create(null); // null proto: ids like "constructor" must not hit Object.prototype
  for (const sourceSection of sourceSections.filter(isConfigRecord)) {
    if (sourceSection[sourceProperty] !== undefined && sourceSection[commonProperty] !== undefined) {
      sourceProperties[String(sourceSection[sourceProperty])] = sourceSection[commonProperty];
    }
  }
  // built sections drop ignored/non-object raw entries, so pair by filtered raw index
  const rawSections = Array.isArray(configWithoutDefaults[targetSectionKey]) ? configWithoutDefaults[targetSectionKey] as unknown[] : [configWithoutDefaults[targetSectionKey]];
  const rawIndices: number[] = [];
  for (let i = 0; i < rawSections.length; i++) {
    if (filterConfig(rawSections[i])) {
      rawIndices.push(i);
    }
  }
  for (let i = 0; i < targetSections.length; i++) {
    const target = targetSections[i];
    if (isConfigRecord(target) && target[targetProperty] !== undefined && target[commonProperty] !== undefined &&
      sourceProperties[String(target[targetProperty])] !== undefined && sourceProperties[String(target[targetProperty])] !== target[commonProperty]) {
      const message = getCommonReferenceMessage(sourceSectionKey, sourceProperty, commonProperty) + ': ' +
        JSON.stringify(sourceProperties[String(target[targetProperty])]) + ' vs  ' + JSON.stringify(target[commonProperty]);
      const reportIndex = rawIndices[i] ?? i;
      errors.push(getPropertyMessage(targetSectionKey, targetProperty, message, reportIndex));
      errorDetails.push({ path: [targetSectionKey, reportIndex, targetProperty], message });
    }
  }
}
