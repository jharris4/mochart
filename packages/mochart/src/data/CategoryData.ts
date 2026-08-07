import { getCategoryDomainForValues } from './DomainData';
import { getAxisDomain } from './AxisDomainData';
import { NONE, TYPE_DATE, SCALE_ORDINAL } from '../config/core/constants';
import type { CategoryAxisConfig } from '../types/config';
import type {
  DataProvider,
  CategoryAxisDomain,
  CategoryData,
  CategoryValue,
  CategoryValueObject,
  CategoryValues
} from '../types/data';

export function getCategoryData(categoryAxisConfig: CategoryAxisConfig, dataProvider: DataProvider): CategoryData {
  const rawCategoryValues = getRawCategoryValues(categoryAxisConfig, dataProvider);
  let displayCategoryValues: readonly CategoryValue[] = rawCategoryValues;
  if (categoryAxisConfig.displayProperty !== NONE) {
    displayCategoryValues = getDisplayCategoryValues(rawCategoryValues, dataProvider, categoryAxisConfig.displayProperty);
  }
  return getCategoryDataFromValues(categoryAxisConfig, rawCategoryValues, displayCategoryValues);
}

export function getCategoryDataFromValues(
  categoryAxisConfig: CategoryAxisConfig,
  rawCategoryValues: readonly CategoryValue[],
  displayCategoryValues: readonly CategoryValue[],
  numericCategoryValueOffsets: readonly number[] | null = null
): CategoryData {
  const categoryValues = getCategoryValues(categoryAxisConfig, rawCategoryValues, displayCategoryValues, numericCategoryValueOffsets);
  const axisDomain = getCategoryAxisDomain(categoryAxisConfig, categoryValues.parsed);

  return {
    axisDomain,
    values: categoryValues
  };
}

export function getCategoryDataWithAxisDomain(categoryData: CategoryData, axisDomain: CategoryAxisDomain): CategoryData {
  return Object.assign({}, categoryData, { axisDomain });
}

export function getCategoryDataWithNumericValues(categoryData: CategoryData, numericValues: number[]): CategoryData {
  const values = Object.assign({}, categoryData.values, { numeric: numericValues });
  return Object.assign({}, categoryData, { values });
}

function getCategoryValues(
  categoryAxisConfig: CategoryAxisConfig,
  rawCategoryValues: readonly CategoryValue[],
  displayCategoryValues: readonly CategoryValue[],
  numericCategoryValueOffsets: readonly number[] | null = null
): CategoryValues {
  const parsedCategoryValues = getParsedCategoryValues(categoryAxisConfig, displayCategoryValues);
  const numericCategoryValues = getNumericCategoryValues(categoryAxisConfig, parsedCategoryValues, numericCategoryValueOffsets);
  return {
    raw: rawCategoryValues,
    display: displayCategoryValues,
    parsed: parsedCategoryValues,
    numeric: numericCategoryValues
  };
}

function getRawCategoryValues(_categoryAxisConfig: CategoryAxisConfig, dataProvider: DataProvider): readonly CategoryValue[] {
  // config/provider mismatches and duplicate/undefined categories are getDataErrors' job; this hot path trusts its input
  return dataProvider.getCategoryValues();
}

function getDisplayCategoryValues(rawCategoryValues: readonly CategoryValue[], dataProvider: DataProvider, categoryDisplayProperty: string): CategoryValue[] {
  const displayCategoryValues: CategoryValue[] = [];
  const categoryCount = rawCategoryValues.length;
  for (let categoryIndex = 0; categoryIndex < categoryCount; categoryIndex++) {
    displayCategoryValues.push(dataProvider.getSeriesValue(rawCategoryValues[categoryIndex], categoryIndex, categoryDisplayProperty) as CategoryValue);
  }
  return displayCategoryValues;
}

function getParsedCategoryValues(categoryAxisConfig: CategoryAxisConfig, categoryValues: readonly CategoryValue[]): readonly CategoryValue[] {
  let parsedCategoryValues: readonly CategoryValue[] = categoryValues;
  if (categoryAxisConfig.type === TYPE_DATE) {
    parsedCategoryValues = [];
    for (const categoryValue of categoryValues) {
      (parsedCategoryValues as Date[]).push(categoryValue instanceof Date ? new Date(categoryValue.getTime()) : new Date(categoryValue));
    }
  }
  return parsedCategoryValues;
}

export function getNumericCategoryValues(
  categoryAxisConfig: CategoryAxisConfig,
  parsedCategoryValues: readonly CategoryValue[],
  numericCategoryValueOffsets: readonly number[] | null = null
): number[] {
  let numericCategoryValues: number[];
  if (categoryAxisConfig.scale === SCALE_ORDINAL) {
    numericCategoryValues = [];
    const categoryCount = parsedCategoryValues.length;
    if (numericCategoryValueOffsets !== null) {
      for (let ordinalIndex = 0; ordinalIndex < categoryCount; ordinalIndex++) {
        numericCategoryValues.push(ordinalIndex - numericCategoryValueOffsets[ordinalIndex]);
      }
    }
    else {
      for (let ordinalIndex = 0; ordinalIndex < categoryCount; ordinalIndex++) {
        numericCategoryValues.push(ordinalIndex);
      }
    }
  }
  else if (categoryAxisConfig.type === TYPE_DATE) {
    numericCategoryValues = [];
    for (const categoryValue of parsedCategoryValues) {
      numericCategoryValues.push((categoryValue as Date).getTime());
    }
  }
  else {
    numericCategoryValues = parsedCategoryValues.map(categoryValue => typeof categoryValue === 'number' ? categoryValue : Number(categoryValue));
  }
  return numericCategoryValues;
}

function getCategoryAxisDomain(categoryAxisConfig: CategoryAxisConfig, parsedCategoryValues: readonly CategoryValue[]): CategoryAxisDomain {
  if (categoryAxisConfig.scale === SCALE_ORDINAL) {
    return getOrdinalCategoryAxisDomain(parsedCategoryValues.length);
  }
  else {
    return getLinearCategoryAxisDomain(categoryAxisConfig, parsedCategoryValues)
  }
}

function getOrdinalCategoryAxisDomain(categoryCount: number): CategoryAxisDomain {
  return [0, categoryCount > 0 ? categoryCount-1 : 0];
}

function getLinearCategoryAxisDomain(categoryAxisConfig: CategoryAxisConfig, parsedCategoryValues: readonly CategoryValue[]): CategoryAxisDomain {
  const domainValues = parsedCategoryValues as readonly (number | Date)[];
  return getAxisDomain(categoryAxisConfig, () => getCategoryDomainForValues(domainValues));
}

export function getCategoryValueObject(categoryData: CategoryData, categoryIndex: number): CategoryValueObject {
  const { axisDomain, values } = categoryData;
  return {
    axisDomain,
    values: {
      raw: values.raw[categoryIndex],
      display: values.display[categoryIndex],
      parsed: values.parsed[categoryIndex],
      numeric: values.numeric[categoryIndex]
    }
  };
}
