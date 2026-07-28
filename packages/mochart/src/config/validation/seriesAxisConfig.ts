import validators from './validators';

import { AUTO, NONE, TYPE_NUMBER, SCALE_LINEAR } from '../core/constants';

import getAxisValidators from './axisConfig';

export default function getValidators() {
  return {
    ...getAxisValidators(),

    adjustForSuppression: validators.boolean(),

    adjustTickLabelSizeForSuppression: validators.boolean(),

    alwaysVisible: validators.boolean(),

    base: validators.number().orEqual(NONE),
    baseLine: validators.boolean(),
    baseLineFront: validators.boolean(),
    baseLineWidth: validators.numberMin(0),
    baseLineDashArray: validators.dashArray().orEqual(NONE),
    baseLineColor: validators.svgColor(),
    baseLineFocusedColor: validators.svgColor(),
    baseLineDefocusedColor: validators.svgColor(),
    baseLineOpacity: validators.opacity(),
    baseLineFocusedOpacity: validators.opacity(),
    baseLineDefocusedOpacity: validators.opacity(),

    focusOnMouseOver: validators.boolean(),
    focusOnClick: validators.boolean(),

    id: validators.string(),

    max: validators.number().orEqual(AUTO),
    maxOffset: validators.number(),
    maxMarginPercent: validators.numberMin(0),

    min: validators.number().orEqual(AUTO),
    minOffset: validators.number(),
    minMarginPercent: validators.numberMin(0),

    order: validators.number(),

    scale: validators.equal(SCALE_LINEAR),

    ticks: validators.arrayOf(validators.objectWithShape({
      value: validators.number(),
      label: validators.string().orEqual(undefined)
    }), true).orEqual(NONE),

    softMax: validators.number().orEqual(NONE),
    softMin: validators.number().orEqual(NONE),

    threshold: validators.number().orEqual(NONE),

    tickLabelFormat: validators.numberFormat().orOneOf([NONE, AUTO]),

    type: validators.equal(TYPE_NUMBER),

    useSeriesFocus: validators.boolean()
  };
}