import validators from './validators';

import {
  AUTO, NONE, RENDERERS, CURVE_TYPES, CAP_TYPES, LABEL_POSITIONS, COLOR_INTERPOLATIONS, MARKER_SHAPES,
  COLOR_SERIES, COLOR_SAME, COLOR_SERIES_INDEX, COLOR_GROUP_INDEX
} from '../core/constants';
import type { DeepPartial, SeriesConfig } from '../../types/config';
import type { Validator } from '@mochart/movalid';

type ColorCondition = { colorProperty?: SeriesConfig['colorProperty'], colorScale?: DeepPartial<SeriesConfig['colorScale']> };
type StackCondition = Pick<SeriesConfig, 'stack'>;

type SeriesStyleMember = 'strokeColor' | 'strokeOpacity' | 'strokeWidth' | 'fillColor' | 'fillOpacity';

const lineMembers: SeriesStyleMember[] = ['strokeColor', 'strokeOpacity', 'strokeWidth'];
const styleMembers: SeriesStyleMember[] = ['strokeColor', 'strokeOpacity', 'strokeWidth', 'fillColor', 'fillOpacity'];

function seriesColor(allowSeries: boolean, allowSame: boolean): Validator {
  const keywords: string[] = [];
  if (allowSeries) keywords.push(COLOR_SERIES);
  if (allowSame) keywords.push(COLOR_SAME);
  keywords.push(COLOR_SERIES_INDEX, COLOR_GROUP_INDEX);
  return validators.svgColor().orOneOf(keywords);
}

function memberValidator(member: SeriesStyleMember, allowSeries: boolean, allowSame: boolean): Validator {
  switch (member) {
    case 'strokeColor':
    case 'fillColor':
      return seriesColor(allowSeries, allowSame);
    case 'strokeOpacity':
    case 'fillOpacity':
      return validators.opacity();
    case 'strokeWidth':
      return validators.numberMin(0);
  }
}

// Partial, and extra members pass: an unknown member is reported once by the unknown-key walk.
function styleShape(members: SeriesStyleMember[], allowSeries: boolean, allowSame: boolean) {
  const shape: Record<string, Validator> = {};
  for (const member of members) {
    shape[member] = memberValidator(member, allowSeries, allowSame);
  }
  return validators.partialObjectWithShape(shape, true);
}

function styleStates(members: SeriesStyleMember[], allowSeries: boolean) {
  return validators.partialObjectWithShape({
    normal: styleShape(members, allowSeries, false),
    focused: styleShape(members, allowSeries, true),
    defocused: styleShape(members, allowSeries, true)
  }, true);
}

const stackSuffix = 'when stack is not ' + NONE;
const stackNoneSuffix = 'when stack is ' + NONE;

const colorPropertySuffix = 'when colorProperty is not ' + NONE;
const colorPropertyNoneSuffix = 'when colorProperty is ' + NONE;
const colorBaseSuffix = 'when colorProperty is not ' + NONE + ' and colorScale.base.value is not ' + NONE;
const colorBaseNoneSuffix = 'when colorProperty is not ' + NONE + ' and colorScale.base.value is ' + NONE;

const stackRule = { condition: ({ stack }: StackCondition) => stack !== NONE, suffix: stackSuffix };
const stackNoneRule = { condition: ({ stack }: StackCondition) => stack === NONE, suffix: stackNoneSuffix };

const colorPropertyRule = { condition: ({ colorProperty }: ColorCondition) => colorProperty !== NONE, suffix: colorPropertySuffix };
const colorPropertyNoneRule = { condition: ({ colorProperty }: ColorCondition) => colorProperty === NONE, suffix: colorPropertyNoneSuffix };
const colorBaseRule = { condition: ({ colorProperty, colorScale }: ColorCondition) => colorProperty !== NONE && colorScale?.base?.value !== NONE, suffix: colorBaseSuffix };
const colorBaseNoneRule = { condition: ({ colorProperty, colorScale }: ColorCondition) => colorProperty !== NONE && colorScale?.base?.value === NONE, suffix: colorBaseNoneSuffix };

export default function getValidators(config: DeepPartial<SeriesConfig>) {
  return {
    id: validators.string(),
    order: validators.integer(),
    axis: validators.string(),
    stack: validators.string().orEqual(NONE),
    group: validators.string().orEqual(NONE),
    property: validators.propertyRequired(),
    rangeProperty: validators.propertyOptional(),
    errorLowProperty: validators.conditional([
      { ...stackRule, validator: validators.equal(NONE) },
      { ...stackNoneRule, validator: validators.propertyOptional() },
    ], config),
    errorHighProperty: validators.conditional([
      { ...stackRule, validator: validators.equal(NONE) },
      { ...stackNoneRule, validator: validators.propertyOptional() },
    ], config),
    markerProperty: validators.propertyOptional(),
    labelProperty: validators.propertyOptional(),
    tooltipProperty: validators.propertyOptional(),
    colorProperty: validators.propertyOptional(),
    ignore: validators.boolean(),
    renderer: validators.oneOf(RENDERERS),
    skipMissing: validators.boolean(),
    skipPartialRange: validators.boolean(),
    showMissingAtBase: validators.boolean(),
    curve: validators.objectWithShape({
      type: validators.oneOf(CURVE_TYPES),
      param: validators.numberMinMax(0, 1).orEqual(undefined)
    }),
    barWidthFraction: validators.numberMinMax(0, 1),
    barAlignFraction: validators.numberMinMax(0, 1),
    barMinExtent: validators.numberMin(0),
    capSize: validators.numberMin(0),
    capType: validators.oneOf(CAP_TYPES).orEqual(NONE),
    capExpand: validators.boolean(),
    capOnlyStackOuter: validators.boolean(),
    errorBarCapSize: validators.numberMin(0),
    errorBarStyle: styleStates(lineMembers, true),
    valueLabel: validators.string().orEqual(NONE),
    valueFormat: validators.numberFormat().orOneOf([NONE, AUTO]),
    valuePrefix: validators.string().orEqual(NONE),
    valueSuffix: validators.string().orEqual(NONE),
    useTitleForValueLabel: validators.boolean(),
    title: validators.string().orEqual(NONE),
    shapeStyle: styleStates(styleMembers, false),
    labelFormat: validators.numberFormat().orOneOf([NONE, AUTO]),
    labelTextStyle: styleStates(styleMembers, true),
    labelMinPositionFraction: validators.numberMinMax(0, 1).orEqual(NONE),
    labelMaxPositionFraction: validators.numberMinMax(0, 1).orEqual(NONE),
    labelMinRangeFraction: validators.numberMinMax(0, 1).orEqual(NONE),
    labelOffset: validators.number(),
    labelPosition: validators.oneOf(LABEL_POSITIONS),
    labelAboveBaseMinPositionFraction: validators.numberMinMax(0, 1).orOneOf([NONE, AUTO]),
    labelAboveBaseMaxPositionFraction: validators.numberMinMax(0, 1).orOneOf([NONE, AUTO]),
    labelBelowBaseMinPositionFraction: validators.numberMinMax(0, 1).orOneOf([NONE, AUTO]),
    labelBelowBaseMaxPositionFraction: validators.numberMinMax(0, 1).orOneOf([NONE, AUTO]),
    labelAboveBaseOffset: validators.number().orEqual(AUTO),
    labelBelowBaseOffset: validators.number().orEqual(AUTO),
    labelAboveBasePosition: validators.oneOf([AUTO].concat(LABEL_POSITIONS)),
    labelBelowBasePosition: validators.oneOf([AUTO].concat(LABEL_POSITIONS)),
    gradient: validators.string().orEqual(NONE),
    colorScale: validators.partialObjectWithShape({
      interpolation: validators.conditional([
        { ...colorPropertyRule, validator: validators.oneOf(COLOR_INTERPOLATIONS) },
        { ...colorPropertyNoneRule, validator: validators.equal(NONE) }
      ], config),
      min: validators.conditional([
        { ...colorPropertyNoneRule, validator: validators.equal(NONE) },
        { ...colorBaseRule, validator: validators.equal(NONE) },
        { ...colorBaseNoneRule, validator: validators.color() },
      ], config),
      max: validators.conditional([
        { ...colorPropertyNoneRule, validator: validators.equal(NONE) },
        { ...colorBaseRule, validator: validators.equal(NONE) },
        { ...colorBaseNoneRule, validator: validators.color() },
      ], config),
      base: validators.partialObjectWithShape({
        value: validators.number().orEqual(NONE),
        aboveMin: validators.conditional([
          { ...colorPropertyNoneRule, validator: validators.equal(NONE) },
          { ...colorBaseNoneRule, validator: validators.equal(NONE) },
          { ...colorBaseRule, validator: validators.color() },
        ], config),
        aboveMax: validators.conditional([
          { ...colorPropertyNoneRule, validator: validators.equal(NONE) },
          { ...colorBaseNoneRule, validator: validators.equal(NONE) },
          { ...colorBaseRule, validator: validators.color() },
        ], config),
        belowMin: validators.conditional([
          { ...colorPropertyNoneRule, validator: validators.equal(NONE) },
          { ...colorBaseNoneRule, validator: validators.equal(NONE) },
          { ...colorBaseRule, validator: validators.color() },
        ], config),
        belowMax: validators.conditional([
          { ...colorPropertyNoneRule, validator: validators.equal(NONE) },
          { ...colorBaseNoneRule, validator: validators.equal(NONE) },
          { ...colorBaseRule, validator: validators.color() },
        ], config)
      }, true)
    }, true),
    markerShape: validators.oneOf([NONE, ...MARKER_SHAPES]),
    minMarkerSize: validators.numberMin(0),
    markerShowMissing: validators.boolean(),
    markerSize: validators.numberMin(0),
    markerStyle: styleStates(styleMembers, true),
    showInLegend: validators.boolean(),
    showInTooltip: validators.boolean(),
    showColorInLegend: validators.boolean(),
    showColorInTooltip: validators.boolean(),
    suppressible: validators.boolean(),
    followSeries: validators.string().orEqual(NONE),
    focusOnMouseOver: validators.boolean(),
    focusOnClick: validators.boolean(),
    focusGroupOnMouseOver: validators.boolean(),
    focusGroupOnClick: validators.boolean(),
    useAxisFocus: validators.boolean(),
    animateBaseFromAdjacent: validators.boolean()
  };
}
