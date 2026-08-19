import validators from './validators';
import { createStyleValidators, lineMembers, styleMembers } from './styleStateValidators';

import {
  AUTO, NONE, RENDERERS, CURVE_TYPES, CAP_TYPES, LABEL_POSITIONS, COLOR_INTERPOLATIONS, MARKER_SHAPES, MARKER_SIZE_SCALES,
  COLOR_SERIES, COLOR_SAME, COLOR_SERIES_INDEX, COLOR_CATEGORY_INDEX, MISSING_VALUES, RENDERER_AREA, RENDERER_BAR
} from '../core/constants';
import type { DeepPartial, SeriesConfig } from '../../types/config';
import type { Validator } from '@mochart/movalid';

type ColorCondition = { colorProperty?: SeriesConfig['colorProperty'], colorScale?: DeepPartial<SeriesConfig['colorScale']> };
type StackCondition = Pick<SeriesConfig, 'stack'>;
type GradientCondition = Pick<SeriesConfig, 'gradient'>;
type RendererCondition = Pick<SeriesConfig, 'renderer'>;
type PatternCondition = Pick<SeriesConfig, 'renderer' | 'gradient'>;

function seriesColor(allowSeries: boolean, allowSame: boolean): Validator {
  const keywords: string[] = [];
  if (allowSeries) keywords.push(COLOR_SERIES);
  if (allowSame) keywords.push(COLOR_SAME);
  keywords.push(COLOR_SERIES_INDEX, COLOR_CATEGORY_INDEX);
  return validators.svgColor().orOneOf(keywords);
}

// shapeStyle defines the series colour itself, so it cannot reference it with 'series'
const seriesStyle = createStyleValidators(allowSame => seriesColor(true, allowSame));
const ownStyle = createStyleValidators(allowSame => seriesColor(false, allowSame));

const stackSuffix = 'when stack is not ' + NONE;
const stackNoneSuffix = 'when stack is ' + NONE;

const colorPropertySuffix = 'when colorProperty is not ' + NONE;
const colorPropertyNoneSuffix = 'when colorProperty is ' + NONE;
const colorBaseSuffix = 'when colorProperty is not ' + NONE + ' and colorScale.base.value is not ' + NONE;
const colorBaseNoneSuffix = 'when colorProperty is not ' + NONE + ' and colorScale.base.value is ' + NONE;

const stackRule = { condition: ({ stack }: StackCondition) => stack !== NONE, suffix: stackSuffix };
const stackNoneRule = { condition: ({ stack }: StackCondition) => stack === NONE, suffix: stackNoneSuffix };
const gradientRule = { condition: ({ gradient }: GradientCondition) => gradient !== NONE, suffix: 'when gradient is not ' + NONE };
const colorPropertyRule = { condition: ({ colorProperty }: ColorCondition) => colorProperty !== NONE, suffix: colorPropertySuffix };
const colorPropertyNoneRule = { condition: ({ colorProperty }: ColorCondition) => colorProperty === NONE, suffix: colorPropertyNoneSuffix };
const colorBaseRule = { condition: ({ colorProperty, colorScale }: ColorCondition) => colorProperty !== NONE && colorScale?.base?.value !== NONE, suffix: colorBaseSuffix };
const colorBaseNoneRule = { condition: ({ colorProperty, colorScale }: ColorCondition) => colorProperty !== NONE && colorScale?.base?.value === NONE, suffix: colorBaseNoneSuffix };

// The label placement bounds applied to one side of the base ("auto" falls back to the plain label setting).
const labelBaseSideValidators = () => validators.partialObjectWithShape({
  minPositionFraction: validators.numberMinMax(0, 1).orOneOf([NONE, AUTO]),
  maxPositionFraction: validators.numberMinMax(0, 1).orOneOf([NONE, AUTO]),
  offset: validators.number().orEqual(AUTO),
  position: validators.oneOf([AUTO].concat(LABEL_POSITIONS))
}, true);

export default function getValidators(config: DeepPartial<SeriesConfig>, pieMode = false) {
  const supportsFill = ({ renderer }: RendererCondition) =>
    pieMode || renderer === RENDERER_AREA || renderer === RENDERER_BAR;
  const nonFillRendererRule = {
    condition: (condition: RendererCondition) => !supportsFill(condition),
    suffix: 'when chart type is not pie and renderer is not area or bar'
  };
  const fillRendererRule = {
    condition: supportsFill,
    suffix: 'when chart type is pie or renderer is area or bar'
  };
  const fillRendererWithoutGradientRule = {
    condition: (condition: PatternCondition) => supportsFill(condition) && condition.gradient === NONE,
    suffix: 'when chart type is pie or renderer is area or bar, and gradient is ' + NONE
  };
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
    allowAbsentDataProperties: validators.boolean(),
    ignore: validators.boolean(),
    renderer: validators.oneOf(RENDERERS),
    missingValues: validators.oneOf(MISSING_VALUES),
    partialRangeIsMissing: validators.boolean(),
    // partial: curve deep-merges over its default, so { param } alone is valid; extras warn via the unknown-key walk
    curve: validators.partialObjectWithShape({
      type: validators.oneOf(CURVE_TYPES),
      param: validators.numberMinMax(0, 1)
    }, true),
    bar: validators.partialObjectWithShape({
      widthFraction: validators.numberMinMax(0, 1),
      alignFraction: validators.numberMinMax(0, 1),
      minExtent: validators.numberMin(0)
    }, true),
    cap: validators.partialObjectWithShape({
      size: validators.numberMin(0),
      type: validators.oneOf(CAP_TYPES).orEqual(NONE),
      expand: validators.boolean(),
      onlyStackOuter: validators.boolean()
    }, true),
    errorBar: validators.partialObjectWithShape({
      capSize: validators.numberMin(0),
      style: seriesStyle.styleStates(lineMembers)
    }, true),
    valueLabel: validators.string().orEqual(NONE),
    valueFormat: validators.numberFormat().orOneOf([NONE, AUTO]),
    valuePrefix: validators.string().orEqual(NONE),
    valueSuffix: validators.string().orEqual(NONE),
    useTitleForValueLabel: validators.boolean(),
    title: validators.string().orEqual(NONE),
    shapeStyle: ownStyle.styleStates(styleMembers),
    label: validators.partialObjectWithShape({
      format: validators.numberFormat().orOneOf([NONE, AUTO]),
      prefix: validators.string().orEqual(NONE),
      suffix: validators.string().orEqual(NONE),
      textStyle: seriesStyle.styleStates(styleMembers),
      minPositionFraction: validators.numberMinMax(0, 1).orEqual(NONE),
      maxPositionFraction: validators.numberMinMax(0, 1).orEqual(NONE),
      minRangeFraction: validators.numberMinMax(0, 1).orEqual(NONE),
      offset: validators.number(),
      position: validators.oneOf(LABEL_POSITIONS),
      aboveBase: labelBaseSideValidators(),
      belowBase: labelBaseSideValidators()
    }, true),
    gradient: validators.conditional([
      { ...nonFillRendererRule, validator: validators.equal(NONE) },
      { ...colorPropertyRule, validator: validators.equal(NONE) },
      { ...fillRendererRule, validator: validators.string().orEqual(NONE) }
    ], config),
    pattern: validators.conditional([
      { ...nonFillRendererRule, validator: validators.equal(NONE) },
      { ...gradientRule, validator: validators.equal(NONE) },
      { ...fillRendererWithoutGradientRule, validator: validators.string().orEqual(NONE) }
    ], config),
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
      missing: validators.conditional([
        { ...colorPropertyNoneRule, validator: validators.equal(NONE) },
        { ...colorPropertyRule, validator: validators.color().orEqual(NONE) },
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
    marker: validators.partialObjectWithShape({
      shape: validators.oneOf([NONE, ...MARKER_SHAPES]),
      minSize: validators.numberMin(0),
      showForMissingValues: validators.boolean(),
      size: validators.numberMin(0),
      sizeScale: validators.oneOf(MARKER_SIZE_SCALES),
      style: seriesStyle.styleStates(styleMembers)
    }, true),
    showInLegend: validators.boolean(),
    showInTooltip: validators.boolean(),
    showColorInLegend: validators.boolean(),
    showColorInTooltip: validators.boolean(),
    filterable: validators.boolean(),
    followSeries: validators.string().orEqual(NONE),
    focusOnMouseOver: validators.boolean(),
    focusOnClick: validators.boolean(),
    focusCategoryOnMouseOver: validators.boolean(),
    focusCategoryOnClick: validators.boolean(),
    showPointer: validators.boolean(),
    useAxisFocus: validators.boolean(),
    animateBaseFromAdjacent: validators.boolean()
  };
}
