require("babel-register");

const mochartConfigSectionValidators = require('./src/config/validation/mochartConfig').configWithoutAllValidators;
const getUniqueMessage = require('./src/config/validation/mochartConfig').getUniqueMessage;
const getReferenceMessage = require('./src/config/validation/mochartConfig').getReferenceMessage;
const getCommonReferenceMessage = require('./src/config/validation/mochartConfig').getCommonReferenceMessage;
const getSectionDescriptions = require('./src/config/docs/mochartConfig').default;
const sectionKeyAllMap = require('./src/config/core/mochartConfig').sectionKeyAllMap;
const allValidator = require('./src/config/validation/mochartConfig').allValidator;

const getAnimationDefaults = require('./src/config/defaults/animationConfig').default;
const getAnimationValidators = require('./src/config/validation/animationConfig').default;
const getAnimationDescriptions = require('./src/config/docs/animationConfig').default;

const getChartDefaults = require('./src/config/defaults/chartConfig').default;
const getChartValidators = require('./src/config/validation/chartConfig').default;
const getChartDescriptions = require('./src/config/docs/chartConfig').default;

const getColorPaletteDefaults = require('./src/config/defaults/colorPaletteConfig').default;
const getColorPaletteValidators = require('./src/config/validation/colorPaletteConfig').default;
const getColorPaletteDescriptions = require('./src/config/docs/colorPaletteConfig').default;

const getCrosshairDefaults = require('./src/config/defaults/crosshairConfig').default;
const getCrosshairValidators = require('./src/config/validation/crosshairConfig').default;
const getCrosshairDescriptions = require('./src/config/docs/crosshairConfig').default;

const getGroupAxisRegularDefaults = require('./src/config/defaults/groupAxisConfig').getRegularDefaults;
const getGroupAxisConditionalDefaults = require('./src/config/defaults/groupAxisConfig').getConditionalDefaults;
const getGroupAxisValidators = require('./src/config/validation/groupAxisConfig').default;
const getGroupAxisDescriptions = require('./src/config/docs/groupAxisConfig').default;

const getLegendRegularDefaults = require('./src/config/defaults/legendConfig').getRegularDefaults;
const getLegendConditionalDefaults = require('./src/config/defaults/legendConfig').getConditionalDefaults;
const getLegendValidators = require('./src/config/validation/legendConfig').default;
const getLegendDescriptions = require('./src/config/docs/legendConfig').default;

const getLinearGradientRegularDefaults = require('./src/config/defaults/linearGradientConfig').getRegularDefaults;
const getLinearGradientConditionalDefaults = require('./src/config/defaults/linearGradientConfig').getConditionalDefaults;
const getLinearGradientValidators = require('./src/config/validation/linearGradientConfig').default;
const getLinearGradientDescriptions = require('./src/config/docs/linearGradientConfig').default;

const getPlotDefaults = require('./src/config/defaults/plotConfig').default;
const getPlotValidators = require('./src/config/validation/plotConfig').default;
const getPlotDescriptions = require('./src/config/docs/plotConfig').default;

const getRadialGradientRegularDefaults = require('./src/config/defaults/radialGradientConfig').getRegularDefaults;
const getRadialGradientConditionalDefaults = require('./src/config/defaults/radialGradientConfig').getConditionalDefaults;
const getRadialGradientValidators = require('./src/config/validation/radialGradientConfig').default;
const getRadialGradientDescriptions = require('./src/config/docs/radialGradientConfig').default;

const getSeriesAxisRegularDefaults = require('./src/config/defaults/seriesAxisConfig').getRegularDefaults;
const getSeriesAxisConditionalDefaults = require('./src/config/defaults/seriesAxisConfig').getConditionalDefaults;
const getSeriesAxisValidators = require('./src/config/validation/seriesAxisConfig').default;
const getSeriesAxisDescriptions = require('./src/config/docs/seriesAxisConfig').default;

const getSeriesRegularDefaults = require('./src/config/defaults/seriesConfig').getRegularDefaults;
const getSeriesConditionalDefaults = require('./src/config/defaults/seriesConfig').getConditionalDefaults;
const getSeriesValidators = require('./src/config/validation/seriesConfig').default;
const getSeriesDescriptions = require('./src/config/docs/seriesConfig').default;

const getSeriesGroupRegularDefaults = require('./src/config/defaults/seriesGroupConfig').getRegularDefaults;
const getSeriesGroupConditionalDefaults = require('./src/config/defaults/seriesGroupConfig').getConditionalDefaults;
const getSeriesGroupValidators = require('./src/config/validation/seriesGroupConfig').default;
const getSeriesGroupDescriptions = require('./src/config/docs/seriesGroupConfig').default;

const getSeriesStackRegularDefaults = require('./src/config/defaults/seriesStackConfig').getRegularDefaults;
const getSeriesStackConditionalDefaults = require('./src/config/defaults/seriesStackConfig').getConditionalDefaults;
const getSeriesStackValidators = require('./src/config/validation/seriesStackConfig').default;
const getSeriesStackDescriptions = require('./src/config/docs/seriesStackConfig').default;

const getTitleDefaults = require('./src/config/defaults/titleConfig').default;
const getTitleValidators = require('./src/config/validation/titleConfig').default;
const getTitleDescriptions = require('./src/config/docs/titleConfig').default;

const getTooltipDefaults = require('./src/config/defaults/tooltipConfig').default;
const getTooltipValidators = require('./src/config/validation/tooltipConfig').default;
const getTooltipDescriptions = require('./src/config/docs/tooltipConfig').default;

const fs = require('fs');
const path = require('path');

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

const validators = require('valide').default;

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

module.exports = generateDocs;