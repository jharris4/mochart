import seedrandom from 'seedrandom';

import { NONE, AUTO, TYPE_DATE, TYPE_NUMBER, TYPE_STRING, SCALE_ORDINAL } from '@mochart/core';
import type { MochartConfig } from '@mochart/core';

import type { RandomConfig, GroupValue, DemoDataProvider } from './types';

const globalId = 'global';

/** A pseudo-random number source (seedrandom's PRNG is callable). */
type Rng = () => number;
/** Produces group-axis values (dates are emitted as millisecond numbers). */
type ValueGenerator = () => GroupValue;

// seedrandom's types only accept a string seed; the original demo passed
// numbers too, relying on seedrandom's internal string coercion. Centralize
// that coercion so behavior is preserved.
function rng(seed: string | number): Rng {
  return seedrandom(String(seed));
}

type RandomGroupConfig = RandomConfig['group'];

interface GroupData {
  stepPrevValues: GroupValue[];
  globalValues: GroupValue[];
  ownValues: GroupValue[];
  stepNextValues: GroupValue[];
  groupValues: GroupValue[];
}

function groupSortFunction(a: GroupValue, b: GroupValue): number {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

function toMillis(value: string | number | Date): number {
  return new Date(value).getTime();
}

function createValue(generator: Rng, range: number): number {
  return Math.round(generator() * range);
}

const intervalUnitToDateUnit: Record<string, number> = {
  second: 1000,
  minute: 60000,
  hour: 3600000,
  day: 86400000
};

const groupTypeToGenerator: Record<string, (group: RandomGroupConfig, randomGenerator: Rng) => ValueGenerator> = {
  [TYPE_DATE]: groupDateGenerator,
  [TYPE_NUMBER]: groupNumberGenerator,
  [TYPE_STRING]: groupStringGenerator
};

const CAPITAL_STRING_START = 65;
const LOWERCASE_STRING_START = 97;

function getFirstCharacter(_prevDigit: number | null, digit: number): string {
  return String.fromCharCode(CAPITAL_STRING_START + digit);
}

function getOtherCharacter(prevDigit: number | null, digit: number): string {
  return digit === 9 && prevDigit !== 9 ? ' ' : String.fromCharCode(LOWERCASE_STRING_START + digit);
}

function numberToString(number: number): string {
  const numberString = '' + number;
  const result: string[] = [];
  let getCharacter = getFirstCharacter;
  let prevChar: number | null = null;
  for (const char of numberString) {
    result.push(getCharacter(prevChar, +char));
    getCharacter = getOtherCharacter;
    prevChar = +char;
  }
  return result.join('');
}

function groupDateGenerator({ date }: RandomGroupConfig, randomGenerator: Rng): ValueGenerator {
  let { interval } = date;
  const { intervalUnit } = date;
  const min = toMillis(date.min);
  const max = toMillis(date.max);
  let range = max - min;
  let dateUnit = 1;
  if (intervalUnitToDateUnit[intervalUnit] !== undefined) {
    dateUnit = intervalUnitToDateUnit[intervalUnit];
  }
  interval *= dateUnit;
  range = Math.floor(range / interval);
  return () => min + createValue(randomGenerator, range) * interval;
}

function groupNumberGenerator({ number }: RandomGroupConfig, randomGenerator: Rng): ValueGenerator {
  const { min, max, interval } = number;
  let range = max - min;
  range = Math.floor(range / interval);
  return () => min + createValue(randomGenerator, range) * interval;
}

function groupStringGenerator({ string }: RandomGroupConfig, randomGenerator: Rng): ValueGenerator {
  const min = Math.pow(10, string.minLength - 1);
  const max = Math.pow(10, string.maxLength - 1);
  const range = max - min;
  return () => numberToString(min + createValue(randomGenerator, range));
}

function groupGenerator(type: string, group: RandomGroupConfig, randomGenerator: Rng): ValueGenerator {
  return groupTypeToGenerator[type](group, randomGenerator);
}

function generateGroupValues(
  generator: ValueGenerator,
  missingGenerator: Rng,
  groupCount: number,
  missingProbability: number,
  groupValueMap: Record<string, GroupValue> = {}
): GroupValue[] {
  const groupValues: GroupValue[] = [];
  let i, v: GroupValue;
  for (i = 0; i < groupCount; i++) {
    if (missingProbability === 0 || missingGenerator() >= missingProbability) {
      v = generator();
      while (groupValueMap['' + v] !== undefined) {
        v = generator();
      }
      groupValueMap['' + v] = v;
      groupValues.push(v);
    }
  }
  return groupValues;
}

function generateChartGroupValues(
  { groupAxisConfig }: MochartConfig,
  { group }: RandomConfig,
  randomId: number
): GroupData {
  const { type } = groupAxisConfig;
  const { count, missing, reuse } = group;
  const { probability } = missing;
  const { globalPercentage, stepPercentage } = reuse;

  const globalCount = Math.floor(globalPercentage * count);
  const stepCount = globalPercentage < 1 && stepPercentage > 0 ? 2 * Math.floor((count - globalCount) * stepPercentage / 2.0) : 0;
  const halfStepCount = Math.floor(stepCount / 2);
  const ownCount = count - globalCount - stepCount;

  const globalGenerator = groupGenerator(type, group, rng(globalId));
  const globalMissingGenerator = rng(globalId);
  const stepPrevGenerator = groupGenerator(type, group, rng((randomId - 1) + 0.5));
  const stepPrevMissingGenerator = rng((randomId - 1) + 0.5);
  const stepNextGenerator = groupGenerator(type, group, rng(randomId + 0.5));
  const stepNextMissingGenerator = rng(randomId + 0.5);
  const ownGenerator = groupGenerator(type, group, rng(randomId));
  const missingGenerator = rng(randomId);

  const groupValueMap: Record<string, GroupValue> = {};
  const globalValues = generateGroupValues(globalGenerator, globalMissingGenerator, globalCount, probability, groupValueMap);

  const globalGroupValueMap = { ...groupValueMap };
  let stepPrevValues: GroupValue[];
  let stepNextValues: GroupValue[];
  if (randomId % 2 === 0) {
    const stepPrevGroupValueMap = { ...globalGroupValueMap };
    stepPrevValues = generateGroupValues(stepPrevGenerator, stepPrevMissingGenerator, halfStepCount, probability, stepPrevGroupValueMap);
    const stepNextNextGroupValueMap = { ...globalGroupValueMap };
    const stepNextNextGenerator = groupGenerator(type, group, rng((randomId + 1) + 0.5));
    const stepNextNextMissingGenerator = rng((randomId + 1) + 0.5);
    generateGroupValues(stepNextNextGenerator, stepNextNextMissingGenerator, halfStepCount, probability, stepNextNextGroupValueMap);
    const stepNextGroupValueMap = { ...stepPrevGroupValueMap, ...stepNextNextGroupValueMap };
    stepNextValues = generateGroupValues(stepNextGenerator, stepNextMissingGenerator, halfStepCount, probability, stepNextGroupValueMap);
  }
  else {
    const stepNextGroupValueMap = { ...globalGroupValueMap };
    stepNextValues = generateGroupValues(stepNextGenerator, stepNextMissingGenerator, halfStepCount, probability, stepNextGroupValueMap);
    const stepPrevPrevGroupValueMap = { ...globalGroupValueMap };
    const stepPrevPrevGenerator = groupGenerator(type, group, rng((randomId - 2) + 0.5));
    const stepPrevPrevMissingGenerator = rng((randomId - 2) + 0.5);
    generateGroupValues(stepPrevPrevGenerator, stepPrevPrevMissingGenerator, halfStepCount, probability, stepPrevPrevGroupValueMap);
    const stepPrevGroupValueMap = { ...stepNextGroupValueMap, ...stepPrevPrevGroupValueMap };
    stepPrevValues = generateGroupValues(stepPrevGenerator, stepPrevMissingGenerator, halfStepCount, probability, stepPrevGroupValueMap);
  }
  for (const value of stepPrevValues) {
    groupValueMap['' + value] = value;
  }
  for (const value of stepNextValues) {
    groupValueMap['' + value] = value;
  }

  const ownValues = generateGroupValues(ownGenerator, missingGenerator, ownCount, probability, groupValueMap);
  const groupValues = ([] as GroupValue[]).concat(stepPrevValues, globalValues, ownValues, stepNextValues);

  return {
    stepPrevValues,
    globalValues,
    ownValues,
    stepNextValues,
    groupValues
  };
}

function generateSeriesValuesForGroupValues(
  groupValues: GroupValue[],
  min: number,
  range: number,
  probability: number,
  round: boolean,
  randomGenerator: Rng,
  missingGenerator: Rng
): (number | undefined)[] {
  return groupValues.map(() => {
    if (probability > 0 && missingGenerator() < probability) {
      return undefined;
    }
    else if (round) {
      return Math.round(min + randomGenerator() * range);
    }
    else {
      return min + randomGenerator() * range;
    }
  });
}

function generateSeriesValues(
  _id: string,
  groupData: GroupData,
  reuse: RandomConfig['series']['reuse'],
  min: number,
  range: number,
  probability: number,
  round: boolean,
  randomGenerator: Rng,
  missingGenerator: Rng,
  globalGenerator: Rng,
  globalMissingGenerator: Rng,
  stepPrevGenerator: Rng,
  stepPrevMissingGenerator: Rng,
  stepNextGenerator: Rng,
  stepNextMissingGenerator: Rng
): (number | undefined)[] {
  const { stepPrevValues, globalValues, ownValues, stepNextValues, groupValues } = groupData;
  const { global, step } = reuse;
  if (global || step) {
    const prevSeriesValues = generateSeriesValuesForGroupValues(stepPrevValues, min, range, probability, round, step ? stepPrevGenerator : randomGenerator, step ? stepPrevMissingGenerator : missingGenerator);
    const globalSeriesValues = generateSeriesValuesForGroupValues(globalValues, min, range, probability, round, global ? globalGenerator : randomGenerator, global ? globalMissingGenerator : missingGenerator);
    const ownSeriesValues = generateSeriesValuesForGroupValues(ownValues, min, range, probability, round, randomGenerator, missingGenerator);
    const nextSeriesValues = generateSeriesValuesForGroupValues(stepNextValues, min, range, probability, round, step ? stepNextGenerator : randomGenerator, step ? stepNextMissingGenerator : missingGenerator);

    return ([] as (number | undefined)[]).concat(
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

const allPropertyKeys = ['property', 'rangeProperty', 'markerProperty', 'colorProperty', 'labelProperty'];
const axisPropertyMap: Record<string, boolean> = {
  property: true,
  rangeProperty: true
};

function generateChartSeriesValues(
  { seriesConfigs }: MochartConfig,
  { series }: RandomConfig,
  randomId: number,
  groupData: GroupData
): Record<string, (number | undefined)[]> {
  const { number, missing, reuse } = series;
  const { min, max, limitToAxisConfig, round } = number;
  const { probability } = missing;
  const seriesValues: Record<string, (number | undefined)[]> = {};
  const randomGenerator = rng(randomId);
  const missingGenerator = rng(randomId);
  const globalGenerator = rng(globalId);
  const globalMissingGenerator = rng(globalId);
  const stepPrevGenerator = rng((randomId - 1) + 0.5);
  const stepPrevMissingGenerator = rng((randomId - 1) + 0.5);
  const stepNextGenerator = rng(randomId + 0.5);
  const stepNextMissingGenerator = rng(randomId + 0.5);
  seriesConfigs.forEach(seriesConfig => {
    const { id, seriesAxisConfig: axisConfig } = seriesConfig;
    const seriesConfigRecord = seriesConfig as unknown as Record<string, unknown>;
    let keyMin, keyMax, keyRange;
    for (const key of allPropertyKeys) {
      const propertyValue = seriesConfigRecord[key];
      if (propertyValue !== NONE) {
        keyMin = axisPropertyMap[key] && axisConfig.min !== AUTO && limitToAxisConfig ? (axisConfig.min as number) : min;
        keyMax = axisPropertyMap[key] && axisConfig.max !== AUTO && limitToAxisConfig ? (axisConfig.max as number) : max;
        keyRange = keyMax - keyMin;
        seriesValues[propertyValue as string] = generateSeriesValues(id, groupData, reuse, keyMin, keyRange, probability,
          round, randomGenerator, missingGenerator, globalGenerator, globalMissingGenerator,
          stepPrevGenerator, stepPrevMissingGenerator, stepNextGenerator, stepNextMissingGenerator);
      }
    }
  });
  return seriesValues;
}

export function generateChartDataProvider(
  mochartConfig: MochartConfig,
  random: RandomConfig,
  randomId: number
): DemoDataProvider {
  const { groupAxisConfig } = mochartConfig;
  const { displayProperty, scale } = groupAxisConfig;
  const { group } = random;

  const groupData = generateChartGroupValues(mochartConfig, random, randomId);
  let { groupValues } = groupData;
  const seriesValues = generateChartSeriesValues(mochartConfig, random, randomId, groupData);

  const { order } = group;
  const { sort } = order;

  if (scale !== SCALE_ORDINAL || sort) {
    const sortedGroupValues = groupValues.slice().sort(groupSortFunction);
    const oldValueToIndex = groupValues.reduce<Record<string, number>>((m, g, i) => { m['' + g] = i; return m; }, {});
    const sortedIndexToIndex = sortedGroupValues.map(g => oldValueToIndex['' + g]);
    groupValues = sortedGroupValues;
    const oldToNew = (values: (number | undefined)[]) => values.map((_v, i) => values[sortedIndexToIndex[i]]);

    const seriesKeys = Object.keys(seriesValues);
    for (const seriesKey of seriesKeys) {
      seriesValues[seriesKey] = oldToNew(seriesValues[seriesKey]);
    }
  }

  if (displayProperty) {
    seriesValues[displayProperty] = groupValues as (number | undefined)[];
  }

  return {
    groupValues,
    seriesValues,
    getGroupValues: () => groupValues,
    getSeriesValue: (_g, i, s) => seriesValues[s][i]
  };
}
