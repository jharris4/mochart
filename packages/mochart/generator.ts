import {
  configWithoutAllValidators as mochartConfigSectionValidators,
  getUniqueMessage,
  getReferenceMessage,
  getCommonReferenceMessage,
  allValidator
} from './src/config/validation/mochartConfig';
import getSectionDescriptions from './src/config/docs/mochartConfig';
import { sectionKeyAllMap } from './src/config/core/mochartConfig';

import getAnimationDefaults from './src/config/defaults/animationConfig';
import getAnimationValidators from './src/config/validation/animationConfig';
import getAnimationDescriptions from './src/config/docs/animationConfig';

import getChartDefaults from './src/config/defaults/chartConfig';
import getChartValidators from './src/config/validation/chartConfig';
import getChartDescriptions from './src/config/docs/chartConfig';

import getColorPaletteDefaults from './src/config/defaults/colorPaletteConfig';
import getColorPaletteValidators from './src/config/validation/colorPaletteConfig';
import getColorPaletteDescriptions from './src/config/docs/colorPaletteConfig';

import getCrosshairDefaults from './src/config/defaults/crosshairConfig';
import getCrosshairValidators from './src/config/validation/crosshairConfig';
import getCrosshairDescriptions from './src/config/docs/crosshairConfig';

import { getRegularDefaults as getGroupAxisRegularDefaults, getConditionalDefaults as getGroupAxisConditionalDefaults } from './src/config/defaults/groupAxisConfig';
import getGroupAxisValidators from './src/config/validation/groupAxisConfig';
import getGroupAxisDescriptions from './src/config/docs/groupAxisConfig';

import { getRegularDefaults as getLegendRegularDefaults, getConditionalDefaults as getLegendConditionalDefaults } from './src/config/defaults/legendConfig';
import getLegendValidators from './src/config/validation/legendConfig';
import getLegendDescriptions from './src/config/docs/legendConfig';

import { getRegularDefaults as getLinearGradientRegularDefaults, getConditionalDefaults as getLinearGradientConditionalDefaults } from './src/config/defaults/linearGradientConfig';
import getLinearGradientValidators from './src/config/validation/linearGradientConfig';
import getLinearGradientDescriptions from './src/config/docs/linearGradientConfig';

import getPlotDefaults from './src/config/defaults/plotConfig';
import getPlotValidators from './src/config/validation/plotConfig';
import getPlotDescriptions from './src/config/docs/plotConfig';

import { getRegularDefaults as getRadialGradientRegularDefaults, getConditionalDefaults as getRadialGradientConditionalDefaults } from './src/config/defaults/radialGradientConfig';
import getRadialGradientValidators from './src/config/validation/radialGradientConfig';
import getRadialGradientDescriptions from './src/config/docs/radialGradientConfig';

import { getRegularDefaults as getSeriesAxisRegularDefaults, getConditionalDefaults as getSeriesAxisConditionalDefaults } from './src/config/defaults/seriesAxisConfig';
import getSeriesAxisValidators from './src/config/validation/seriesAxisConfig';
import getSeriesAxisDescriptions from './src/config/docs/seriesAxisConfig';

import { getRegularDefaults as getSeriesRegularDefaults, getConditionalDefaults as getSeriesConditionalDefaults } from './src/config/defaults/seriesConfig';
import getSeriesValidators from './src/config/validation/seriesConfig';
import getSeriesDescriptions from './src/config/docs/seriesConfig';

import { getRegularDefaults as getSeriesGroupRegularDefaults, getConditionalDefaults as getSeriesGroupConditionalDefaults } from './src/config/defaults/seriesGroupConfig';
import getSeriesGroupValidators from './src/config/validation/seriesGroupConfig';
import getSeriesGroupDescriptions from './src/config/docs/seriesGroupConfig';

import { getRegularDefaults as getSeriesStackRegularDefaults, getConditionalDefaults as getSeriesStackConditionalDefaults } from './src/config/defaults/seriesStackConfig';
import getSeriesStackValidators from './src/config/validation/seriesStackConfig';
import getSeriesStackDescriptions from './src/config/docs/seriesStackConfig';

import getTitleDefaults from './src/config/defaults/titleConfig';
import getTitleValidators from './src/config/validation/titleConfig';
import getTitleDescriptions from './src/config/docs/titleConfig';

import getTooltipDefaults from './src/config/defaults/tooltipConfig';
import getTooltipValidators from './src/config/validation/tooltipConfig';
import getTooltipDescriptions from './src/config/docs/tooltipConfig';

import validators from 'movalid';

import fs from 'fs';
import path from 'path';

function generateDocs(filename) {

  const dir = path.dirname(filename);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  const stream = fs.createWriteStream(filename);
  stream.once('open', function (fd) {
    generateHeader(stream);
    generateAllSectionDocs(stream);
    generateSectionDocs(stream, 'Animation Config', 'animationConfig', getAnimationDefaults(), getAnimationValidators(), getAnimationDescriptions(), mochartConfigSectionValidators.animationConfig);
    generateSectionDocs(stream, 'Chart Config', 'chartConfig', getChartDefaults(), getChartValidators(), getChartDescriptions(), mochartConfigSectionValidators.chartConfig);
    generateSectionDocs(stream, 'Color Palette Config', 'colorPaletteConfig', getColorPaletteDefaults(), getColorPaletteValidators(), getColorPaletteDescriptions(), mochartConfigSectionValidators.colorPaletteConfig);
    generateSectionDocs(stream, 'Crosshair Config', 'crosshairConfig', getCrosshairDefaults(), getCrosshairValidators(), getCrosshairDescriptions(), mochartConfigSectionValidators.crosshairConfig);
    generateConditionalSectionDocs(stream, 'Group Axis Config', 'groupAxisConfig', getGroupAxisRegularDefaults(), getGroupAxisConditionalDefaults(), getGroupAxisValidators({}), getGroupAxisDescriptions(), mochartConfigSectionValidators.groupAxisConfig);
    generateConditionalSectionDocs(stream, 'Legend Config', 'legendConfig', getLegendRegularDefaults(), getLegendConditionalDefaults(), getLegendValidators(), getLegendDescriptions(), mochartConfigSectionValidators.legendConfig);
    generateConditionalSectionDocs(stream, 'Linear Gradient Config', 'linearGradientConfigs', getLinearGradientRegularDefaults(), getLinearGradientConditionalDefaults(), getLinearGradientValidators(), getLinearGradientDescriptions(), mochartConfigSectionValidators.linearGradientConfigs);
    generateSectionDocs(stream, 'Plot Config', 'plotConfig', getPlotDefaults(), getPlotValidators(), getPlotDescriptions(), mochartConfigSectionValidators.plotConfig);
    generateConditionalSectionDocs(stream, 'Radial Gradient Config', 'radialGradientConfigs', getRadialGradientRegularDefaults(), getRadialGradientConditionalDefaults(), getRadialGradientValidators(), getRadialGradientDescriptions(), mochartConfigSectionValidators.radialGradientConfigs);
    generateConditionalSectionDocs(stream, 'Series Axis Config', 'seriesAxisConfigs', getSeriesAxisRegularDefaults(), getSeriesAxisConditionalDefaults(), getSeriesAxisValidators({}), getSeriesAxisDescriptions(), mochartConfigSectionValidators.seriesAxisConfigs);
    generateConditionalSectionDocs(stream, 'Series Config', 'seriesConfigs', getSeriesRegularDefaults(), getSeriesConditionalDefaults(), getSeriesValidators({}), getSeriesDescriptions(), mochartConfigSectionValidators.seriesConfigs);
    generateConditionalSectionDocs(stream, 'Series Group Config', 'seriesGroupConfigs', getSeriesGroupRegularDefaults(), getSeriesGroupConditionalDefaults(), getSeriesGroupValidators(), getSeriesGroupDescriptions(), mochartConfigSectionValidators.seriesGroupConfigs);
    generateConditionalSectionDocs(stream, 'Series Stack Config', 'seriesStackConfigs', getSeriesStackRegularDefaults(), getSeriesStackConditionalDefaults(), getSeriesStackValidators(), getSeriesStackDescriptions(), mochartConfigSectionValidators.seriesStackConfigs);
    generateSectionDocs(stream, 'Title Config', 'titleConfig', getTitleDefaults(), getTitleValidators(), getTitleDescriptions(), mochartConfigSectionValidators.titleConfig);
    generateSectionDocs(stream, 'Tooltip Config', 'tooltipConfig', getTooltipDefaults(), getTooltipValidators(), getTooltipDescriptions(), mochartConfigSectionValidators.tooltipConfig);
    generateFooter(stream);
    stream.end();
  });

  stream.on('finish', () => {
    
  });
}

function generateHeader(stream) {
  stream.write('<html>\n');
  stream.write('<head>\n');
  stream.write('<title>Mochart Config Docs</title>\n');
  stream.write('<style>\n');
  stream.write('table { border-collapse: collapse !important; }\n');
  stream.write('table th { text-align: left; }\n');
  stream.write('table td, table th { background-color: #fff !important; border: 1px solid #eceeef !important; padding: .75rem; vertical-align: top; }\n');
  stream.write('table thead th { vertical-align: bottom; border-bottom: 2px solid #eceeef; }\n');
  stream.write('table thead td { border-bottom-width: 2px; }\n');
  stream.write('.colorIcon { display: inline-block; vertical-align: middle; width: 8px; height: 8px; border: 2px solid #eceeef; }\n');
  stream.write('</style>\n');
  stream.write('</head>\n');
  stream.write('<body>\n');
}

function generateFooter(stream) {
  stream.write('</body>\n');
  stream.write('</html>');
}

function generateAllSectionDocs(stream) {
  stream.write('<div>\n');
  stream.write('<h2>' + 'Mochart Config' + '</h2>\n');
  generateAllKeyHeader(stream);
  const sectionKeys = Object.keys(mochartConfigSectionValidators).sort();
  const sectionDescriptions = getSectionDescriptions();
  for (let sectionKey of sectionKeys) {
    generateKeySectionDocs(stream, sectionKey, sectionDescriptions, mochartConfigSectionValidators);
  }
  generateAllKeyFooter(stream);
  stream.write('</div>\n');
}

function generateAllKeyHeader(stream) {
  stream.write('<table>\n');
  stream.write('<thead>\n');
  stream.write('<tr>\n');
  generateTags(stream, 'th', ['Property', 'Description', 'Validation Rules', 'Default', 'Details']);
  stream.write('</tr>\n');
  stream.write('</thead>\n');
}

function generateAllKeyFooter(stream) {
  stream.write('</table>\n')
}

function generateKeySectionDocs(stream, sectionKey, sectionDescriptions, sectionValidators) {
  stream.write('<tr>\n');
  if (sectionKeyAllMap[sectionKey]) {
    const allKey = sectionKeyAllMap[sectionKey];
    generateTags(stream, 'td', [
      sectionKey + '<br/>' + allKey, sectionDescriptions[sectionKey] + '<br/>' + sectionDescriptions[allKey],
      sectionValidators[sectionKey].validator.errorMessage + '<br/>' + allValidator.errorMessage,
      getDefaultFromValidator(sectionValidators[sectionKey].validator) + '<br/>' + getDefaultFromValidator(allValidator), createLink(sectionKey)]);
  }
  else {
    generateTags(stream, 'td', [sectionKey, sectionDescriptions[sectionKey], sectionValidators[sectionKey].validator.errorMessage, getDefaultFromValidator(sectionValidators[sectionKey].validator), createLink(sectionKey)]);
  }
  stream.write('</tr>\n');
}

function getDefaultFromValidator(validator) {
  if (validator.validatorName === 'object') {
    return '{}';
  }
  else if (validator.validatorName === 'arrayOf') {
    return '[]';
  }
  else {
    return '';
  }
}

function createLink(id) {
  if (id === 'version') {
    return '';
  }
  else {
    return '<a href="#' + id + '">Details</a>';
  }
}

function generateSectionHeader(stream, title, id) {
  stream.write('<div id="' + id + '">\n');
  stream.write('<h2>' + title + '</h2>\n');
}

function generateSectionFooter(stream) {
  stream.write('</div>\n');
}

function safeAdd(map, key, value) {
  let theArray = map[key];
  if (!theArray) {
    map[key] = theArray = [];
  }
  theArray.push(value);
}

function getSectionKeyValidators(sectionValidator) {
  const sectionKeyValidators = {};
  if (sectionValidator.uniqueKeys) {
    sectionValidator.uniqueKeys.forEach(uniqueKey => {
      safeAdd(sectionKeyValidators, uniqueKey, getUniqueMessage());
    });
  }
  if (sectionValidator.references) {
    Object.keys(sectionValidator.references).forEach(referenceKey => {
      const reference = sectionValidator.references[referenceKey];
      safeAdd(sectionKeyValidators, referenceKey, getReferenceMessage(reference.section, reference.key));
    });
  }
  if (sectionValidator.commonReferences) {
    Object.keys(sectionValidator.commonReferences).forEach(commonReferenceKey => {
      const commonReference = sectionValidator.commonReferences[commonReferenceKey];
      safeAdd(sectionKeyValidators, commonReferenceKey, getCommonReferenceMessage(
        commonReference.section, commonReference.key, commonReference.commonKey));
    });
  }
  return sectionKeyValidators;
}

function arrayEqual(a, b) {
  return a.length === b.length && a.filter((ae, i) => ae === b[i]);
}

const noChange = {
  hasChanges: false,
  added: [],
  removed: []
}

function getAddedRemoved(a, b, whitelist = {}) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (arrayEqual(aKeys.sort(), bKeys.sort())) {
    return noChange;
  }
  else {
    const added = [];
    const removed = [];
    for (let aKey of aKeys) {
      if (b[aKey] === void 0 && whitelist[aKey] !== true) {
        removed.push(aKey);
      }
    }
    for (let bKey of bKeys) {
      if (a[bKey] === void 0) {
        added.push(bKey);
      }
    }
    const hasChanges = added.length > 0 || removed.length > 0;
    return {
      hasChanges,
      added,
      removed
    };
  }
}

const missingDefaultWhitelist = {
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
}

function checkKeyIntegrity(id, defaults, validators, descriptions) {
  const validatorDefaultAddedRemoved = getAddedRemoved(validators, defaults, missingDefaultWhitelist[id]);
  const validatorDescriptionAddedRemoved = getAddedRemoved(validators, descriptions);
  if (validatorDefaultAddedRemoved.hasChanges) {
    console.error('\n' + id + ' default vs validator had different keys!');
    console.error('addedKeys: ', validatorDefaultAddedRemoved.added);
    console.error('removedKeys: ', validatorDefaultAddedRemoved.removed);
  }
  if (validatorDescriptionAddedRemoved.hasChanges) {
    console.error('\n' + id + ' validator vs description had different keys!');
    console.error('addedKeys: ', validatorDescriptionAddedRemoved.added);
    console.error('removedKeys: ', validatorDescriptionAddedRemoved.removed);
  }
}

function generateSectionDocs(stream, title, id, defaults, validators, descriptions, sectionValidator) {
  generateSectionHeader(stream, title, id);
  checkKeyIntegrity(id, defaults, validators, descriptions);
  const keys = Object.keys(validators).sort();
  generateKeyHeader(stream);
  const sectionKeyValidators = getSectionKeyValidators(sectionValidator);
  for (let key of keys) {
    generateKeyDocs(stream, id, key, defaults, validators, descriptions, sectionKeyValidators);
  }
  generateKeyFooter(stream);
  generateSectionFooter(stream);
}

function generateConditionalSectionDocs(stream, title, id, regularDefaults, conditionalDefaults, validators, descriptions, sectionValidator) {
  generateSectionHeader(stream, title, id);
  checkKeyIntegrity(id, {...regularDefaults, ...conditionalDefaults}, validators, descriptions);
  const keys = Object.keys(validators).sort();
  generateKeyHeader(stream);
  const sectionKeyValidators = getSectionKeyValidators(sectionValidator);
  for (let key of keys) {
    generateConditionalKeyDocs(stream, id, key, regularDefaults, conditionalDefaults, validators, descriptions, sectionKeyValidators);
  }
  generateKeyFooter(stream);
  generateSectionFooter(stream);
}

function generateKeyHeader(stream) {
  stream.write('<table>\n');
  stream.write('<thead>\n');
  stream.write('<tr>\n');
  generateTags(stream, 'th', ['Property', 'Description', 'Validation Rules', 'Default']);
  stream.write('</tr>\n');
  stream.write('</thead>\n');
}

function generateTags(stream, tag, contents) {
  contents.forEach(content => {
    stream.write('<' + tag + '>' + content + '</' + tag + '>');
  });
  stream.write('\n');
}

function generateKeyFooter(stream) {
  stream.write('</table>\n')
}

function generateLink(content, id) {
  return '<a href="#' + id + '">' + content + '</a>';
}

function generateKeyDocs(stream, id, key, defaults, validators, descriptions, sectionKeyValidators) {
  const keyId = id + '.' + key;
  stream.write('<tr id="' + keyId + '">\n');
  generateTags(stream, 'td', [generateLink(key, keyId), descriptions[key], generateValidatorDoc(validators[key], sectionKeyValidators[key]), generateDefaultDoc(defaults[key])]);
  stream.write('</tr>\n');
}

function generateConditionalKeyDocs(stream, id, key, regularDefaults, conditionalDefaults, validators, descriptions, sectionKeyValidators) {
  const keyId = id + '.' + key;
  stream.write('<tr id="' + keyId + '">\n');
  generateTags(stream, 'td', [generateLink(key, keyId), descriptions[key], generateValidatorDoc(validators[key], sectionKeyValidators[key]), generateConditionalDefaultDoc(regularDefaults[key], conditionalDefaults[key])]);
  stream.write('</tr>\n');
}

function generateValidatorDoc(validator, sectionMessages) {
  // TODO add better handling of defaults!!!
  const validatorMessages = validator.errorMessages.filter(message => message !== 'should be any value');
  let messages = validatorMessages;
  if (sectionMessages && sectionMessages.length > 0) {
    messages = validatorMessages.concat(sectionMessages);
  }
  if (messages.length === 1) {
    return messages[0];
  }
  else {
    return messages.map(message => '<p>' + message + '</p>\n').join('');
  }
}

function generateDefaultDoc(theDefault) {
  return '<div>' + formatDefault(theDefault) + '</div>\n';
}

function generateConditionalDefaultDoc(regularDefault, conditionalDefault) {
  return conditionalDefault ? generateComplexDefaultDoc(conditionalDefault) : generateDefaultDoc(regularDefault);
}

function generateComplexDefaultDoc(conditionalDefault) {
  return conditionalDefault.rules.filter(rule => rule.suffix !== null).map(rule => {
    return '<div>' + (rule.defaultText ? rule.defaultText : formatDefault(rule.default)) + ' (' + rule.suffix + ')' + '</div>\n';
  }).join('');
}

const colorValidator = validators.color();

function formatDefault(theDefault) {
  if (theDefault === undefined) {
    return '';
  }
  else if (theDefault === null) {
    return null;
  }
  else if (colorValidator(theDefault)) {
    return outputColor(theDefault);
  }
  else if (Array.isArray(theDefault) && !theDefault.some(aValue => !colorValidator(aValue))) {
    return outputColors(theDefault);
  }
  else if (typeof theDefault === "object") {
    let keys = Object.keys(theDefault);
    return '{\n' + keys.map(key => key + ': ' + formatDefault(theDefault[key])).join('\n') + '}\n';
  }
  else if (typeof theDefault === "string") {
    return '\"' + theDefault + '\"';
  }
  else {
    return theDefault;
  }
}

function outputColors(colors) {
  return colors.map(color => outputColor(color)).join('');
}

function outputColor(color) {
  return '<span class="colorIcon" style="background-color: ' + color + '"></span>';
}

export default generateDocs;