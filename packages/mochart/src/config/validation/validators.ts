import validators from '@mochart/movalid';
import type { Validator } from '@mochart/movalid';
import { NONE, MARGIN_KEYS, PADDING_KEYS, COLOR_CURRENT } from '../core/constants';

const dashArrayRegexp = /^(\d+)([,\s]\s*\d+)*$/;

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

// The tooltip's colors become css declarations, where 'none' is not a color at all: it would be dropped
// as an invalid declaration and leave the property inheriting, so it is rejected rather than accepted.
const cssColorValidator = validators.color().orEqual(COLOR_CURRENT).withCustomName('cssColor').withMessage('should be a valid css color (or "currentColor")');

const opacityValidator = validators.numberMinMax(0, 1).orEqual(NONE);
const strokeWidthValidator = validators.numberMin(0).orEqual(NONE);

const styleKeyMap = {
  strokeColor: svgColorValidator.orEqual(NONE),
  strokeOpacity: opacityValidator,
  fillColor: svgColorValidator.orEqual(NONE),
  fillOpacity: opacityValidator,
  strokeWidth: strokeWidthValidator,
  strokeDashArray: validators.regexp(dashArrayRegexp).withCustomName('dashArray').withMessage('should be a valid dash array').orEqual(NONE)
};

const cssStyleKeyMap = {
  strokeColor: cssColorValidator.orEqual(NONE),
  strokeOpacity: opacityValidator,
  fillColor: cssColorValidator.orEqual(NONE),
  fillOpacity: opacityValidator,
  strokeWidth: strokeWidthValidator
};

const dashArray = () => validators.regexp(dashArrayRegexp).withCustomName('dashArray').withMessage('should be a valid dash array');
const numberFormat = () => validators.regexp(numberFormatRegexp).withCustomName('numberFormat').withMessage('should be a valid number format');
const dateFormat = () => validators.string().withCustomName('dateFormat').withMessage('should be a valid date format');
const propertyRequired = () => validators.notOneOf([undefined, NONE]).withCustomName('propertyRequired').withMessage('should be a defined value');
const propertyOptional = () => validators.notEqual(undefined).orEqual(NONE).withCustomName('propertyOptional').withMessage('should be a defined value or equal to null');
// Partial like every nested config (deep-merged over its default); extras pass for the unknown-key walk.
const partialObjectWith = (keys: string[], valueValidator: Validator): Validator => {
  const shape: Record<string, Validator> = {};
  for (const key of keys) {
    shape[key] = valueValidator;
  }
  return validators.partialObjectWithShape(shape, true);
};
const margin = () => partialObjectWith(MARGIN_KEYS, validators.numberMin(0));
const padding = () => partialObjectWith(PADDING_KEYS, validators.numberMin(0));
// Partial (a style is deep-merged over its default), and extra members pass so that an unknown member
// is reported once by the unknown-key walk rather than as an error as well.
const style = () => validators.partialObjectWithShape(styleKeyMap, true);
const cssStyle = () => validators.partialObjectWithShape(cssStyleKeyMap, true);
const strokeStyle = () => validators.partialObjectWithShape({
  strokeColor: styleKeyMap.strokeColor,
  strokeOpacity: styleKeyMap.strokeOpacity,
  strokeWidth: styleKeyMap.strokeWidth,
  strokeDashArray: styleKeyMap.strokeDashArray
}, true);
const opacity = () => validators.numberMinMax(0, 1);
const svgColor = () => svgColorValidator;
const cssColor = () => cssColorValidator;

// Object.assign (not object spread) so TypeScript keeps the keys of movalid's
// mapped Validators type — spreading it into a literal collapses them.
const configValidators = Object.assign({}, validators, {
  dashArray,
  numberFormat,
  dateFormat,
  propertyRequired,
  propertyOptional,
  partialObjectWith,
  margin,
  padding,
  style,
  cssStyle,
  strokeStyle,
  opacity,
  svgColor,
  cssColor
});

export default configValidators;