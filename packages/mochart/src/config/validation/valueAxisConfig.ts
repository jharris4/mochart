import validators from './validators';

import { AUTO, NONE, TYPE_NUMBER, SCALE_LINEAR } from '../core/constants';

import getAxisValidators, { axisStyleValidators } from './axisConfig';

export default function getValidators() {
  return {
    ...getAxisValidators(),

    adjustForFiltering: validators.boolean(),

    adjustTickLabelSizeForFiltering: validators.boolean(),

    visibleWhenAllFiltered: validators.boolean(),

    base: validators.number().orEqual(NONE),
    baseLine: validators.boolean(),
    baseLineFront: validators.boolean(),
    baseLineStyle: axisStyleValidators.styleStates(axisStyleValidators.lineMembers),

    focusOnMouseOver: validators.boolean(),
    focusOnClick: validators.boolean(),

    id: validators.string(),

    max: validators.number().orEqual(AUTO),
    maxOffset: validators.number(),
    maxMarginFraction: validators.numberMin(0),

    min: validators.number().orEqual(AUTO),
    minOffset: validators.number(),
    minMarginFraction: validators.numberMin(0),

    order: validators.integer(),

    scale: validators.equal(SCALE_LINEAR),

    ticks: validators.arrayOf(validators.objectWithShape({
      value: validators.number(),
      label: validators.string().orEqual(undefined)
    }), true).orEqual(NONE),

    softMax: validators.number().orEqual(NONE),
    softMin: validators.number().orEqual(NONE),


    tickLabelFormat: validators.numberFormat().orOneOf([NONE, AUTO]),

    type: validators.equal(TYPE_NUMBER),

    useSeriesFocus: validators.boolean()
  };
}