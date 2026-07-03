import { getGroupDomainForValues } from './DomainData';
import { getAxisDomain } from './AxisDomainData';
import { NONE, TYPE_DATE, SCALE_ORDINAL } from '../config/core/constants';

export function getGroupData(groupAxisConfig, dataProvider) {
  let rawGroupValues = getRawGroupValues(groupAxisConfig, dataProvider);
  let displayGroupValues = rawGroupValues;
  if (groupAxisConfig.displayProperty !== NONE) {
    displayGroupValues = getDisplayGroupValues(rawGroupValues, dataProvider, groupAxisConfig.displayProperty);
  }
  return getGroupDataFromValues(groupAxisConfig, rawGroupValues, displayGroupValues);
}

export function getGroupDataFromValues(groupAxisConfig, rawGroupValues, displayGroupValues, numericGroupValueOffsets = null) {
  let groupValues = getGroupValues(groupAxisConfig, rawGroupValues, displayGroupValues, numericGroupValueOffsets);
  let axisDomain = getGroupAxisDomain(groupAxisConfig, groupValues.parsed);

  return {
    axisDomain,
    values: groupValues
  };
}

export function getGroupDataWithAxisDomain(groupData, axisDomain) {
  return Object.assign({}, groupData, { axisDomain });
}

export function getGroupDataWithNumericValues(groupData, numericValues) {
  let values = Object.assign({}, groupData.values, { numeric: numericValues });
  return Object.assign({}, groupData, { values });
}

function getGroupValues(groupAxisConfig, rawGroupValues, displayGroupValues, numericGroupValueOffsets = null) {
  let parsedGroupValues = getParsedGroupValues(groupAxisConfig, displayGroupValues);
  let numericGroupValues = getNumericGroupValues(groupAxisConfig, parsedGroupValues, numericGroupValueOffsets);
  return {
    raw: rawGroupValues,
    display: displayGroupValues,
    parsed: parsedGroupValues,
    numeric: numericGroupValues
  };
}

function getRawGroupValues(groupAxisConfig, dataProvider) {
  // TODO - should perhaps ensure that groupAxisConfig.property matches dataProvider.getGroupProperty()
  // TODO - should perhaps ensure that group values are unique, not-undefined, and even sorted
  return dataProvider.getGroupValues();
}

function getDisplayGroupValues(rawGroupValues, dataProvider, groupDisplayProperty) {
  let displayGroupValues = [];
  const groupCount = rawGroupValues.length;
  for (let groupIndex = 0; groupIndex < groupCount; groupIndex++) {
    displayGroupValues.push(dataProvider.getSeriesValue(rawGroupValues[groupIndex], groupIndex, groupDisplayProperty));
  }
  return displayGroupValues;
}

function getParsedGroupValues(groupAxisConfig, groupValues) {
  let parsedGroupValues = groupValues;
  if (groupAxisConfig.type === TYPE_DATE) {
    parsedGroupValues = [];
    for (let groupValue of groupValues) {
      parsedGroupValues.push(new Date(groupValue));
    }
  }
  return parsedGroupValues;
}

export function getNumericGroupValues(groupAxisConfig, parsedGroupValues, numericGroupValueOffsets = null) {
  let numericGroupValues = parsedGroupValues;
  if (groupAxisConfig.scale === SCALE_ORDINAL) {
    numericGroupValues = [];
    let groupCount = parsedGroupValues.length;
    if (numericGroupValueOffsets !== null) {
      for (let ordinalIndex = 0; ordinalIndex < groupCount; ordinalIndex++) {
        numericGroupValues.push(ordinalIndex - numericGroupValueOffsets[ordinalIndex]);
      }
    }
    else {
      for (let ordinalIndex = 0; ordinalIndex < groupCount; ordinalIndex++) {
        numericGroupValues.push(ordinalIndex);
      }
    }
  }
  else if (groupAxisConfig.type === TYPE_DATE) {
    numericGroupValues = [];
    for (let groupValue of parsedGroupValues) {
      numericGroupValues.push(groupValue.getTime());
    }
  }
  return numericGroupValues;
}

function getGroupAxisDomain(groupAxisConfig, parsedGroupValues) {
  if (groupAxisConfig.scale === SCALE_ORDINAL) {
    return getOrdinalGroupAxisDomain(parsedGroupValues.length);
  }
  else {
    return getLinearGroupAxisDomain(groupAxisConfig, parsedGroupValues)
  }
}

function getOrdinalGroupAxisDomain(groupCount) {
  return [0, groupCount > 0 ? groupCount-1 : 0];
}

function getLinearGroupAxisDomain(groupAxisConfig, parsedGroupValues) {
  return getAxisDomain(groupAxisConfig, () => getGroupDomainForValues(parsedGroupValues));
}

export function getGroupValueObject(groupData, groupIndex) {
  const { axisDomain, values } = groupData;
  return {
    axisDomain,
    values: {
      raw: values.raw[groupIndex],
      display: values.display[groupIndex],
      parsed: values.parsed[groupIndex],
      numeric: values.numeric[groupIndex]
    }
  };
}