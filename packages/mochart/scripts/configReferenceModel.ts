// Builds the structured config-reference model consumed by every docs
// surface: the generated JSON artifact (used by the docs site), the legacy
// mochart-docs.html renderer, and (later) JSDoc codegen. The model is
// assembled from the same three per-section sources the runtime uses —
// descriptions (config/docs), validators (config/validation), and defaults
// including conditional defaults (config/defaults) — and cross-checks that
// their keys stay in sync.

import {
  configWithoutAllValidators as mochartConfigSectionValidators,
  getUniqueMessage,
  getReferenceMessage,
  getCommonReferenceMessage,
  allValidator
} from '../src/config/validation/mochartConfig';
import getSectionDescriptions from '../src/config/docs/mochartConfig';
import { sectionKeyAllMap } from '../src/config/core/mochartConfig';

import getAnimationDefaults from '../src/config/defaults/animationConfig';
import getAnimationValidators from '../src/config/validation/animationConfig';
import * as animationDocs from '../src/config/docs/animationConfig';

import getChartDefaults from '../src/config/defaults/chartConfig';
import getChartValidators from '../src/config/validation/chartConfig';
import * as chartDocs from '../src/config/docs/chartConfig';

import getColorPaletteDefaults from '../src/config/defaults/colorPaletteConfig';
import getColorPaletteValidators from '../src/config/validation/colorPaletteConfig';
import * as colorPaletteDocs from '../src/config/docs/colorPaletteConfig';

import getCrosshairDefaults from '../src/config/defaults/crosshairConfig';
import getCrosshairValidators from '../src/config/validation/crosshairConfig';
import * as crosshairDocs from '../src/config/docs/crosshairConfig';

import { getRegularDefaults as getGroupAxisRegularDefaults, getConditionalDefaults as getGroupAxisConditionalDefaults } from '../src/config/defaults/groupAxisConfig';
import getGroupAxisValidators from '../src/config/validation/groupAxisConfig';
import * as groupAxisDocs from '../src/config/docs/groupAxisConfig';

import { getRegularDefaults as getLegendRegularDefaults, getConditionalDefaults as getLegendConditionalDefaults } from '../src/config/defaults/legendConfig';
import getLegendValidators from '../src/config/validation/legendConfig';
import * as legendDocs from '../src/config/docs/legendConfig';

import { getRegularDefaults as getLinearGradientRegularDefaults, getConditionalDefaults as getLinearGradientConditionalDefaults } from '../src/config/defaults/linearGradientConfig';
import getLinearGradientValidators from '../src/config/validation/linearGradientConfig';
import * as linearGradientDocs from '../src/config/docs/linearGradientConfig';

import { getRegularDefaults as getPieRegularDefaults, getConditionalDefaults as getPieConditionalDefaults } from '../src/config/defaults/pieConfig';
import getPieValidators from '../src/config/validation/pieConfig';
import * as pieDocs from '../src/config/docs/pieConfig';

import getPlotDefaults from '../src/config/defaults/plotConfig';
import getPlotValidators from '../src/config/validation/plotConfig';
import * as plotDocs from '../src/config/docs/plotConfig';

import { getRegularDefaults as getRadialGradientRegularDefaults, getConditionalDefaults as getRadialGradientConditionalDefaults } from '../src/config/defaults/radialGradientConfig';
import getRadialGradientValidators from '../src/config/validation/radialGradientConfig';
import * as radialGradientDocs from '../src/config/docs/radialGradientConfig';

import { getRegularDefaults as getSeriesAxisRegularDefaults, getConditionalDefaults as getSeriesAxisConditionalDefaults } from '../src/config/defaults/seriesAxisConfig';
import getSeriesAxisValidators from '../src/config/validation/seriesAxisConfig';
import * as seriesAxisDocs from '../src/config/docs/seriesAxisConfig';

import { getRegularDefaults as getSeriesRegularDefaults, getConditionalDefaults as getSeriesConditionalDefaults } from '../src/config/defaults/seriesConfig';
import getSeriesValidators from '../src/config/validation/seriesConfig';
import * as seriesDocs from '../src/config/docs/seriesConfig';

import { getRegularDefaults as getSeriesGroupRegularDefaults, getConditionalDefaults as getSeriesGroupConditionalDefaults } from '../src/config/defaults/seriesGroupConfig';
import getSeriesGroupValidators from '../src/config/validation/seriesGroupConfig';
import * as seriesGroupDocs from '../src/config/docs/seriesGroupConfig';

import { getRegularDefaults as getSeriesStackRegularDefaults, getConditionalDefaults as getSeriesStackConditionalDefaults } from '../src/config/defaults/seriesStackConfig';
import getSeriesStackValidators from '../src/config/validation/seriesStackConfig';
import * as seriesStackDocs from '../src/config/docs/seriesStackConfig';

import getTitleDefaults from '../src/config/defaults/titleConfig';
import getTitleValidators from '../src/config/validation/titleConfig';
import * as titleDocs from '../src/config/docs/titleConfig';

import { getRegularDefaults as getTooltipRegularDefaults, getConditionalDefaults as getTooltipConditionalDefaults } from '../src/config/defaults/tooltipConfig';
import getTooltipValidators from '../src/config/validation/tooltipConfig';
import * as tooltipDocs from '../src/config/docs/tooltipConfig';

import validators from '@mochart/movalid';
import type { Validator } from '@mochart/movalid';

import type { ConditionalDefaultRule } from '../src/config/defaults/conditionalDefault';
import type {
  GroupAxisConfig,
  LegendConfig,
  LinearGradientConfig,
  PieConfig,
  RadialGradientConfig,
  SeriesAxisConfig,
  SeriesConfig,
  SeriesGroupConfig,
  SeriesStackConfig,
  TooltipConfig
} from '../src/types/config';

type ValidatorMap = Record<string, Validator>;
type Defaults = Record<string, unknown>;
type Descriptions = Record<string, string>;
type AnyRule = ConditionalDefaultRule<unknown, unknown, unknown>;
type ConditionalDefaults = Record<string, { rules?: AnyRule[] } | undefined>;

type SectionReference = { section: string | string[]; key: string; commonKey?: string };
interface SectionValidatorInfo {
  validator: Validator;
  uniqueKeys?: string[];
  references?: Record<string, SectionReference>;
  commonReferences?: Record<string, SectionReference>;
}
type SectionValidatorMap = Record<string, SectionValidatorInfo>;

interface DocsModule {
  default: () => Descriptions;
  getDetails?: () => Descriptions;
}

// --- Public model types ------------------------------------------------------

export type DefaultValue =
  | { kind: 'color'; color: string }
  | { kind: 'colors'; colors: string[] }
  | { kind: 'literal'; text: string }
  | { kind: 'none' };

export interface ConditionalDefaultValue {
  value: DefaultValue;
  /** Human-readable condition under which this default applies. */
  condition: string;
}

export interface PropertyDoc {
  key: string;
  description: string;
  /** Optional longer remark, markdown. */
  details?: string;
  /** Validation rule messages, including uniqueness/reference constraints. */
  rules: string[];
  default?: DefaultValue;
  conditionalDefaults?: ConditionalDefaultValue[];
}

export interface SectionDoc {
  /** Top-level config key, e.g. 'seriesConfigs'. Anchor ids are `${id}.${key}`. */
  id: string;
  title: string;
  description: string;
  /** Companion `*AllConfig` key whose values apply to every entry, if any. */
  allKey?: string;
  allDescription?: string;
  /** 'object' for single sections, 'array' for config lists. */
  shape: 'object' | 'array';
  properties: PropertyDoc[];
}

export interface TopLevelKeyDoc {
  key: string;
  description: string;
  rules: string[];
  defaultText: string;
  /** Present when a detail section page exists for this key. */
  sectionId?: string;
  allKey?: string;
  allDescription?: string;
  allRules?: string[];
  allDefaultText?: string;
}

export interface ConfigReferenceModel {
  topLevel: TopLevelKeyDoc[];
  sections: SectionDoc[];
}

export interface ConfigReferenceResult {
  model: ConfigReferenceModel;
  /** Cross-source key mismatches; non-empty means the docs sources are out of sync. */
  integrityErrors: string[];
}

// --- Section descriptors -----------------------------------------------------

interface SectionSource {
  id: string;
  title: string;
  regularDefaults: Defaults;
  conditionalDefaults?: ConditionalDefaults;
  validators: ValidatorMap;
  docs: DocsModule;
}

function getSectionSources(): SectionSource[] {
  return [
    { id: 'animationConfig', title: 'Animation Config', regularDefaults: getAnimationDefaults(), validators: getAnimationValidators(), docs: animationDocs },
    { id: 'chartConfig', title: 'Chart Config', regularDefaults: getChartDefaults(), validators: getChartValidators(), docs: chartDocs },
    { id: 'colorPaletteConfig', title: 'Color Palette Config', regularDefaults: getColorPaletteDefaults(), validators: getColorPaletteValidators(), docs: colorPaletteDocs },
    { id: 'crosshairConfig', title: 'Crosshair Config', regularDefaults: getCrosshairDefaults(), validators: getCrosshairValidators(), docs: crosshairDocs },
    { id: 'groupAxisConfig', title: 'Group Axis Config', regularDefaults: getGroupAxisRegularDefaults(), conditionalDefaults: getGroupAxisConditionalDefaults({} as GroupAxisConfig, false, false), validators: getGroupAxisValidators({}), docs: groupAxisDocs },
    { id: 'legendConfig', title: 'Legend Config', regularDefaults: getLegendRegularDefaults(), conditionalDefaults: getLegendConditionalDefaults({} as LegendConfig, 0), validators: getLegendValidators(), docs: legendDocs },
    { id: 'linearGradientConfigs', title: 'Linear Gradient Config', regularDefaults: getLinearGradientRegularDefaults(), conditionalDefaults: getLinearGradientConditionalDefaults({} as LinearGradientConfig, 0), validators: getLinearGradientValidators(), docs: linearGradientDocs },
    { id: 'pieConfig', title: 'Pie Config', regularDefaults: getPieRegularDefaults(), conditionalDefaults: getPieConditionalDefaults({} as PieConfig), validators: getPieValidators(), docs: pieDocs },
    { id: 'plotConfig', title: 'Plot Config', regularDefaults: getPlotDefaults(), validators: getPlotValidators(), docs: plotDocs },
    { id: 'radialGradientConfigs', title: 'Radial Gradient Config', regularDefaults: getRadialGradientRegularDefaults(), conditionalDefaults: getRadialGradientConditionalDefaults({} as RadialGradientConfig, 0), validators: getRadialGradientValidators(), docs: radialGradientDocs },
    { id: 'seriesAxisConfigs', title: 'Series Axis Config', regularDefaults: getSeriesAxisRegularDefaults(), conditionalDefaults: getSeriesAxisConditionalDefaults({} as SeriesAxisConfig, 0, false, false), validators: getSeriesAxisValidators(), docs: seriesAxisDocs },
    { id: 'seriesConfigs', title: 'Series Config', regularDefaults: getSeriesRegularDefaults(), conditionalDefaults: getSeriesConditionalDefaults({} as SeriesConfig, 0, null, null, null, null), validators: getSeriesValidators({}), docs: seriesDocs },
    { id: 'seriesGroupConfigs', title: 'Series Group Config', regularDefaults: getSeriesGroupRegularDefaults(), conditionalDefaults: getSeriesGroupConditionalDefaults({} as SeriesGroupConfig, 0), validators: getSeriesGroupValidators(), docs: seriesGroupDocs },
    { id: 'seriesStackConfigs', title: 'Series Stack Config', regularDefaults: getSeriesStackRegularDefaults(), conditionalDefaults: getSeriesStackConditionalDefaults({} as SeriesStackConfig, 0, null), validators: getSeriesStackValidators(), docs: seriesStackDocs },
    { id: 'titleConfig', title: 'Title Config', regularDefaults: getTitleDefaults(), validators: getTitleValidators(), docs: titleDocs },
    { id: 'tooltipConfig', title: 'Tooltip Config', regularDefaults: getTooltipRegularDefaults(), conditionalDefaults: getTooltipConditionalDefaults({} as TooltipConfig, false), validators: getTooltipValidators(), docs: tooltipDocs }
  ];
}

// Properties that intentionally have no default (they must be set by the user).
const missingDefaultWhitelist: Record<string, Record<string, boolean>> = {
  groupAxisConfig: {
    property: true
  },
  linearGradientConfigs: {
    stops: true
  },
  radialGradientConfigs: {
    stops: true
  },
  seriesConfigs: {
    property: true
  }
};

// --- Integrity checks --------------------------------------------------------

function arrayEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((ae, i) => ae === b[i]);
}

const noChange = {
  hasChanges: false,
  added: [] as string[],
  removed: [] as string[]
};

function getAddedRemoved(a: Defaults, b: Defaults, whitelist: Record<string, boolean> = {}) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (arrayEqual([...aKeys].sort(), [...bKeys].sort())) {
    return noChange;
  }
  const added: string[] = [];
  const removed: string[] = [];
  for (let aKey of aKeys) {
    if (b[aKey] === undefined && whitelist[aKey] !== true) {
      removed.push(aKey);
    }
  }
  for (let bKey of bKeys) {
    if (a[bKey] === undefined) {
      added.push(bKey);
    }
  }
  return {
    hasChanges: added.length > 0 || removed.length > 0,
    added,
    removed
  };
}

function checkKeyIntegrity(section: SectionSource, errors: string[]) {
  const { id, validators } = section;
  const defaults = { ...section.regularDefaults, ...section.conditionalDefaults };
  const descriptions = section.docs.default();
  const details = section.docs.getDetails ? section.docs.getDetails() : {};

  const defaultDiff = getAddedRemoved(validators, defaults, missingDefaultWhitelist[id]);
  if (defaultDiff.hasChanges) {
    errors.push(`${id}: defaults and validators have different keys (missing default: ${JSON.stringify(defaultDiff.removed)}, missing validator: ${JSON.stringify(defaultDiff.added)})`);
  }
  const descriptionDiff = getAddedRemoved(validators, descriptions);
  if (descriptionDiff.hasChanges) {
    errors.push(`${id}: descriptions and validators have different keys (missing description: ${JSON.stringify(descriptionDiff.removed)}, missing validator: ${JSON.stringify(descriptionDiff.added)})`);
  }
  for (let detailKey of Object.keys(details)) {
    if (validators[detailKey] === undefined) {
      errors.push(`${id}: details entry '${detailKey}' has no matching validator`);
    }
  }
}

// --- Default value formatting ------------------------------------------------

const colorValidator = validators.color();

function isColor(value: unknown): value is string {
  return colorValidator(value) === true;
}

function isColorArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && !value.some(aValue => !isColor(aValue));
}

function formatLiteral(value: unknown): string {
  if (value === undefined) {
    return '';
  }
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'string') {
    return '"' + value + '"';
  }
  if (Array.isArray(value)) {
    return '[' + value.map(formatLiteral).join(', ') + ']';
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return '{ ' + Object.keys(record).map(key => key + ': ' + formatLiteral(record[key])).join(', ') + ' }';
  }
  return String(value);
}

export function formatDefaultValue(value: unknown): DefaultValue {
  if (value === undefined) {
    return { kind: 'none' };
  }
  if (isColor(value)) {
    return { kind: 'color', color: value };
  }
  if (isColorArray(value)) {
    return { kind: 'colors', colors: value };
  }
  return { kind: 'literal', text: formatLiteral(value) };
}

function formatConditionalDefaults(conditionalDefault: { rules?: AnyRule[] }): ConditionalDefaultValue[] {
  return (conditionalDefault.rules ?? []).filter(rule => rule.suffix !== null).map(rule => ({
    value: rule.defaultText ? { kind: 'literal', text: rule.defaultText } as DefaultValue : formatDefaultValue(rule.default),
    condition: rule.suffix as string
  }));
}

// --- Section-level validation messages --------------------------------------

function safeAdd(map: Record<string, string[]>, key: string, value: string) {
  let theArray = map[key];
  if (!theArray) {
    map[key] = theArray = [];
  }
  theArray.push(value);
}

function getSectionKeyRules(sectionValidator: SectionValidatorInfo): Record<string, string[]> {
  const sectionKeyRules: Record<string, string[]> = {};
  if (sectionValidator.uniqueKeys) {
    sectionValidator.uniqueKeys.forEach(uniqueKey => {
      safeAdd(sectionKeyRules, uniqueKey, getUniqueMessage());
    });
  }
  const references = sectionValidator.references;
  if (references) {
    Object.keys(references).forEach(referenceKey => {
      const reference = references[referenceKey]!;
      safeAdd(sectionKeyRules, referenceKey, getReferenceMessage(reference.section, reference.key));
    });
  }
  const commonReferences = sectionValidator.commonReferences;
  if (commonReferences) {
    Object.keys(commonReferences).forEach(commonReferenceKey => {
      const commonReference = commonReferences[commonReferenceKey]!;
      safeAdd(sectionKeyRules, commonReferenceKey, getCommonReferenceMessage(
        commonReference.section, commonReference.key, commonReference.commonKey!));
    });
  }
  return sectionKeyRules;
}

function getPropertyRules(validator: Validator, sectionRules: string[] | undefined): string[] {
  const rules = validator.errorMessages.filter(message => message !== 'should be any value');
  return sectionRules && sectionRules.length > 0 ? rules.concat(sectionRules) : rules;
}

// --- Model assembly ----------------------------------------------------------

function getShapeDefaultText(validator: Validator): string {
  if (validator.validatorName === 'object') {
    return '{}';
  }
  if (validator.validatorName === 'arrayOf') {
    return '[]';
  }
  return '';
}

function buildSectionDoc(source: SectionSource, sectionValidators: SectionValidatorMap): SectionDoc {
  const sectionDescriptions: Descriptions = getSectionDescriptions();
  const descriptions = source.docs.default();
  const details = source.docs.getDetails ? source.docs.getDetails() : {};
  const sectionValidator = sectionValidators[source.id];
  const sectionKeyRules = getSectionKeyRules(sectionValidator);
  const allKey = sectionKeyAllMap[source.id];

  const properties = Object.keys(source.validators).sort().map(key => {
    const property: PropertyDoc = {
      key,
      description: descriptions[key],
      rules: getPropertyRules(source.validators[key], sectionKeyRules[key])
    };
    if (details[key] !== undefined) {
      property.details = details[key];
    }
    const conditionalDefault = source.conditionalDefaults?.[key];
    if (conditionalDefault) {
      property.conditionalDefaults = formatConditionalDefaults(conditionalDefault);
    }
    else {
      property.default = formatDefaultValue(source.regularDefaults[key]);
    }
    return property;
  });

  const section: SectionDoc = {
    id: source.id,
    title: source.title,
    description: sectionDescriptions[source.id],
    shape: sectionValidator.validator.validatorName === 'arrayOf' ? 'array' : 'object',
    properties
  };
  if (allKey) {
    section.allKey = allKey;
    section.allDescription = sectionDescriptions[allKey];
  }
  return section;
}

function buildTopLevel(sectionIds: Set<string>): TopLevelKeyDoc[] {
  const sectionValidators = mochartConfigSectionValidators as SectionValidatorMap;
  const sectionDescriptions: Descriptions = getSectionDescriptions();
  return Object.keys(sectionValidators).sort().map(key => {
    const validator = sectionValidators[key].validator;
    const doc: TopLevelKeyDoc = {
      key,
      description: sectionDescriptions[key],
      rules: [validator.errorMessage],
      defaultText: getShapeDefaultText(validator)
    };
    if (sectionIds.has(key)) {
      doc.sectionId = key;
    }
    const allKey = sectionKeyAllMap[key];
    if (allKey) {
      doc.allKey = allKey;
      doc.allDescription = sectionDescriptions[allKey];
      doc.allRules = [allValidator.errorMessage];
      doc.allDefaultText = getShapeDefaultText(allValidator);
    }
    return doc;
  });
}

export function buildConfigReference(): ConfigReferenceResult {
  const integrityErrors: string[] = [];
  const sources = getSectionSources();
  const sectionValidators = mochartConfigSectionValidators as SectionValidatorMap;
  for (let source of sources) {
    checkKeyIntegrity(source, integrityErrors);
  }
  const sections = sources.map(source => buildSectionDoc(source, sectionValidators));
  const topLevel = buildTopLevel(new Set(sections.map(section => section.id)));
  return {
    model: { topLevel, sections },
    integrityErrors
  };
}
