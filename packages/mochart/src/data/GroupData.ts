import { getGroupDomainForValues } from './DomainData';
import { getAxisDomain } from './AxisDomainData';
import { NONE, TYPE_DATE, SCALE_ORDINAL } from '../config/core/constants';
import type { GroupAxisConfig } from '../types/config';
import type {
  DataProvider,
  GroupAxisDomain,
  GroupData,
  GroupValue,
  GroupValueObject,
  GroupValues
} from '../types/data';

export function getGroupData(groupAxisConfig: GroupAxisConfig, dataProvider: DataProvider): GroupData {
  const rawGroupValues = getRawGroupValues(groupAxisConfig, dataProvider);
  let displayGroupValues: readonly GroupValue[] = rawGroupValues;
  if (groupAxisConfig.displayProperty !== NONE) {
    displayGroupValues = getDisplayGroupValues(rawGroupValues, dataProvider, groupAxisConfig.displayProperty);
  }
  return getGroupDataFromValues(groupAxisConfig, rawGroupValues, displayGroupValues);
}

export function getGroupDataFromValues(
  groupAxisConfig: GroupAxisConfig,
  rawGroupValues: readonly GroupValue[],
  displayGroupValues: readonly GroupValue[],
  numericGroupValueOffsets: readonly number[] | null = null
): GroupData {
  const groupValues = getGroupValues(groupAxisConfig, rawGroupValues, displayGroupValues, numericGroupValueOffsets);
  const axisDomain = getGroupAxisDomain(groupAxisConfig, groupValues.parsed);

  return {
    axisDomain,
    values: groupValues
  };
}

export function getGroupDataWithAxisDomain(groupData: GroupData, axisDomain: GroupAxisDomain): GroupData {
  return Object.assign({}, groupData, { axisDomain });
}

export function getGroupDataWithNumericValues(groupData: GroupData, numericValues: number[]): GroupData {
  const values = Object.assign({}, groupData.values, { numeric: numericValues });
  return Object.assign({}, groupData, { values });
}

function getGroupValues(
  groupAxisConfig: GroupAxisConfig,
  rawGroupValues: readonly GroupValue[],
  displayGroupValues: readonly GroupValue[],
  numericGroupValueOffsets: readonly number[] | null = null
): GroupValues {
  const parsedGroupValues = getParsedGroupValues(groupAxisConfig, displayGroupValues);
  const numericGroupValues = getNumericGroupValues(groupAxisConfig, parsedGroupValues, numericGroupValueOffsets);
  return {
    raw: rawGroupValues,
    display: displayGroupValues,
    parsed: parsedGroupValues,
    numeric: numericGroupValues
  };
}

function getRawGroupValues(_groupAxisConfig: GroupAxisConfig, dataProvider: DataProvider): readonly GroupValue[] {
  // TODO - should perhaps ensure that groupAxisConfig.property matches dataProvider.getGroupProperty()
  // TODO - should perhaps ensure that group values are unique, not-undefined, and even sorted
  return dataProvider.getGroupValues();
}

function getDisplayGroupValues(rawGroupValues: readonly GroupValue[], dataProvider: DataProvider, groupDisplayProperty: string): GroupValue[] {
  const displayGroupValues: GroupValue[] = [];
  const groupCount = rawGroupValues.length;
  for (let groupIndex = 0; groupIndex < groupCount; groupIndex++) {
    displayGroupValues.push(dataProvider.getSeriesValue(rawGroupValues[groupIndex], groupIndex, groupDisplayProperty) as GroupValue);
  }
  return displayGroupValues;
}

function getParsedGroupValues(groupAxisConfig: GroupAxisConfig, groupValues: readonly GroupValue[]): readonly GroupValue[] {
  let parsedGroupValues: readonly GroupValue[] = groupValues;
  if (groupAxisConfig.type === TYPE_DATE) {
    parsedGroupValues = [];
    for (let groupValue of groupValues) {
      (parsedGroupValues as Date[]).push(groupValue instanceof Date ? new Date(groupValue.getTime()) : new Date(groupValue));
    }
  }
  return parsedGroupValues;
}

export function getNumericGroupValues(
  groupAxisConfig: GroupAxisConfig,
  parsedGroupValues: readonly GroupValue[],
  numericGroupValueOffsets: readonly number[] | null = null
): number[] {
  let numericGroupValues: number[];
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
      numericGroupValues.push((groupValue as Date).getTime());
    }
  }
  else {
    numericGroupValues = parsedGroupValues.map(groupValue => typeof groupValue === 'number' ? groupValue : Number(groupValue));
  }
  return numericGroupValues;
}

function getGroupAxisDomain(groupAxisConfig: GroupAxisConfig, parsedGroupValues: readonly GroupValue[]): GroupAxisDomain {
  if (groupAxisConfig.scale === SCALE_ORDINAL) {
    return getOrdinalGroupAxisDomain(parsedGroupValues.length);
  }
  else {
    return getLinearGroupAxisDomain(groupAxisConfig, parsedGroupValues)
  }
}

function getOrdinalGroupAxisDomain(groupCount: number): GroupAxisDomain {
  return [0, groupCount > 0 ? groupCount-1 : 0];
}

function getLinearGroupAxisDomain(groupAxisConfig: GroupAxisConfig, parsedGroupValues: readonly GroupValue[]): GroupAxisDomain {
  const domainValues = parsedGroupValues as readonly (number | Date)[];
  return getAxisDomain(groupAxisConfig, () => getGroupDomainForValues(domainValues));
}

export function getGroupValueObject(groupData: GroupData, groupIndex: number): GroupValueObject {
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
