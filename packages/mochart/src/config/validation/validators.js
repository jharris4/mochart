import validators from 'valide';
import { NONE, MARGIN_KEYS, PADDING_KEYS } from '../core/constants';

const dashArrayRegexp = /(\d+)(,\s*\d+)*/;

// specified by d3, https://github.com/d3/d3-format/blob/master/src/formatSpecifier.js
const numberFormatRegexp = /^(?:(.)?([<>=^]))?([+\-\( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?([a-z%])?$/i;

const svgColorValidator = validators.color().orEqual('none').withCustomName('svgColor').withMessage('should be a valid svg color');

const styleKeyMap = {
  stroke: svgColorValidator.orEqual(NONE),
  strokeOpacity: validators.numberMinMax(0, 1).orEqual(NONE),
  fill: svgColorValidator.orEqual(NONE),
  fillOpacity: validators.numberMinMax(0, 1).orEqual(NONE),
  strokeWidth: validators.numberMin(0).orEqual(NONE)
};

const dashArray = () => validators.regexp(dashArrayRegexp).withCustomName('dashArray').withMessage('should be a valid dash array');
const numberFormat = () => validators.regexp(numberFormatRegexp).withCustomName('numberFormat').withMessage('should be a valid number format');
const dateFormat = () => validators.string().withCustomName('dateFormat').withMessage('should be a valid date format');
const propertyRequired = () => validators.notOneOf([void 0, NONE]).withCustomName('propertyRequired').withMessage('should be a defined value');
const propertyOptional = () => validators.notEqual(void 0).orEqual(NONE).withCustomName('propertyOptional').withMessage('should be a defined value or equal to null');
const margin = () => validators.objectWith(MARGIN_KEYS, validators.numberMin(0));
const padding = () => validators.objectWith(PADDING_KEYS, validators.numberMin(0));
const style = () => validators.objectWithShape(styleKeyMap);
const opacity = () => validators.numberMinMax(0, 1);
const svgColor = () => svgColorValidator;

let configValidators = {
  ...validators,
  dashArray,
  numberFormat,
  dateFormat,
  propertyRequired,
  propertyOptional,
  margin,
  padding,
  style,
  opacity,
  svgColor
};

export default configValidators;