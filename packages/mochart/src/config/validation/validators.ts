import validators from '@mochart/movalid';
import { NONE, MARGIN_KEYS, PADDING_KEYS, COLOR_CURRENT } from '../core/constants';

const dashArrayRegexp = /(\d+)(,\s*\d+)*/;

// specified by d3, https://github.com/d3/d3-format/blob/master/src/formatSpecifier.js
// Transcribed verbatim from d3's formatSpecifier so the two stay diff-able; the
// escapes are redundant inside a character class but are not ours to re-derive.
// eslint-disable-next-line no-useless-escape
const numberFormatRegexp = /^(?:(.)?([<>=^]))?([+\-\( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?([a-z%])?$/i;

// 'currentColor' is accepted here and only here: an svg color is written
// straight to a dom attribute, so the browser resolves it against the host
// page's css color. The bare validators.color() used for the series color
// scale bounds (colorMin/colorMax/colorBase*) must stay strict - those values
// are handed to d3 scale ranges and a keyword would interpolate to NaN.
const svgColorValidator = validators.color().orOneOf(['none', COLOR_CURRENT]).withCustomName('svgColor').withMessage('should be a valid svg color (or "none" / "currentColor")');

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
const propertyRequired = () => validators.notOneOf([undefined, NONE]).withCustomName('propertyRequired').withMessage('should be a defined value');
const propertyOptional = () => validators.notEqual(undefined).orEqual(NONE).withCustomName('propertyOptional').withMessage('should be a defined value or equal to null');
const margin = () => validators.objectWith(MARGIN_KEYS, validators.numberMin(0));
const padding = () => validators.objectWith(PADDING_KEYS, validators.numberMin(0));
const style = () => validators.objectWithShape(styleKeyMap);
const opacity = () => validators.numberMinMax(0, 1);
const svgColor = () => svgColorValidator;

// Object.assign (not object spread) so TypeScript keeps the keys of movalid's
// mapped Validators type — spreading it into a literal collapses them.
const configValidators = Object.assign({}, validators, {
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
});

export default configValidators;