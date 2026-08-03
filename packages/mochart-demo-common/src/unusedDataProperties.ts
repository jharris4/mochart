import type { MochartConfig } from '@mochart/core';

import type { DataRow } from './types';

/**
 * The set of data properties the chart config actually reads, or null when the
 * config is invalid (no reliable property set — callers should show all data).
 */
export function collectUsedDataProperties(mochartConfig: MochartConfig): Set<string> | null {
  if (!mochartConfig.validation.valid) {
    return null;
  }
  const used = new Set<string>();
  const { groupAxisConfig, seriesConfigs } = mochartConfig;
  addProperty(used, groupAxisConfig.property);
  addProperty(used, groupAxisConfig.displayProperty);
  for (const seriesConfig of seriesConfigs) {
    addProperty(used, seriesConfig.property);
    addProperty(used, seriesConfig.rangeProperty);
    addProperty(used, seriesConfig.markerProperty);
    addProperty(used, seriesConfig.colorProperty);
    addProperty(used, seriesConfig.labelProperty);
    addProperty(used, seriesConfig.tooltipProperty);
    addProperty(used, seriesConfig.errorLowProperty);
    addProperty(used, seriesConfig.errorHighProperty);
  }
  return used;
}

function addProperty(used: Set<string>, property: string | null | undefined): void {
  if (property) {
    used.add(property);
  }
}

export function filterDataProperties(data: DataRow[], usedProperties: Set<string>): DataRow[] {
  return data.map(row => {
    const filtered: DataRow = {};
    for (const key of Object.keys(row)) {
      if (usedProperties.has(key)) {
        filtered[key] = row[key];
      }
    }
    return filtered;
  });
}

/**
 * Rebuild full rows from a filtered (used-properties-only) view: properties the
 * view hid are restored by index from fullRows; edits made in the view win.
 */
export function restoreHiddenDataProperties(viewRows: DataRow[], fullRows: DataRow[], usedProperties: Set<string>): DataRow[] {
  return viewRows.map((row, index) => {
    const fullRow = fullRows[index];
    if (!fullRow) {
      return row;
    }
    const merged: DataRow = { ...row };
    for (const key of Object.keys(fullRow)) {
      if (!usedProperties.has(key) && !(key in merged)) {
        merged[key] = fullRow[key];
      }
    }
    return merged;
  });
}
