import { NONE, SCALE_ORDINAL } from '../config/core/constants';
import { getValuesAtIndices, getMaxAbsoluteValue } from '../utils/utils';
import { getNumericGroupValues } from '../data/GroupData';
import type { GroupAxisConfig, MochartConfig } from '../types/config';
import type { GroupAxisDomain, GroupData, GroupValue } from '../types/data';
import type {
  CompleteNumericArrayDelta,
  GroupDeltaData,
  GroupMergedIndicesData,
  GroupMergedValuesData,
  NumericArrayDelta,
  OuterChangeCounts
} from '../types/animation';

type GroupMapKey = string;
type GroupMapKeyAccessor = (value: GroupValue) => GroupMapKey;
type GroupIndexMap = Record<GroupMapKey, number | undefined>;
type GroupMergedValuesWithoutDisplay = Omit<GroupMergedValuesData, 'displayMerged'>;
type ChartDataWithGroups = { groupData: GroupData };

function groupMapKey(value: GroupValue): GroupMapKey {
  return String(value);
}

function groupValueIsLess(left: GroupValue, right: GroupValue): boolean {
  if (typeof left === 'string' && typeof right === 'string') {
    return left < right;
  }
  const leftValue = left instanceof Date ? left.getTime() : Number(left);
  const rightValue = right instanceof Date ? right.getTime() : Number(right);
  return leftValue < rightValue;
}

export function getInitialGroupDeltaData(_groupAxisConfig: GroupAxisConfig, newGroupData: GroupData): GroupDeltaData {
  const indices = newGroupData.values.raw.map((_value, index) => index);
  return {
    values: {
      old: [],
      merged: newGroupData.values.raw,
      added: newGroupData.values.raw,
      removed: [],
      new: newGroupData.values.raw,
      displayMerged: newGroupData.values.display
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

export function getGroupDeltaData(groupAxisConfig: GroupAxisConfig, oldGroupData: GroupData, newGroupData: GroupData): GroupDeltaData {
  // *** It is assumed that all rawGroup values are pre-sorted, unique, and not undefined
  const groupValuesOld = oldGroupData.values.raw;
  const groupValuesNew = newGroupData.values.raw;

  const mergedValuesWithoutDisplay = getGroupMergedValuesData(groupValuesOld, groupValuesNew, groupAxisConfig.scale !== SCALE_ORDINAL, groupMapKey);
  const mergedIndicesData = getGroupMergedIndicesData(groupValuesOld, groupValuesNew, mergedValuesWithoutDisplay, groupMapKey);
  const mergedOuterCounts = getGroupMergedOuterCountsData(mergedIndicesData);
  const mergedValuesData: GroupMergedValuesData = {
    ...mergedValuesWithoutDisplay,
    displayMerged: getGroupMergedDisplayValues(groupAxisConfig, oldGroupData, newGroupData, mergedValuesWithoutDisplay, mergedIndicesData)
  };

  return {
    values: mergedValuesData,
    indices: mergedIndicesData,
    outerCounts: mergedOuterCounts
  };
}

export function mergedIndexForNewIndex(groupDeltaData: GroupDeltaData, newGroupIndex: number): number {
  return groupDeltaData.indices.new[newGroupIndex];
}

export function oldIndexForNewIndex(groupDeltaData: GroupDeltaData, newGroupIndex: number): number {
  return groupDeltaData.values.old.indexOf(groupDeltaData.values.new[newGroupIndex]);
}

export function newIndexForMergedIndex(groupDeltaData: GroupDeltaData, mergedGroupIndex: number): number {
  return groupDeltaData.values.new.indexOf(groupDeltaData.values.merged[mergedGroupIndex]);
}

export function newIndexForOldIndex(groupDeltaData: GroupDeltaData, oldGroupIndex: number): number {
  return groupDeltaData.values.new.indexOf(groupDeltaData.values.old[oldGroupIndex]);
}

function getGroupMergedDisplayValues(
  groupAxisConfig: GroupAxisConfig,
  oldGroupData: GroupData,
  newGroupData: GroupData,
  mergedValuesData: GroupMergedValuesWithoutDisplay,
  mergedIndicesData: GroupMergedIndicesData
): readonly GroupValue[] {
  let displayMerged: readonly GroupValue[] = mergedValuesData.merged;
  if (groupAxisConfig.displayProperty !== NONE) {
    if (mergedIndicesData.removed.length > 0) {
      const mutableDisplayMerged = mergedValuesData.merged.slice();
      setValuesForIndices(mutableDisplayMerged, oldGroupData.values.display, mergedIndicesData.old);
      setValuesForIndices(mutableDisplayMerged, newGroupData.values.display, mergedIndicesData.new);
      displayMerged = mutableDisplayMerged;
    }
    else {
      displayMerged = newGroupData.values.display;
    }
  }
  return displayMerged;
}

function setValuesForIndices(targetValues: GroupValue[], sourceValues: readonly GroupValue[], indicesForValues: readonly number[]): void {
  if (sourceValues !== void 0) {
    let i, count = sourceValues.length;
    for (i=0; i<count; i++) {
      targetValues[indicesForValues[i]] = sourceValues[i];
    }
  }
}

function getValueToNewIndexMap(values: readonly GroupValue[], newValues: readonly GroupValue[], getMapKey: GroupMapKeyAccessor): GroupIndexMap {
  const valueToNewIndexMap: GroupIndexMap = {};
  let i, count = values.length;
  for (i=0; i<count; i++) {
    valueToNewIndexMap[getMapKey(values[i])] = -1;
  }
  count = newValues.length;
  for (i=0; i<count; i++) {
    if (valueToNewIndexMap[getMapKey(newValues[i])] !== void 0) {
      valueToNewIndexMap[getMapKey(newValues[i])] = i;
    }
  }
  return valueToNewIndexMap;
}

function getValueToIndexMap(values: readonly GroupValue[], getMapKey: GroupMapKeyAccessor): GroupIndexMap {
  const valueToIndexMap: GroupIndexMap = {};
  let i, count = values.length;
  for (i=0; i<count; i++) {
    valueToIndexMap[getMapKey(values[i])] = i;
  }
  return valueToIndexMap;
}

function getMappedIndicesForValues(valueToIndexMap: GroupIndexMap, values: readonly GroupValue[], getMapKey: GroupMapKeyAccessor): number[] {
  const indices: number[] = [];
  let i, count = values.length;
  for (i=0; i<count; i++) {
    const index = valueToIndexMap[getMapKey(values[i])];
    if (index === undefined) {
      throw new Error('Group value is missing from the merged index');
    }
    indices.push(index);
  }
  return indices;
}

function getValuesWithIndex(
  valueToIndexMap: GroupIndexMap,
  values: readonly GroupValue[],
  index: number | undefined,
  getMapKey: GroupMapKeyAccessor
): GroupValue[] {
  const matchedValues: GroupValue[] = [];
  let i, count = values.length;
  for (i=0; i<count; i++) {
    if (valueToIndexMap[getMapKey(values[i])] === index) {
      matchedValues.push(values[i]);
    }

  }
  return matchedValues;
}

export function getMergedNumericValues(groupAxisConfig: GroupAxisConfig, oldNumericValues: readonly number[], groupDeltaData: GroupDeltaData): number[] | null {
  if (groupAxisConfig.scale === SCALE_ORDINAL) {
    const mergedCount = groupDeltaData.values.merged.length;
    const numericValues: number[] = [];
    for (let i = 0; i < mergedCount; i++) {
      numericValues.push(i);
    }
    const oldIndices = groupDeltaData.indices.old;
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

function getGroupMergedValuesData(
  groupValuesOld: readonly GroupValue[],
  groupValuesNew: readonly GroupValue[],
  sort: boolean,
  getMapKey: GroupMapKeyAccessor
): GroupMergedValuesWithoutDisplay {
  const valueToNewIndexMap = getValueToNewIndexMap(groupValuesOld, groupValuesNew, getMapKey);
  const added = getValuesWithIndex(valueToNewIndexMap, groupValuesNew, void 0, getMapKey);
  const removed = getValuesWithIndex(valueToNewIndexMap, groupValuesOld, -1, getMapKey);
  const merged = getGroupValuesMerged(groupValuesOld, groupValuesNew, removed, added, valueToNewIndexMap, sort, getMapKey);

  return {
    old: groupValuesOld,
    merged,
    added,
    removed,
    new: groupValuesNew
  };
}

function numbersAreAscending(values: readonly number[]): boolean {
  let count = values.length;
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

function getGroupMergedIndicesData(
  groupValuesOld: readonly GroupValue[],
  groupValuesNew: readonly GroupValue[],
  mergedValuesData: GroupMergedValuesWithoutDisplay,
  getMapKey: GroupMapKeyAccessor
): GroupMergedIndicesData {
  const valueToIndexMap = getValueToIndexMap(mergedValuesData.merged, getMapKey);
  const oldIndices = getMappedIndicesForValues(valueToIndexMap, groupValuesOld, getMapKey);
  return {
    old: oldIndices,
    new: getMappedIndicesForValues(valueToIndexMap, groupValuesNew, getMapKey),
    added: getMappedIndicesForValues(valueToIndexMap, mergedValuesData.added, getMapKey),
    removed: getMappedIndicesForValues(valueToIndexMap, mergedValuesData.removed, getMapKey),
    reordered: !numbersAreAscending(oldIndices)
  };
}

function getGroupMergedOuterCountsData(mergedIndicesData: GroupMergedIndicesData): GroupDeltaData['outerCounts'] {
  return {
    added: getGroupChangedOuterCountsData(mergedIndicesData.old, mergedIndicesData.added),
    removed: getGroupChangedOuterCountsData(mergedIndicesData.new, mergedIndicesData.removed)
  }
}

function getGroupChangedOuterCountsData(comparatorIndices: readonly number[], indices: readonly number[]): OuterChangeCounts {
  return {
    before: getBeforeCounts(comparatorIndices, indices),
    after: getAfterCounts(comparatorIndices, indices)
  };
}

export function hasGroupAdditions(groupDeltaData: GroupDeltaData): boolean {
  return groupDeltaData.values.added.length > 0;
}

export function hasGroupRemovals(groupDeltaData: GroupDeltaData): boolean {
  return groupDeltaData.values.removed.length > 0;
}

export function hasGroupReorder(groupDeltaData: GroupDeltaData): boolean {
  return groupDeltaData.indices.reordered;
}

export function hasNumericValueOffsets(groupAxisConfig: GroupAxisConfig, groupData: GroupData): boolean {
  return groupAxisConfig.scale === SCALE_ORDINAL && groupData.values.numeric.some((v, i) => v !== i);
}

export function getNumericValueOffsets(groupAxisConfig: GroupAxisConfig, groupData: GroupData): number[] | null {
  if (groupAxisConfig.scale === SCALE_ORDINAL) {
    let offsets = groupData.values.numeric.map((v, i) => i - v);
    return offsets.some(o => o !== 0) ? offsets : null;
  }
  else {
    return null;
  }
}

export function getNumericValuesWithoutOffsets(groupData: GroupData): number[] {
  return groupData.values.numeric.map((_value, index) => index);
}

export function hasGroupChanges(groupDeltaData: GroupDeltaData): boolean {
  return hasGroupAdditions(groupDeltaData) || hasGroupRemovals(groupDeltaData) || hasGroupReorder(groupDeltaData);
}

function getGroupValuesMerged(
  groupValuesOld: readonly GroupValue[],
  groupValuesNew: readonly GroupValue[],
  groupValuesRemoved: readonly GroupValue[],
  _groupValuesAdded: readonly GroupValue[],
  oldGroupValueToNewIndexMap: GroupIndexMap,
  sort: boolean,
  getMapKey: GroupMapKeyAccessor
): readonly GroupValue[] {
  let groupValuesMerged: readonly GroupValue[];
  if (sort === false) {
    groupValuesMerged = getGroupValuesMergedOrdered(groupValuesRemoved, groupValuesNew, groupValuesOld, oldGroupValueToNewIndexMap, getMapKey);
  }
  else {
    if (groupValuesRemoved.length > 0) {
      if (groupValuesNew.length === 0) { // all groups were removed, and none were added
        groupValuesMerged = groupValuesOld;
      }
      else {
        groupValuesMerged = getGroupValuesMergedSorted(groupValuesRemoved, groupValuesNew);
      }
    }
    else { // no groups removed, all old groups present in new groups...
      groupValuesMerged = groupValuesNew;
    }
  }
  return groupValuesMerged;
}

// Returns a merged list of group values for the inputs, where the result is sorted by value
function getGroupValuesMergedSorted(groupValuesRemoved: readonly GroupValue[], groupValuesNew: readonly GroupValue[]): GroupValue[] {
  const groupValuesMerged: GroupValue[] = [];
  let removedLength = groupValuesRemoved.length;
  let newLength = groupValuesNew.length;
  let mergedLength = removedLength + newLength;
  let removedIndex = 0;
  let newIndex = 0;
  for (let i = 0; i < mergedLength; i++) {
    if (removedIndex < removedLength && newIndex < newLength) {
      if (groupValueIsLess(groupValuesRemoved[removedIndex], groupValuesNew[newIndex])) {
        groupValuesMerged.push(groupValuesRemoved[removedIndex++]);
      }
      else {
        groupValuesMerged.push(groupValuesNew[newIndex++]);
      }
    }
    else if (removedIndex < removedLength) {
      groupValuesMerged.push(groupValuesRemoved[removedIndex++]);
    }
    else {
      groupValuesMerged.push(groupValuesNew[newIndex++]);
    }
  }
  return groupValuesMerged;
}

// Returns a merged list of group values for the inputs, where the result is a best effort to preserve group value ordering
function getGroupValuesMergedOrdered(
  groupValuesRemoved: readonly GroupValue[],
  groupValuesNew: readonly GroupValue[],
  groupValuesOld: readonly GroupValue[],
  oldGroupValueToNewIndexMap: GroupIndexMap,
  getMapKey: GroupMapKeyAccessor
): GroupValue[] {

  if (groupValuesRemoved.length === groupValuesOld.length) {
    return groupValuesOld.concat(groupValuesNew);
  }

  const oldNewIndices = getMappedIndicesForValues(oldGroupValueToNewIndexMap, groupValuesOld, getMapKey);

  const groupValuesMerged: GroupValue[] = [];
  // loop through the new indices of group values forwards, and then backwards, so we can find the closest non-removed
  // old-group value index for each group value that was removed.
  // If the closest non-removed index is before, add 0.5 from its index so the removed group will appear after it.
  // If the closest non-removed index is after, subtract 0.5 from its index so the removed group will appear before it.
  const oldTargetIndices: number[] = [];
  let foundIndex = -1;
  let oldLength = oldNewIndices.length;
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

  // for all old & removed group values we now have the index where they should be inserted in the merged list
  // such that they will remain as close as possible to (non removed) group values that they were adjacent to in the
  // old group value list.

  // now build up the merged list group value by group value, using the (pre-sorted) new group list and old removed list
  // at each step, check whether there is an old removed group value that should be inserted, otherwise insert a new group value.
  // The use of the +/- 0.5 on the old insert indices helps us keep things nicely sorted by occurrence order
  let oldIndex = 0;
  let newIndex = 0;
  let mergedLength = groupValuesRemoved.length + groupValuesNew.length;
  for (let i = 0; i < mergedLength; i++) {
    if (oldIndex < oldInsertIndices.length) {
      let oldNewIndex = oldInsertIndices[oldIndex];
      if (oldNewIndex <= newIndex) {
        groupValuesMerged.push(groupValuesRemoved[oldIndex++]);
      }
      else {
        groupValuesMerged.push(groupValuesNew[newIndex++]);
      }
    }
    else {
      groupValuesMerged.push(groupValuesNew[newIndex++]);
    }
  }
  return groupValuesMerged;
}

function getBeforeCounts(comparatorIndices: readonly number[], indices: readonly number[]): number {
  let beforeCounts = 0;
  if (comparatorIndices.length > 0) {
    let firstComparatorIndex = comparatorIndices[0];
    let length = indices.length;
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
    let lastComparatorIndex = comparatorIndices[comparatorIndices.length-1];
    let length = indices.length;
    for (let i=0; i<length; i++) {
      if (indices[i] > lastComparatorIndex) {
        afterCounts++;
      }
    }
  }
  return afterCounts;
}

export function getExpansionGroupValueDeltaData(
  groupAxisConfig: GroupAxisConfig,
  groupDeltaData: GroupDeltaData,
  prevChartData: ChartDataWithGroups,
  _newChartData: ChartDataWithGroups,
  groupAxisDomain: GroupAxisDomain
): CompleteNumericArrayDelta | null {
  let groupValueDeltaData: CompleteNumericArrayDelta | null = null;
  if (groupAxisConfig.scale === SCALE_ORDINAL)   {
    if (hasGroupAdditions(groupDeltaData)) {
      groupValueDeltaData = getOrdinalGroupValueDeltaData(prevChartData.groupData.values.numeric, groupDeltaData.indices.old, groupAxisDomain);
    }
  }
  return groupValueDeltaData;
}

export function getCollapseGroupValueDeltaData(
  groupAxisConfig: GroupAxisConfig,
  groupDeltaData: GroupDeltaData,
  prevChartData: ChartDataWithGroups,
  newChartData: ChartDataWithGroups,
  groupAxisDomain: GroupAxisDomain
): CompleteNumericArrayDelta | null {
  let groupValueDeltaData: CompleteNumericArrayDelta | null = null;
  if (groupAxisConfig.scale === SCALE_ORDINAL) {
    if (hasGroupRemovals(groupDeltaData)) {
      groupValueDeltaData = getOrdinalGroupValueDeltaData(prevChartData.groupData.values.numeric, newChartData.groupData.values.numeric, groupAxisDomain);
    }
  }
  return groupValueDeltaData;
}

function getOrdinalGroupValueDeltaData(oldNumericValues: number[], newNumericValues: number[], groupAxisDomain: GroupAxisDomain): CompleteNumericArrayDelta {
  const deltas: number[] = [];
  let i, count = oldNumericValues.length;
  for (i = 0; i < count; i++) {
    deltas.push(newNumericValues[i] - oldNumericValues[i]);
  }
  return {
    start: oldNumericValues,
    deltas,
    deltaPercentage: getMaxAbsoluteValue(deltas) / Number(groupAxisDomain[1]),
    end: newNumericValues
  }
}

const noDelta: NumericArrayDelta = {
  deltaPercentage: 0,
  deltaFactor: 0,
  deltas: []
}

export function createGroupOrderDeltaData(
  mochartConfig: MochartConfig,
  startChartData: ChartDataWithGroups,
  endChartData: ChartDataWithGroups,
  ordinalGroupOrderOffets: number[] | null
): NumericArrayDelta {
  const { groupAxisConfig } = mochartConfig;
  if (groupAxisConfig.scale !== SCALE_ORDINAL || ordinalGroupOrderOffets === null) {
    return noDelta;
  }
  else {
    return {
      start: startChartData.groupData.values.numeric,
      deltas: ordinalGroupOrderOffets,
      deltaPercentage: getMaxAbsoluteValue(ordinalGroupOrderOffets) / Number(endChartData.groupData.axisDomain[1]),
      end: endChartData.groupData.values.numeric
    };
  }
}

export function setGroupOrderDeltaFactors(groupOrderDeltaData: NumericArrayDelta, deltaPercentage: number): void {
  if (groupOrderDeltaData.deltaPercentage !== 0) {
    groupOrderDeltaData.deltaFactor = deltaPercentage / groupOrderDeltaData.deltaPercentage;
  }
}
