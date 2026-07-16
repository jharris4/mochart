import validators from 'valide';
import { isDataProviderValid } from './ChartData';
import { NONE, TYPE_DATE, TYPE_NUMBER } from '../config/core/constants';

function getDuplicates(values) {
  let valueMap = {};
  for (let value of values) {
    if (valueMap[value] === void 0) {
      valueMap[value] = 1;
    }
    else {
      valueMap[value] = valueMap[value] + 1;
    }
  }
  let duplicates = [];
  for (let value of values) {
    if (valueMap[value] > 1) {
      duplicates.push(value);
      valueMap[value] = 1; // only push duplicates once
    }
  }
  return duplicates;
}

function checkProperty(dataErrors, dataProvider, groupValues, property) {
  let numberValidator = validators.number().orEqual(void 0);
  if (groupValues.some((g, i) => !numberValidator(dataProvider.getSeriesValue(g, i, property)))) {
    dataErrors.push('series values must be numeric or undefined for property: ' + property);
  }
}

export function getDataErrors(mochartConfig, dataProvider) {
  let dataErrors = [];
  if (mochartConfig.validation.valid && isDataProviderValid(dataProvider)) {
    const { groupAxisConfig, seriesConfigs } = mochartConfig;

    let groupValues = dataProvider.getGroupValues();
    let numberValidator = validators.number();
    let stringValidator = validators.string();
    let getGroupValue = null;
    if (groupAxisConfig.displayProperty !== NONE) {
      if (groupValues.some(g => !(stringValidator(g) || numberValidator(g)))) {
        dataErrors.push('raw group values must be number or string when display property is set');
      }
      let displayProperty = groupAxisConfig.displayProperty;
      getGroupValue = i => dataProvider.getSeriesValue(groupValues[i], i, displayProperty);
    }
    else {
      getGroupValue = i => groupValues[i];
    }
    let validator;
    if (groupAxisConfig.type === TYPE_DATE) {
      validator = validators.dateAny();
    }
    else if (groupAxisConfig.type === TYPE_NUMBER) {
      validator = validators.number();
    }
    else {
      validator = validators.string();
    }
    if(groupValues.some((g, i) => !validator(getGroupValue(i)))) {
      dataErrors.push((groupAxisConfig.displayProperty !== NONE ? 'display ' : '') + 'group values must all match the specified type');
    }
    if (dataErrors.length === 0) { // duplicate matching needs all the values to be primitives...
      let duplicates = getDuplicates(groupValues);
      if (duplicates.length > 0) {
        dataErrors.push('group values must be unique, duplicates: ' + duplicates.join(', '));
      }
    }
    for (let seriesConfig of seriesConfigs) {
      checkProperty(dataErrors, dataProvider, groupValues, seriesConfig.property);
      if (seriesConfig.rangeProperty !== NONE) {
        checkProperty(dataErrors, dataProvider, groupValues, seriesConfig.rangeProperty);
      }
      if (seriesConfig.markerProperty !== NONE) {
        checkProperty(dataErrors, dataProvider, groupValues, seriesConfig.markerProperty);
      }
      if (seriesConfig.colorProperty !== NONE) {
        checkProperty(dataErrors, dataProvider, groupValues, seriesConfig.colorProperty);
      }
      if (seriesConfig.labelProperty !== NONE) {
        checkProperty(dataErrors, dataProvider, groupValues, seriesConfig.labelProperty);
      }
    }
  }

  return dataErrors;
}
