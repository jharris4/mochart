import { NONE, SCALE_ORDINAL } from '../config/core/constants';
import { getMaxAbsoluteValue } from '../utils/utils';
import type { CategoryAxisConfig } from '../types/config';
import type { EnhancedMochartConfig } from '../types/enhanced';
import type { CategoryAxisDomain, CategoryData, CategoryValue } from '../types/data';
import type {
  CompleteNumericArrayDelta,
  CategoryDeltaData,
  CategoryMergedIndicesData,
  CategoryMergedValuesData,
  NumericArrayDelta,
  OuterChangeCounts
} from '../types/animation';

type CategoryMapKey = string;
type CategoryMapKeyAccessor = (value: CategoryValue) => CategoryMapKey;
type CategoryIndexMap = Record<CategoryMapKey, number | undefined>;
type CategoryMergedValuesWithoutDisplay = Omit<CategoryMergedValuesData, 'displayMerged'>;
type ChartDataWithCategories = { categoryData: CategoryData };

function categoryMapKey(value: CategoryValue): CategoryMapKey {
  // Dates key by time value: String(Date) is slow and only second-precise.
  return value instanceof Date ? '' + value.getTime() : String(value);
}

/** indexOf by the merge keying: Date category values compare by value, not identity. */
export function indexOfCategoryValue(values: readonly CategoryValue[], value: CategoryValue): number {
  const key = categoryMapKey(value);
  for (let i = 0; i < values.length; i++) {
    if (categoryMapKey(values[i]) === key) {
      return i;
    }
  }
  return -1;
}

function categoryValueIsLess(left: CategoryValue, right: CategoryValue): boolean {
  if (typeof left === 'string' && typeof right === 'string') {
    return left < right;
  }
  const leftValue = left instanceof Date ? left.getTime() : Number(left);
  const rightValue = right instanceof Date ? right.getTime() : Number(right);
  return leftValue < rightValue;
}

export function getInitialCategoryDeltaData(_categoryAxisConfig: CategoryAxisConfig, newCategoryData: CategoryData): CategoryDeltaData {
  const indices = newCategoryData.values.raw.map((_value, index) => index);
  return {
    values: {
      old: [],
      merged: newCategoryData.values.raw,
      added: newCategoryData.values.raw,
      removed: [],
      new: newCategoryData.values.raw,
      displayMerged: newCategoryData.values.display
    },
    indices: {
      old: [],
      new: indices,
      added: indices,
      removed: [],
      reordered: false
    },
    outerCounts: {
      added: {
        before: 0,
        after: 0
      },
      removed: {
        before: 0,
        after: 0
      }
    }
  };
}

export function getCategoryDeltaData(categoryAxisConfig: CategoryAxisConfig, oldCategoryData: CategoryData, newCategoryData: CategoryData): CategoryDeltaData {
  // *** It is assumed that all rawCategory values are pre-sorted, unique, and not undefined
  const categoryValuesOld = oldCategoryData.values.raw;
  const categoryValuesNew = newCategoryData.values.raw;

  const mergedValuesWithoutDisplay = getCategoryMergedValuesData(categoryValuesOld, categoryValuesNew, categoryAxisConfig.scale !== SCALE_ORDINAL, categoryMapKey);
  const mergedIndicesData = getCategoryMergedIndicesData(categoryValuesOld, categoryValuesNew, mergedValuesWithoutDisplay, categoryMapKey);
  const mergedOuterCounts = getCategoryMergedOuterCountsData(mergedIndicesData);
  const mergedValuesData: CategoryMergedValuesData = {
    ...mergedValuesWithoutDisplay,
    displayMerged: getCategoryMergedDisplayValues(categoryAxisConfig, oldCategoryData, newCategoryData, mergedValuesWithoutDisplay, mergedIndicesData)
  };

  return {
    values: mergedValuesData,
    indices: mergedIndicesData,
    outerCounts: mergedOuterCounts
  };
}

export function mergedIndexForNewIndex(categoryDeltaData: CategoryDeltaData, newCategoryIndex: number): number {
  return categoryDeltaData.indices.new[newCategoryIndex];
}

export function oldIndexForNewIndex(categoryDeltaData: CategoryDeltaData, newCategoryIndex: number): number {
  return indexOfCategoryValue(categoryDeltaData.values.old, categoryDeltaData.values.new[newCategoryIndex]);
}

export function newIndexForMergedIndex(categoryDeltaData: CategoryDeltaData, mergedCategoryIndex: number): number {
  return indexOfCategoryValue(categoryDeltaData.values.new, categoryDeltaData.values.merged[mergedCategoryIndex]);
}

export function newIndexForOldIndex(categoryDeltaData: CategoryDeltaData, oldCategoryIndex: number): number {
  return indexOfCategoryValue(categoryDeltaData.values.new, categoryDeltaData.values.old[oldCategoryIndex]);
}

function getCategoryMergedDisplayValues(
  categoryAxisConfig: CategoryAxisConfig,
  oldCategoryData: CategoryData,
  newCategoryData: CategoryData,
  mergedValuesData: CategoryMergedValuesWithoutDisplay,
  mergedIndicesData: CategoryMergedIndicesData
): readonly CategoryValue[] {
  let displayMerged: readonly CategoryValue[] = mergedValuesData.merged;
  if (categoryAxisConfig.displayProperty !== NONE) {
    if (mergedIndicesData.removed.length > 0) {
      const mutableDisplayMerged = mergedValuesData.merged.slice();
      setValuesForIndices(mutableDisplayMerged, oldCategoryData.values.display, mergedIndicesData.old);
      setValuesForIndices(mutableDisplayMerged, newCategoryData.values.display, mergedIndicesData.new);
      displayMerged = mutableDisplayMerged;
    }
    else {
      displayMerged = newCategoryData.values.display;
    }
  }
  return displayMerged;
}

function setValuesForIndices(targetValues: CategoryValue[], sourceValues: readonly CategoryValue[], indicesForValues: readonly number[]): void {
  if (sourceValues !== undefined) {
    const count = sourceValues.length;
    for (let i=0; i<count; i++) {
      targetValues[indicesForValues[i]] = sourceValues[i];
    }
  }
}

function getValueToNewIndexMap(values: readonly CategoryValue[], newValues: readonly CategoryValue[], getMapKey: CategoryMapKeyAccessor): CategoryIndexMap {
  const valueToNewIndexMap: CategoryIndexMap = Object.create(null); // null proto: keyed by user data category values
  let i, count = values.length;
  for (i=0; i<count; i++) {
    valueToNewIndexMap[getMapKey(values[i])] = -1;
  }
  count = newValues.length;
  for (i=0; i<count; i++) {
    if (valueToNewIndexMap[getMapKey(newValues[i])] !== undefined) {
      valueToNewIndexMap[getMapKey(newValues[i])] = i;
    }
  }
  return valueToNewIndexMap;
}

function getValueToIndexMap(values: readonly CategoryValue[], getMapKey: CategoryMapKeyAccessor): CategoryIndexMap {
  const valueToIndexMap: CategoryIndexMap = Object.create(null);
  const count = values.length;
  for (let i=0; i<count; i++) {
    valueToIndexMap[getMapKey(values[i])] = i;
  }
  return valueToIndexMap;
}

function getMappedIndicesForValues(valueToIndexMap: CategoryIndexMap, values: readonly CategoryValue[], getMapKey: CategoryMapKeyAccessor): number[] {
  const indices: number[] = [];
  const count = values.length;
  for (let i=0; i<count; i++) {
    const index = valueToIndexMap[getMapKey(values[i])];
    if (index === undefined) {
      throw new Error('Group value is missing from the merged index');
    }
    indices.push(index);
  }
  return indices;
}

function getValuesWithIndex(
  valueToIndexMap: CategoryIndexMap,
  values: readonly CategoryValue[],
  index: number | undefined,
  getMapKey: CategoryMapKeyAccessor
): CategoryValue[] {
  const matchedValues: CategoryValue[] = [];
  const count = values.length;
  for (let i=0; i<count; i++) {
    if (valueToIndexMap[getMapKey(values[i])] === index) {
      matchedValues.push(values[i]);
    }

  }
  return matchedValues;
}

export function getMergedNumericValues(categoryAxisConfig: CategoryAxisConfig, oldNumericValues: readonly number[], categoryDeltaData: CategoryDeltaData): number[] | null {
  if (categoryAxisConfig.scale === SCALE_ORDINAL) {
    const mergedCount = categoryDeltaData.values.merged.length;
    const numericValues: number[] = [];
    for (let i = 0; i < mergedCount; i++) {
      numericValues.push(i);
    }
    const oldIndices = categoryDeltaData.indices.old;
    const oldCount = oldIndices.length;
    for (let i = 0; i < oldCount; i++) {
      numericValues[oldIndices[i]] = oldNumericValues[i];
    }
    return numericValues;
  }
  else {
    return null;
  }
}

function getCategoryMergedValuesData(
  categoryValuesOld: readonly CategoryValue[],
  categoryValuesNew: readonly CategoryValue[],
  sort: boolean,
  getMapKey: CategoryMapKeyAccessor
): CategoryMergedValuesWithoutDisplay {
  const valueToNewIndexMap = getValueToNewIndexMap(categoryValuesOld, categoryValuesNew, getMapKey);
  const added = getValuesWithIndex(valueToNewIndexMap, categoryValuesNew, undefined, getMapKey);
  const removed = getValuesWithIndex(valueToNewIndexMap, categoryValuesOld, -1, getMapKey);
  const merged = getCategoryValuesMerged(categoryValuesOld, categoryValuesNew, removed, added, valueToNewIndexMap, sort, getMapKey);

  return {
    old: categoryValuesOld,
    merged,
    added,
    removed,
    new: categoryValuesNew
  };
}

function numbersAreAscending(values: readonly number[]): boolean {
  const count = values.length;
  if (count > 1) {
    let last = values[0];
    let current;
    for (let i = 1; i < count; i++) {
      current = values[i];
      if (current < last) {
        return false;
      }
      last = current;
    }
    return true;
  }
  return true;
}

function getCategoryMergedIndicesData(
  categoryValuesOld: readonly CategoryValue[],
  categoryValuesNew: readonly CategoryValue[],
  mergedValuesData: CategoryMergedValuesWithoutDisplay,
  getMapKey: CategoryMapKeyAccessor
): CategoryMergedIndicesData {
  const valueToIndexMap = getValueToIndexMap(mergedValuesData.merged, getMapKey);
  const oldIndices = getMappedIndicesForValues(valueToIndexMap, categoryValuesOld, getMapKey);
  return {
    old: oldIndices,
    new: getMappedIndicesForValues(valueToIndexMap, categoryValuesNew, getMapKey),
    added: getMappedIndicesForValues(valueToIndexMap, mergedValuesData.added, getMapKey),
    removed: getMappedIndicesForValues(valueToIndexMap, mergedValuesData.removed, getMapKey),
    reordered: !numbersAreAscending(oldIndices)
  };
}

function getCategoryMergedOuterCountsData(mergedIndicesData: CategoryMergedIndicesData): CategoryDeltaData['outerCounts'] {
  return {
    added: getCategoryChangedOuterCountsData(mergedIndicesData.old, mergedIndicesData.added),
    removed: getCategoryChangedOuterCountsData(mergedIndicesData.new, mergedIndicesData.removed)
  }
}

function getCategoryChangedOuterCountsData(comparatorIndices: readonly number[], indices: readonly number[]): OuterChangeCounts {
  return {
    before: getBeforeCounts(comparatorIndices, indices),
    after: getAfterCounts(comparatorIndices, indices)
  };
}

export function hasCategoryAdditions(categoryDeltaData: CategoryDeltaData): boolean {
  return categoryDeltaData.values.added.length > 0;
}

export function hasCategoryRemovals(categoryDeltaData: CategoryDeltaData): boolean {
  return categoryDeltaData.values.removed.length > 0;
}

export function hasCategoryReorder(categoryDeltaData: CategoryDeltaData): boolean {
  return categoryDeltaData.indices.reordered;
}

export function hasNumericValueOffsets(categoryAxisConfig: CategoryAxisConfig, categoryData: CategoryData): boolean {
  return categoryAxisConfig.scale === SCALE_ORDINAL && categoryData.values.numeric.some((v, i) => v !== i);
}

export function getNumericValueOffsets(categoryAxisConfig: CategoryAxisConfig, categoryData: CategoryData): number[] | null {
  if (categoryAxisConfig.scale === SCALE_ORDINAL) {
    const offsets = categoryData.values.numeric.map((v, i) => i - v);
    return offsets.some(o => o !== 0) ? offsets : null;
  }
  else {
    return null;
  }
}

export function getNumericValuesWithoutOffsets(categoryData: CategoryData): number[] {
  return categoryData.values.numeric.map((_value, index) => index);
}

export function hasCategoryChanges(categoryDeltaData: CategoryDeltaData): boolean {
  return hasCategoryAdditions(categoryDeltaData) || hasCategoryRemovals(categoryDeltaData) || hasCategoryReorder(categoryDeltaData);
}

function getCategoryValuesMerged(
  categoryValuesOld: readonly CategoryValue[],
  categoryValuesNew: readonly CategoryValue[],
  categoryValuesRemoved: readonly CategoryValue[],
  _categoryValuesAdded: readonly CategoryValue[],
  oldCategoryValueToNewIndexMap: CategoryIndexMap,
  sort: boolean,
  getMapKey: CategoryMapKeyAccessor
): readonly CategoryValue[] {
  let categoryValuesMerged: readonly CategoryValue[];
  if (sort === false) {
    categoryValuesMerged = getCategoryValuesMergedOrdered(categoryValuesRemoved, categoryValuesNew, categoryValuesOld, oldCategoryValueToNewIndexMap, getMapKey);
  }
  else {
    if (categoryValuesRemoved.length > 0) {
      if (categoryValuesNew.length === 0) { // all groups were removed, and none were added
        categoryValuesMerged = categoryValuesOld;
      }
      else {
        categoryValuesMerged = getCategoryValuesMergedSorted(categoryValuesRemoved, categoryValuesNew);
      }
    }
    else { // no groups removed, all old groups present in new groups...
      categoryValuesMerged = categoryValuesNew;
    }
  }
  return categoryValuesMerged;
}

// Returns a merged list of category values for the inputs, where the result is sorted by value
function getCategoryValuesMergedSorted(categoryValuesRemoved: readonly CategoryValue[], categoryValuesNew: readonly CategoryValue[]): CategoryValue[] {
  const categoryValuesMerged: CategoryValue[] = [];
  const removedLength = categoryValuesRemoved.length;
  const newLength = categoryValuesNew.length;
  const mergedLength = removedLength + newLength;
  let removedIndex = 0;
  let newIndex = 0;
  for (let i = 0; i < mergedLength; i++) {
    if (removedIndex < removedLength && newIndex < newLength) {
      if (categoryValueIsLess(categoryValuesRemoved[removedIndex], categoryValuesNew[newIndex])) {
        categoryValuesMerged.push(categoryValuesRemoved[removedIndex++]);
      }
      else {
        categoryValuesMerged.push(categoryValuesNew[newIndex++]);
      }
    }
    else if (removedIndex < removedLength) {
      categoryValuesMerged.push(categoryValuesRemoved[removedIndex++]);
    }
    else {
      categoryValuesMerged.push(categoryValuesNew[newIndex++]);
    }
  }
  return categoryValuesMerged;
}

// Returns a merged list of category values for the inputs, where the result is a best effort to preserve category value ordering
function getCategoryValuesMergedOrdered(
  categoryValuesRemoved: readonly CategoryValue[],
  categoryValuesNew: readonly CategoryValue[],
  categoryValuesOld: readonly CategoryValue[],
  oldCategoryValueToNewIndexMap: CategoryIndexMap,
  getMapKey: CategoryMapKeyAccessor
): CategoryValue[] {

  if (categoryValuesRemoved.length === categoryValuesOld.length) {
    return categoryValuesOld.concat(categoryValuesNew);
  }

  const oldNewIndices = getMappedIndicesForValues(oldCategoryValueToNewIndexMap, categoryValuesOld, getMapKey);

  const categoryValuesMerged: CategoryValue[] = [];
  // loop through the new indices of category values forwards, and then backwards, so we can find the closest non-removed
  // old-category value index for each category value that was removed.
  // If the closest non-removed index is before, add 0.5 from its index so the removed category will appear after it.
  // If the closest non-removed index is after, subtract 0.5 from its index so the removed category will appear before it.
  const oldTargetIndices: number[] = [];
  let foundIndex = -1;
  const oldLength = oldNewIndices.length;
  for (let i = 0; i < oldLength; i++) {
    if (oldNewIndices[i] !== -1) {
      foundIndex = oldNewIndices[i] + 0.5;
    }
    oldTargetIndices[i] = foundIndex;
  }
  foundIndex = -1;
  for (let i = oldLength - 1; i >= 0; i--) {
    if (oldNewIndices[i] !== -1) {
      foundIndex = oldNewIndices[i] - 0.5;
    }
    if (oldTargetIndices[i] === -1) {
      oldTargetIndices[i] = foundIndex;
    }
  }

  const oldInsertIndices: number[] = [];
  for (let i = 0; i < oldLength; i++) {
    if (oldNewIndices[i] === -1) {
      oldInsertIndices.push(oldTargetIndices[i]);
    }
  }

  // for all old & removed category values we now have the index where they should be inserted in the merged list
  // such that they will remain as close as possible to (non removed) category values that they were adjacent to in the
  // old category value list.

  // now build up the merged list category value by category value, using the (pre-sorted) new category list and old removed list
  // at each step, check whether there is an old removed category value that should be inserted, otherwise insert a new category value.
  // The use of the +/- 0.5 on the old insert indices helps us keep things nicely sorted by occurrence order
  let oldIndex = 0;
  let newIndex = 0;
  const mergedLength = categoryValuesRemoved.length + categoryValuesNew.length;
  for (let i = 0; i < mergedLength; i++) {
    if (oldIndex < oldInsertIndices.length) {
      const oldNewIndex = oldInsertIndices[oldIndex];
      if (oldNewIndex <= newIndex) {
        categoryValuesMerged.push(categoryValuesRemoved[oldIndex++]);
      }
      else {
        categoryValuesMerged.push(categoryValuesNew[newIndex++]);
      }
    }
    else {
      categoryValuesMerged.push(categoryValuesNew[newIndex++]);
    }
  }
  return categoryValuesMerged;
}

function getBeforeCounts(comparatorIndices: readonly number[], indices: readonly number[]): number {
  let beforeCounts = 0;
  if (comparatorIndices.length > 0) {
    const firstComparatorIndex = comparatorIndices[0];
    const length = indices.length;
    for (let i=0; i<length; i++) {
      if (indices[i] < firstComparatorIndex) {
        beforeCounts++;
      }
    }
  }
  return beforeCounts;
}

function getAfterCounts(comparatorIndices: readonly number[], indices: readonly number[]): number {
  let afterCounts = 0;
  if (comparatorIndices.length > 0) {
    const lastComparatorIndex = comparatorIndices[comparatorIndices.length-1];
    const length = indices.length;
    for (let i=0; i<length; i++) {
      if (indices[i] > lastComparatorIndex) {
        afterCounts++;
      }
    }
  }
  return afterCounts;
}

export function getExpansionCategoryValueDeltaData(
  categoryAxisConfig: CategoryAxisConfig,
  categoryDeltaData: CategoryDeltaData,
  prevChartData: ChartDataWithCategories,
  _newChartData: ChartDataWithCategories,
  categoryAxisDomain: CategoryAxisDomain
): CompleteNumericArrayDelta | null {
  let categoryValueDeltaData: CompleteNumericArrayDelta | null = null;
  if (categoryAxisConfig.scale === SCALE_ORDINAL)   {
    if (hasCategoryAdditions(categoryDeltaData)) {
      categoryValueDeltaData = getOrdinalCategoryValueDeltaData(prevChartData.categoryData.values.numeric, categoryDeltaData.indices.old, categoryAxisDomain);
    }
  }
  return categoryValueDeltaData;
}

export function getContractionCategoryValueDeltaData(
  categoryAxisConfig: CategoryAxisConfig,
  categoryDeltaData: CategoryDeltaData,
  prevChartData: ChartDataWithCategories,
  newChartData: ChartDataWithCategories,
  categoryAxisDomain: CategoryAxisDomain
): CompleteNumericArrayDelta | null {
  let categoryValueDeltaData: CompleteNumericArrayDelta | null = null;
  if (categoryAxisConfig.scale === SCALE_ORDINAL) {
    if (hasCategoryRemovals(categoryDeltaData)) {
      categoryValueDeltaData = getOrdinalCategoryValueDeltaData(prevChartData.categoryData.values.numeric, newChartData.categoryData.values.numeric, categoryAxisDomain);
    }
  }
  return categoryValueDeltaData;
}

function getOrdinalCategoryValueDeltaData(oldNumericValues: number[], newNumericValues: number[], categoryAxisDomain: CategoryAxisDomain): CompleteNumericArrayDelta {
  const deltas: number[] = [];
  const count = oldNumericValues.length;
  for (let i = 0; i < count; i++) {
    deltas.push(newNumericValues[i] - oldNumericValues[i]);
  }
  return {
    start: oldNumericValues,
    deltas,
    deltaPercentage: getMaxAbsoluteValue(deltas) / Number(categoryAxisDomain[1]),
    end: newNumericValues
  }
}

const noDelta: NumericArrayDelta = {
  deltaPercentage: 0,
  deltaFactor: 0,
  deltas: []
}

export function createCategoryOrderDeltaData(
  mochartConfig: EnhancedMochartConfig,
  startChartData: ChartDataWithCategories,
  endChartData: ChartDataWithCategories,
  ordinalCategoryOrderOffets: number[] | null
): NumericArrayDelta {
  const { categoryAxis: categoryAxisConfig } = mochartConfig;
  if (categoryAxisConfig.scale !== SCALE_ORDINAL || ordinalCategoryOrderOffets === null) {
    return noDelta;
  }
  else {
    return {
      start: startChartData.categoryData.values.numeric,
      deltas: ordinalCategoryOrderOffets,
      deltaPercentage: getMaxAbsoluteValue(ordinalCategoryOrderOffets) / Number(endChartData.categoryData.axisDomain[1]),
      end: endChartData.categoryData.values.numeric
    };
  }
}

export function setCategoryOrderDeltaFactors(categoryOrderDeltaData: NumericArrayDelta, deltaPercentage: number): void {
  if (categoryOrderDeltaData.deltaPercentage !== 0) {
    categoryOrderDeltaData.deltaFactor = deltaPercentage / categoryOrderDeltaData.deltaPercentage;
  }
}
