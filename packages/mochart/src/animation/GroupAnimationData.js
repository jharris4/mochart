import { NONE, SCALE_ORDINAL } from '../config/core/constants';
import { getValuesAtIndices, getMaxAbsoluteValue } from '../utils/utils';
import { getNumericGroupValues } from '../data/GroupData';

export function getInitialGroupDeltaData(groupAxisConfig, newGroupData) {
  let indices = newGroupData.values.raw.map((v, i) => i);
  return {
    values: {
      old: [],
      merged: newGroupData.values.raw,
      added: newGroupData.values.raw,
      removed: [],
      new: newGroupData.values.raw
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

export function getGroupDeltaData(groupAxisConfig, oldGroupData, newGroupData) {
  // *** It is assumed that all rawGroup values are pre-sorted, unique, and not undefined
  let getMapKey = (rawGroupValue) => rawGroupValue; // TODO - this is probably no longer needed?
  let groupValuesOld = oldGroupData ? oldGroupData.values.raw : [];
  let groupValuesNew = newGroupData ? newGroupData.values.raw : [];

  let mergedValuesData = getGroupMergedValuesData(groupValuesOld, groupValuesNew, groupAxisConfig.scale !== SCALE_ORDINAL, getMapKey);
  let mergedIndicesData = getGroupMergedIndicesData(groupValuesOld, groupValuesNew, mergedValuesData, getMapKey);
  let mergedOuterCounts = getGroupMergedOuterCountsData(mergedIndicesData);
  mergedValuesData.displayMerged = getGroupMergedDisplayValues(groupAxisConfig, oldGroupData, newGroupData, mergedValuesData, mergedIndicesData);

  return {
    values: mergedValuesData,
    indices: mergedIndicesData,
    outerCounts: mergedOuterCounts
  };
}

export function mergedIndexForNewIndex(groupDeltaData, newGroupIndex) {
  return groupDeltaData.indices.new[newGroupIndex];
}

export function oldIndexForNewIndex(groupDeltaData, newGroupIndex) {
  return groupDeltaData.values.old.indexOf(groupDeltaData.values.new[newGroupIndex]);
}

export function newIndexForMergedIndex(groupDeltaData, mergedGroupIndex) {
  return groupDeltaData.values.new.indexOf(groupDeltaData.values.merged[mergedGroupIndex]);
}

export function newIndexForOldIndex(groupDeltaData, oldGroupIndex) {
  return groupDeltaData.values.new.indexOf(groupDeltaData.values.old[oldGroupIndex]);
}

function getGroupMergedDisplayValues(groupAxisConfig, oldGroupData, newGroupData, mergedValuesData, mergedIndicesData) {
  let displayMerged = mergedValuesData.merged;
  if (groupAxisConfig.displayProperty !== NONE) {
    if (mergedIndicesData.removed.length > 0) {
      displayMerged = mergedValuesData.merged.slice();
      setValuesForIndices(displayMerged, oldGroupData.values.display, mergedIndicesData.old);
      setValuesForIndices(displayMerged, newGroupData.values.display, mergedIndicesData.new);
    }
    else {
      displayMerged = newGroupData.values.display;
    }
  }
  return displayMerged;
}

function setValuesForIndices(targetValues, sourceValues, indicesForValues) {
  if (sourceValues !== void 0) {
    let i, count = sourceValues.length;
    for (i=0; i<count; i++) {
      targetValues[indicesForValues[i]] = sourceValues[i];
    }
  }
}

function getValueToNewIndexMap(values, newValues, getMapKey) {
  let valueToNewIndexMap = {};
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

function getValueToIndexMap(values, getMapKey) {
  let valueToIndexMap = {};
  let i, count = values.length;
  for (i=0; i<count; i++) {
    valueToIndexMap[getMapKey(values[i])] = i;
  }
  return valueToIndexMap;
}

function getMappedIndicesForValues(valueToIndexMap, values, getMapKey) {
  let indices = [];
  let i, count = values.length;
  for (i=0; i<count; i++) {
    indices.push(valueToIndexMap[getMapKey(values[i])]);
  }
  return indices;
}

function getValuesWithIndex(valueToIndexMap, values, index, getMapKey) {
  let matchedValues = [];
  let i, count = values.length;
  for (i=0; i<count; i++) {
    if (valueToIndexMap[getMapKey(values[i])] === index) {
      matchedValues.push(values[i]);
    }

  }
  return matchedValues;
}

export function getMergedNumericValues(groupAxisConfig, oldNumericValues, groupDeltaData) {
  if (groupAxisConfig.scale === SCALE_ORDINAL) {
    const mergedCount = groupDeltaData.values.merged.length;
    let numericValues = [];
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

function getGroupMergedValuesData(groupValuesOld, groupValuesNew, sort, getMapKey) {
  let valueToNewIndexMap = getValueToNewIndexMap(groupValuesOld, groupValuesNew, getMapKey);
  let added = getValuesWithIndex(valueToNewIndexMap, groupValuesNew, void 0, getMapKey);
  let removed = getValuesWithIndex(valueToNewIndexMap, groupValuesOld, -1, getMapKey);
  let merged = getGroupValuesMerged(groupValuesOld, groupValuesNew, removed, added, valueToNewIndexMap, sort, getMapKey);

  return {
    old: groupValuesOld,
    merged,
    added,
    removed,
    new: groupValuesNew
  };
}

function numbersAreAscending(values) {
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

function getGroupMergedIndicesData(groupValuesOld, groupValuesNew, mergedValuesData, getMapKey) {
  let valueToIndexMap = getValueToIndexMap(mergedValuesData.merged, getMapKey);
  let oldIndices = getMappedIndicesForValues(valueToIndexMap, groupValuesOld, getMapKey);
  return {
    old: oldIndices,
    new: getMappedIndicesForValues(valueToIndexMap, groupValuesNew, getMapKey),
    added: getMappedIndicesForValues(valueToIndexMap, mergedValuesData.added, getMapKey),
    removed: getMappedIndicesForValues(valueToIndexMap, mergedValuesData.removed, getMapKey),
    reordered: !numbersAreAscending(oldIndices)
  };
}

function getGroupMergedOuterCountsData(mergedIndicesData) {
  return {
    added: getGroupChangedOuterCountsData(mergedIndicesData.old, mergedIndicesData.added),
    removed: getGroupChangedOuterCountsData(mergedIndicesData.new, mergedIndicesData.removed)
  }
}

function getGroupChangedOuterCountsData(comparatorIndices, indices) {
  return {
    before: getBeforeCounts(comparatorIndices, indices),
    after: getAfterCounts(comparatorIndices, indices)
  };
}

export function hasGroupAdditions(groupDeltaData) {
  return groupDeltaData.values.added.length > 0;
}

export function hasGroupRemovals(groupDeltaData) {
  return groupDeltaData.values.removed.length > 0;
}

export function hasGroupReorder(groupDeltaData) {
  return groupDeltaData.indices.reordered;
}

export function hasNumericValueOffsets(groupAxisConfig, groupData) {
  return groupAxisConfig.scale === SCALE_ORDINAL && groupData.values.numeric.some((v, i) => v !== i);
}

export function getNumericValueOffsets(groupAxisConfig, groupData) {
  if (groupAxisConfig.scale === SCALE_ORDINAL) {
    let offsets = groupData.values.numeric.map((v, i) => i - v);
    return offsets.some(o => o !== 0) ? offsets : null;
  }
  else {
    return null;
  }
}

export function getNumericValuesWithoutOffsets(groupData) {
  return groupData.values.numeric.map((v, i) => i);
}

export function hasGroupChanges(groupDeltaData) {
  return hasGroupAdditions(groupDeltaData) || hasGroupRemovals(groupDeltaData) || hasGroupReorder(groupDeltaData);
}

function getGroupValuesMerged(groupValuesOld, groupValuesNew, groupValuesRemoved, groupValuesAdded,
                              oldGroupValueToNewIndexMap, sort, getMapKey) {
  let groupValuesMerged;
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
function getGroupValuesMergedSorted(groupValuesRemoved, groupValuesNew) {
  let groupValuesMerged = [];
  let removedLength = groupValuesRemoved.length;
  let newLength = groupValuesNew.length;
  let mergedLength = removedLength + newLength;
  let removedIndex = 0;
  let newIndex = 0;
  for (let i = 0; i < mergedLength; i++) {
    if (removedIndex < removedLength && newIndex < newLength) {
      if (groupValuesRemoved[removedIndex] < groupValuesNew[newIndex]) {
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
function getGroupValuesMergedOrdered(groupValuesRemoved, groupValuesNew, groupValuesOld, oldGroupValueToNewIndexMap, getMapKey) {

  if (groupValuesRemoved.length === groupValuesOld.length) {
    return groupValuesOld.concat(groupValuesNew);
  }

  let valueToOldIndexMap = getValueToNewIndexMap(groupValuesNew, groupValuesOld, getMapKey);

  let oldNewIndices = getMappedIndicesForValues(oldGroupValueToNewIndexMap, groupValuesOld, getMapKey);

  let groupValuesMerged = [];
  // loop through the new indices of group values forwards, and then backwards, so we can find the closest non-removed
  // old-group value index for each group value that was removed.
  // If the closest non-removed index is before, add 0.5 from its index so the removed group will appear after it.
  // If the closest non-removed index is after, subtract 0.5 from its index so the removed group will appear before it.
  let oldTargetIndices = [];
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

  let oldInsertIndices = [];
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

function getBeforeCounts(comparatorIndices, indices) {
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

function getAfterCounts(comparatorIndices, indices) {
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

export function getExpansionGroupValueDeltaData(groupAxisConfig, groupDeltaData, prevChartData, newChartData, groupAxisDomain) {
  let groupValueDeltaData = null;
  if (groupAxisConfig.scale === SCALE_ORDINAL)   {
    if (hasGroupAdditions(groupDeltaData)) {
      groupValueDeltaData = getOrdinalGroupValueDeltaData(prevChartData.groupData.values.numeric, groupDeltaData.indices.old, groupAxisDomain);
    }
  }
  return groupValueDeltaData;
}

export function getCollapseGroupValueDeltaData(groupAxisConfig, groupDeltaData, prevChartData, newChartData, groupAxisDomain) {
  let groupValueDeltaData = null;
  if (groupAxisConfig.scale === SCALE_ORDINAL) {
    if (hasGroupRemovals(groupDeltaData)) {
      groupValueDeltaData = getOrdinalGroupValueDeltaData(prevChartData.groupData.values.numeric, newChartData.groupData.values.numeric, groupAxisDomain);
    }
  }
  return groupValueDeltaData;
}

function getOrdinalGroupValueDeltaData(oldNumericValues, newNumericValues, groupAxisDomain) {
  let deltas = [];
  let i, count = oldNumericValues.length;
  for (i = 0; i < count; i++) {
    deltas.push(newNumericValues[i] - oldNumericValues[i]);
  }
  return {
    start: oldNumericValues,
    deltas,
    deltaPercentage: getMaxAbsoluteValue(deltas) / groupAxisDomain[1],
    end: newNumericValues
  }
}

const noDelta = {
  deltaPercentage: 0,
  deltaFactor: 0,
  deltas: []
}

export function createGroupOrderDeltaData(mochartConfig, startChartData, endChartData, ordinalGroupOrderOffets) {
  const { groupAxisConfig } = mochartConfig;
  if (groupAxisConfig.scale !== SCALE_ORDINAL || ordinalGroupOrderOffets === null) {
    return noDelta;
  }
  else {
    return {
      start: startChartData.groupData.values.numeric,
      deltas: ordinalGroupOrderOffets,
      deltaPercentage: getMaxAbsoluteValue(ordinalGroupOrderOffets) / endChartData.groupData.axisDomain[1],
      end: endChartData.groupData.values.numeric
    };
  }
}

export function setGroupOrderDeltaFactors(groupOrderDeltaData, deltaPercentage) {
  if (groupOrderDeltaData.deltaPercentage !== 0) {
    groupOrderDeltaData.deltaFactor = deltaPercentage / groupOrderDeltaData.deltaPercentage;
  }
}