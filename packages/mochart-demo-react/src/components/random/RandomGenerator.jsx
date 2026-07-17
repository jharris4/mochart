

import seedrandom from 'seedrandom';

import { NONE, AUTO, TYPE_DATE, TYPE_NUMBER, TYPE_STRING, SCALE_ORDINAL, isDataProviderValid, getDataErrors } from 'mochart';

const globalId = "global";

function groupSortFunction(a, b) {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

function toMillis(value) {
  return new Date(value).getTime();
}

function createValue(generator, range) {
  return Math.round(generator() * range);
}

const intervalUnitToDateUnit = {
  second: 1000,
  minute: 60000,
  hour: 3600000,
  day: 86400000
};

const groupTypeToGenerator = {
  [TYPE_DATE]: groupDateGenerator,
  [TYPE_NUMBER]: groupNumberGenerator,
  [TYPE_STRING]: groupStringGenerator
};

const CAPITAL_STRING_START = 65;
const LOWERCASE_STRING_START = 97;

function getFirstCharacter(prevDigit, digit) {
  return String.fromCharCode(CAPITAL_STRING_START + digit);
}

function getOtherCharacter(prevDigit, digit) {
  return digit === 9 && prevDigit !== 9 ? ' ' : String.fromCharCode(LOWERCASE_STRING_START + digit);
}

function numberToString(number) {
  let numberString = '' + number;
  let result = [];
  let getCharacter = getFirstCharacter;
  let prevChar = null;
  for (let char of numberString) {
    result.push(getCharacter(prevChar, +char));
    getCharacter = getOtherCharacter;
    prevChar = +char;
  }
  return result.join('');
}


function groupDateGenerator({ date }, randomGenerator) {
  let { min, max } = date;
  min = toMillis(min);
  max = toMillis(max);
  let { interval, intervalUnit } = date;
  let range = max - min;
  let dateInterval = interval;
  let dateUnit = 1;
  if (intervalUnitToDateUnit[intervalUnit] !== void 0) {
    dateUnit = intervalUnitToDateUnit[intervalUnit];
  }
  interval *= dateUnit;
  range = Math.floor(range / interval);
  return () => min + createValue(randomGenerator, range) * interval;
}

function groupNumberGenerator({ number }, randomGenerator) {
  const { min, max, interval } = number;
  let range = max - min;
  range = Math.floor(range / interval);
  return () => min + createValue(randomGenerator, range) * interval;
}

function groupStringGenerator({ string }, randomGenerator) {
  let min = Math.pow(10, string.minLength - 1);
  let max = Math.pow(10, string.maxLength - 1);
  let range = max - min;
  return () => numberToString(min + createValue(randomGenerator, range));
}

function groupGenerator(type, group, randomGenerator) {
  return groupTypeToGenerator[type](group, randomGenerator);
}

function generateGroupValues(generator, missingGenerator, groupCount, missingProbability, groupValueMap = {})  {
  const groupValues = [];
  let i, v;
  for (i = 0; i < groupCount; i++) {
    if (missingProbability === 0 || missingGenerator() >= missingProbability) {
      v = generator();
      while (groupValueMap["" + v] !== void 0) {
        v = generator();
      }
      groupValueMap["" + v] = v;
      groupValues.push(v);
    }
  }
  return groupValues;
}

function generateChartGroupValues({ groupAxisConfig }, { group }, randomId) {
  const { type } = groupAxisConfig;
  const { count, missing, reuse } = group;
  const { probability } = missing;
  const { globalPercentage, stepPercentage } = reuse;

  const globalCount = Math.floor(globalPercentage * count);
  const stepCount = globalPercentage < 1 && stepPercentage > 0 ? 2 * Math.floor((count - globalCount) * stepPercentage / 2.0) : 0;
  const halfStepCount = Math.floor(stepCount / 2);
  const ownCount = count - globalCount - stepCount;

  const globalGenerator = groupGenerator(type, group, seedrandom(globalId));
  const globalMissingGenerator = seedrandom(globalId);
  const stepPrevGenerator = groupGenerator(type, group, seedrandom((randomId - 1) + 0.5));
  const stepPrevMissingGenerator = seedrandom((randomId - 1) + 0.5);
  const stepNextGenerator = groupGenerator(type, group, seedrandom(randomId + 0.5));
  const stepNextMissingGenerator = seedrandom(randomId + 0.5);
  const ownGenerator = groupGenerator(type, group, seedrandom(randomId));
  const missingGenerator = seedrandom(randomId);

  const groupValueMap = {};
  const globalValues = generateGroupValues(globalGenerator, globalMissingGenerator, globalCount, probability, groupValueMap);

  const globalGroupValueMap = {...groupValueMap};
  let stepPrevValues;
  let stepNextValues;
  if (randomId % 2 === 0) {
    let stepPrevGroupValueMap = {...globalGroupValueMap};
    stepPrevValues = generateGroupValues(stepPrevGenerator, stepPrevMissingGenerator, halfStepCount, probability, stepPrevGroupValueMap);
    let stepNextNextGroupValueMap = {...globalGroupValueMap};
    let stepNextNextGenerator = groupGenerator(type, group, seedrandom((randomId + 1) + 0.5));
    const stepNextNextMissingGenerator = seedrandom((randomId + 1) + 0.5);
    let stepNextNextValues = generateGroupValues(stepNextNextGenerator, stepNextNextMissingGenerator, halfStepCount, probability, stepNextNextGroupValueMap);
    let stepNextGroupValueMap = {...stepPrevGroupValueMap, ...stepNextNextGroupValueMap};
    stepNextValues = generateGroupValues(stepNextGenerator, stepNextMissingGenerator, halfStepCount, probability, stepNextGroupValueMap);
  }
  else {
    let stepNextGroupValueMap = {...globalGroupValueMap};
    stepNextValues = generateGroupValues(stepNextGenerator, stepNextMissingGenerator, halfStepCount, probability, stepNextGroupValueMap);
    let stepPrevPrevGroupValueMap = {...globalGroupValueMap};
    let stepPrevPrevGenerator = groupGenerator(type, group, seedrandom((randomId - 2) + 0.5));
    const stepPrevPrevMissingGenerator = seedrandom((randomId - 2) + 0.5);
    let stepPrevPrevValues = generateGroupValues(stepPrevPrevGenerator, stepPrevPrevMissingGenerator, halfStepCount, probability, stepPrevPrevGroupValueMap);
    let stepPrevGroupValueMap = {...stepNextGroupValueMap, ...stepPrevPrevGroupValueMap};
    stepPrevValues = generateGroupValues(stepPrevGenerator, stepPrevMissingGenerator, halfStepCount, probability, stepPrevGroupValueMap);
  }
  for (let value of stepPrevValues) {
    groupValueMap["" + value] = value;
  }
  for (let value of stepNextValues) {
    groupValueMap["" + value] = value;
  }

  const ownValues = generateGroupValues(ownGenerator, missingGenerator, ownCount, probability, groupValueMap);
  const groupValues = [].concat(stepPrevValues, globalValues, ownValues, stepNextValues);

  return {
    stepPrevValues,
    globalValues,
    ownValues,
    stepNextValues,
    groupValues
  };
}

function generateSeriesValuesForGroupValues(groupValues, min, range, probability, round, randomGenerator, missingGenerator) {
  return groupValues.map((g, i) => {
    if (probability > 0 && missingGenerator() < probability) {
      return void 0;
    }
    else if (round) {
      return Math.round(min + randomGenerator() * range);
    }
    else {
      return min + randomGenerator() * range;
    }
  });
}

function generateSeriesValues(id, groupData, reuse, min, range, probability, round, randomGenerator, missingGenerator,
  globalGenerator, globalMissingGenerator, stepPrevGenerator, stepPrevMissingGenerator, stepNextGenerator, stepNextMissingGenerator) {
  const { stepPrevValues, globalValues, ownValues, stepNextValues, groupValues } = groupData;
  const { global, step } = reuse;
  if (global || step) {
    const prevSeriesValues = generateSeriesValuesForGroupValues(stepPrevValues, min, range, probability, round, step ? stepPrevGenerator : randomGenerator, step ? stepPrevMissingGenerator : missingGenerator);
    const globalSeriesValues = generateSeriesValuesForGroupValues(globalValues, min, range, probability, round, global ? globalGenerator : randomGenerator, global ? globalMissingGenerator : missingGenerator);
    const ownSeriesValues = generateSeriesValuesForGroupValues(ownValues, min, range, probability, round, randomGenerator, missingGenerator);
    const nextSeriesValues = generateSeriesValuesForGroupValues(stepNextValues, min, range, probability, round, step ? stepNextGenerator : randomGenerator, step ? stepNextMissingGenerator : missingGenerator);

    return [].concat(
      prevSeriesValues,
      globalSeriesValues,
      ownSeriesValues,
      nextSeriesValues
    );
  }
  else {
    return generateSeriesValuesForGroupValues(groupValues, min, range, probability, round, randomGenerator, missingGenerator);
  }
}

const axisPropertyKeys = ["property", "rangeProperty"];
const otherPropertyKeys = ["markerProperty", "colorProperty", "labelProperty"];

const allPropertyKeys = ["property", "rangeProperty", "markerProperty", "colorProperty", "labelProperty"];
const axisPropertyMap = {
  "property": true,
  "rangeProperty": true
};

function generateChartSeriesValues({ seriesConfigs }, { series }, randomId, groupData) {
  const { number, missing, reuse } = series;
  const { min, max, limitToAxisConfig, round } = number;
  const { probability } = missing;
  const { global, step } = reuse;
  const range = max - min;
  let seriesValues = {};
  const randomGenerator = seedrandom(randomId);
  const missingGenerator = seedrandom(randomId);
  const globalGenerator = seedrandom(globalId);
  const globalMissingGenerator = seedrandom(globalId);
  const stepPrevGenerator = seedrandom((randomId - 1) + 0.5);
  const stepPrevMissingGenerator = seedrandom((randomId - 1) + 0.5);
  const stepNextGenerator = seedrandom(randomId + 0.5);
  const stepNextMissingGenerator = seedrandom(randomId + 0.5);
  seriesConfigs.forEach(seriesConfig => {
    const { id, seriesAxisConfig: axisConfig } = seriesConfig;
    let keyMin, keyMax, keyRange;
    for (let key of allPropertyKeys) {
      if (seriesConfig[key] !== NONE) {
        keyMin = axisPropertyMap[key] && axisConfig.min !== AUTO && limitToAxisConfig ? axisConfig.min : min;
        keyMax = axisPropertyMap[key] && axisConfig.max !== AUTO && limitToAxisConfig ? axisConfig.max : max;
        keyRange = keyMax - keyMin;
        seriesValues[seriesConfig[key]] = generateSeriesValues(id, groupData, reuse, keyMin, keyRange, probability,
          round, randomGenerator, missingGenerator, globalGenerator, globalMissingGenerator,
          stepPrevGenerator, stepPrevMissingGenerator, stepNextGenerator, stepNextMissingGenerator);
      }
    }
  });
  return seriesValues;
}

export function generateChartDataProvider(mochartConfig, random, randomId) {
  const { groupAxisConfig } = mochartConfig;
  const { displayProperty, scale } = groupAxisConfig;
  const { error, group } = random;
  const { probability } = error;
  if (probability > 0) {
    if (seedrandom(randomId) <= probability) {
      return {
        getGroupValues: () => [],
        getError: () => 'A random error'
      }
    }
  }

  const groupData = generateChartGroupValues(mochartConfig, random, randomId);
  let { groupValues } = groupData;
  const seriesValues = generateChartSeriesValues(mochartConfig, random, randomId, groupData);

  const { order } = group;
  const { sort } = order;

  if (scale !== SCALE_ORDINAL || sort) {
    const sortedGroupValues = groupValues.slice().sort(groupSortFunction);
    const sortedValueToIndex = sortedGroupValues.reduce((m, g, i) => { m["" + g] = i; return m; }, {});
    const oldValueToIndex = groupValues.reduce((m, g, i) => { m["" + g] = i; return m; }, {});
    const sortedIndexToIndex = sortedGroupValues.map(g => oldValueToIndex[g]);
    groupValues = sortedGroupValues;
    const oldToNew = values => values.map((v, i) => values[sortedIndexToIndex[i]]);

    const seriesKeys = Object.keys(seriesValues);
    let values;
    for (let seriesKey of seriesKeys) {
      seriesValues[seriesKey] = oldToNew(seriesValues[seriesKey]);
    }
  }

  if (displayProperty) {
    seriesValues[displayProperty] = groupValues;
  }

  return {
    groupValues,
    seriesValues,
    getGroupValues: () => groupValues,
    getSeriesValue: (g, i, s) => seriesValues[s][i]
  };
}
