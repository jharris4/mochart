import validators from './validators';

import { AUTO, NONE, SCALE_ORDINAL, SCALE_LINEAR, TYPE_STRING, TYPE_NUMBER, TYPE_DATE } from '../core/constants';

import getAxisValidators from './axisConfig';
import type { GroupAxisConfig } from '../../types/config';

type GroupAxisCondition = Pick<GroupAxisConfig, 'type' | 'scale'>;

const typeStringSuffix = 'when type is ' + TYPE_STRING;
const typeDateSuffix = 'when type is ' + TYPE_DATE;
const typeNumberSuffix = 'when type is ' + TYPE_NUMBER;
const scaleOrdinalSuffix = 'when scale is ' + SCALE_ORDINAL;
const scaleLinearSuffix = 'when scale is ' + SCALE_LINEAR;
const linearDateSuffix = 'when scale is ' + SCALE_LINEAR + ' and type is ' + TYPE_DATE;
const linearNumberSuffix = 'when scale is ' + SCALE_LINEAR + ' and type is ' + TYPE_NUMBER;

const typeStringRule = { condition: ({ type }: GroupAxisCondition) => type === TYPE_STRING, suffix: typeStringSuffix };
const typeDateRule = { condition: ({ type }: GroupAxisCondition) => type === TYPE_DATE, suffix: typeDateSuffix };
const typeNumberRule = { condition: ({ type }: GroupAxisCondition) => type === TYPE_NUMBER, suffix: typeNumberSuffix };
const scaleOrdinalRule = { condition: ({ scale }: GroupAxisCondition) => scale === SCALE_ORDINAL, suffix: scaleOrdinalSuffix };
const scaleLinearRule = { condition: ({ scale }: GroupAxisCondition) => scale === SCALE_LINEAR, suffix: scaleLinearSuffix };
const linearDateRule = { condition: ({ scale, type }: GroupAxisCondition) => scale === SCALE_LINEAR && type === TYPE_DATE, suffix: linearDateSuffix };
const linearNumberRule = { condition: ({ scale, type }: GroupAxisCondition) => scale === SCALE_LINEAR && type === TYPE_NUMBER, suffix: linearNumberSuffix };
const defaultRule = { condition: () => true };

export default function getValidators(config: Partial<GroupAxisConfig>) {
  return {
    ...getAxisValidators(),

    dateUTC: validators.boolean(),

    displayProperty: validators.propertyOptional(),

    groupPadding: validators.objectWith(['inner', 'outer'], validators.numberMinMax(0, 1)),
    groupCountPadding: validators.numberMin(0),

    max: validators.conditional([
      { ...linearDateRule, validator: validators.dateAny().orEqual(AUTO) },
      { ...linearNumberRule, validator: validators.number().orEqual(AUTO) },
      { ...scaleOrdinalRule, validator: validators.equal(AUTO) },
      { ...defaultRule, validator: validators.any() }
    ], config),
    maxOffset: validators.conditional([
      { ...scaleLinearRule, validator: validators.number() },
      { ...scaleOrdinalRule, validator: validators.equal(0) },
      { ...defaultRule, validator: validators.any() }
    ], config),

    min: validators.conditional([
      { ...linearDateRule, validator: validators.dateAny().orEqual(AUTO) },
      { ...linearNumberRule, validator: validators.number().orEqual(AUTO) },
      { ...scaleOrdinalRule, validator: validators.equal(AUTO) },
      { ...defaultRule, validator: validators.any() }
    ], config),
    minGroupValueExtent: validators.numberMin(1),
    minOffset: validators.conditional([
      { ...scaleLinearRule, validator: validators.number() },
      { ...scaleOrdinalRule, validator: validators.equal(0) },
      { ...defaultRule, validator: validators.any() }
    ], config),

    property: validators.propertyRequired(),

    scale: validators.conditional([
      { ...typeStringRule, validator: validators.equal(SCALE_ORDINAL) },
      { ...defaultRule, validator: validators.oneOf([SCALE_LINEAR, SCALE_ORDINAL]) }
    ], config),

    softMax: validators.conditional([
      { ...linearDateRule, validator: validators.dateAny().orEqual(NONE) },
      { ...linearNumberRule, validator: validators.number().orEqual(NONE) },
      { ...scaleOrdinalRule, validator: validators.equal(NONE) },
      { ...defaultRule, validator: validators.any() }
    ], config),
    softMin: validators.conditional([
      { ...linearDateRule, validator: validators.dateAny().orEqual(NONE) },
      { ...linearNumberRule, validator: validators.number().orEqual(NONE) },
      { ...scaleOrdinalRule, validator: validators.equal(NONE) },
      { ...defaultRule, validator: validators.any() }
    ], config),
    threshold: validators.conditional([
      { ...linearDateRule, validator: validators.dateAny().orEqual(NONE) },
      { ...linearNumberRule, validator: validators.number().orEqual(NONE) },
      { ...scaleOrdinalRule, validator: validators.equal(NONE) },
      { ...defaultRule, validator: validators.any() }
    ], config),
    tickLabelFormat: validators.conditional([
      { ...typeStringRule, validator: validators.oneOf([NONE, AUTO]) },
      { ...typeDateRule, validator: validators.dateFormat().orOneOf([NONE, AUTO]) },
      { ...typeNumberRule, validator: validators.numberFormat().orOneOf([NONE, AUTO]) },
      { ...defaultRule, validator: validators.any() }
    ], config),
    tickLabelTruncationEnabled: validators.conditional([
      { ...scaleLinearRule, validator: validators.equal(false) },
      { ...defaultRule, validator: validators.boolean() }
    ], config),
    tickLabelTruncationMaxPercent: validators.numberMinMax(0, 1),
    tickLabelTruncationMinLength: validators.numberMin(0),
    tickLabelTruncationValue: validators.string(),

    type: validators.oneOf([TYPE_NUMBER, TYPE_DATE, TYPE_STRING]),

    valueFormat: validators.conditional([
      { ...typeStringRule, validator: validators.oneOf([NONE, AUTO]) },
      { ...typeDateRule, validator: validators.dateFormat().orOneOf([NONE, AUTO]) },
      { ...typeNumberRule, validator: validators.numberFormat().orOneOf([NONE, AUTO]) },
      { ...defaultRule, validator: validators.any() }
    ], config),
    valueLabel: validators.string().orEqual(NONE),
    valuePrefix: validators.string().orEqual(NONE),
    valueSuffix: validators.string().orEqual(NONE)
  };
}
