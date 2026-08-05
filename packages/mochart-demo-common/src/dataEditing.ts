import { ArrayOfObjectsDataProvider, getDataErrors } from '@mochart/core';
import type { DataProvider } from '@mochart/core';

import buildMochartDemoConfig from './mochartDemoConfig';
import { filterDataProperties, restoreHiddenDataProperties } from './unusedDataProperties';

import type { DataRow, DemoConfig, MochartDemoConfig } from './types';

/**
 * Compact JSON with a space after each structural comma — built structurally
 * so commas inside string values stay untouched.
 */
export function stringifyWithSpacedCommas(value: unknown): string {
  if (Array.isArray(value)) {
    return '[' + value.map(item => stringifyWithSpacedCommas(item)).join(', ') + ']';
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return '{' + Object.keys(record)
      .filter(key => record[key] !== undefined)
      .map(key => JSON.stringify(key) + ':' + stringifyWithSpacedCommas(record[key]))
      .join(', ') + '}';
  }
  const json = JSON.stringify(value);
  // JSON.stringify serializes undefined array items as null; match it
  return json === undefined ? 'null' : json;
}

export function formatData(dataJSON: unknown): string {
  if (!Array.isArray(dataJSON)) {
    return stringifyWithSpacedCommas(dataJSON);
  }
  // one row per line, matching the old regex-based layout
  return '[' + dataJSON.map(row => stringifyWithSpacedCommas(row)).join(',\n ') + ']';
}

/**
 * Format the data-tab textarea view of fullRows, hiding properties outside
 * viewUsedProperties (null = show every property).
 */
export function formatDataView(fullRows: DataRow[], viewUsedProperties: Set<string> | null): string {
  return formatData(viewUsedProperties === null ? fullRows : filterDataProperties(fullRows, viewUsedProperties));
}

export function isObject(v: unknown): boolean {
  return v !== null && v !== undefined && typeof v === 'object';
}

export function isArrayOfObjects(candidate: unknown): boolean {
  return Array.isArray(candidate) && !candidate.some(v => !isObject(v));
}

export function getJsonError(text: string): string | null {
  try {
    JSON.parse(text);
    return null;
  }
  catch {
    return 'Invalid JSON';
  }
}

export type ParsedFullData = { full: DataRow[] } | { error: 'json' | 'data' };

/**
 * Parse edited data-tab text back to a full dataset. When the text is a
 * filtered (used-properties-only) view, properties the view hid are restored
 * by row index from fullData.
 */
export function parseFullData(text: string, fullData: DataRow[], viewUsedProperties: Set<string> | null, categoryProperty?: string | null): ParsedFullData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  }
  catch {
    return { error: 'json' };
  }
  if (!isArrayOfObjects(parsed)) {
    return { error: 'data' };
  }
  const rows = parsed as DataRow[];
  return { full: viewUsedProperties === null ? rows : restoreHiddenDataProperties(rows, fullData, viewUsedProperties, categoryProperty) };
}

export type DataApplyResult =
  | { ok: true; data: DataRow[] }
  | { ok: false; errorMessage: string; callbackError: string };

/**
 * Parse and validate a data-tab edit for Apply: the footer error message and
 * the onDataError payload on failure, or the full dataset to apply on success.
 */
export function applyDataEdit(text: string, fullData: DataRow[], viewUsedProperties: Set<string> | null, config: DemoConfig): DataApplyResult {
  // rows are matched by category value when restoring hidden properties, so
  // structural view edits (delete/reorder) keep hidden columns with their row
  const categoryProperty = (config as { categoryAxis?: { property?: string } }).categoryAxis?.property ?? null;
  const parsed = parseFullData(text, fullData, viewUsedProperties, categoryProperty);
  if ('error' in parsed) {
    if (parsed.error === 'json') {
      console.warn('Invalid Data JSON');
      return { ok: false, errorMessage: 'Invalid JSON', callbackError: 'Invalid Data ' };
    }
    console.warn('Invalid Data - should be an array of objects');
    return { ok: false, errorMessage: 'Invalid Data — details in the browser console', callbackError: 'Invalid Data' };
  }
  const parsedData = parsed.full;
  let error: string | null = null;
  const { mochartConfig } = buildMochartDemoConfig(config);
  if (mochartConfig.validation.valid) {
    const dataErrors = getDataErrors(mochartConfig, new ArrayOfObjectsDataProvider(parsedData, mochartConfig.categoryAxis.property ?? '') as unknown as DataProvider);
    if (dataErrors.length > 0) {
      console.warn('Invalid Data - Content Errors: ', dataErrors.join('\n'));
      error = 'Invalid Data Content';
    }
  }
  else {
    console.warn('Could not validate data since mochart config was not valid');
    error = 'Invalid Config & Data';
  }
  if (error) {
    return { ok: false, errorMessage: error + ' — details in the browser console', callbackError: error };
  }
  return { ok: true, data: parsedData };
}

/**
 * The native tooltip for the group index stepper label: the selected group's
 * display value when the axis has a displayProperty (that is what the chart
 * shows), otherwise its raw group value. Empty when no group is selected.
 */
export function getCategoryIndexTitle({ mochartConfig }: MochartDemoConfig, rows: DataRow[], categoryIndex: number): string {
  const row = categoryIndex >= 0 ? rows[categoryIndex] : undefined;
  if (row === undefined) {
    return '';
  }
  const { categoryAxis: categoryAxisConfig } = mochartConfig;
  const property = categoryAxisConfig.displayProperty ?? categoryAxisConfig.property;
  const value = property === null || property === undefined ? undefined : row[property];
  return value === undefined || value === null ? '' : String(value);
}

/** The native tooltip for the series index stepper label: the series title. */
export function getSeriesIndexTitle({ mochartConfig }: MochartDemoConfig, seriesIndex: number): string {
  const seriesConfig = mochartConfig.series[seriesIndex];
  return seriesConfig === undefined ? '' : (seriesConfig.title ?? seriesConfig.id);
}
