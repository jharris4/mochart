import { ArrayOfObjectsDataProvider, getDataErrors } from '@mochart/core';
import type { DataProvider } from '@mochart/core';

import buildMochartDemoConfig from './mochartDemoConfig';
import { filterDataProperties, restoreHiddenDataProperties } from './unusedDataProperties';

import type { DataRow, DemoConfig } from './types';

export function formatData(dataJSON: unknown): string {
  return JSON.stringify(dataJSON).replace(/,/g, ', ').replace(/},/g, '},\n');
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
  catch (error) {
    return 'Invalid JSON';
  }
}

export type ParsedFullData = { full: DataRow[] } | { error: 'json' | 'data' };

/**
 * Parse edited data-tab text back to a full dataset. When the text is a
 * filtered (used-properties-only) view, properties the view hid are restored
 * by row index from fullData.
 */
export function parseFullData(text: string, fullData: DataRow[], viewUsedProperties: Set<string> | null): ParsedFullData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  }
  catch (error) {
    return { error: 'json' };
  }
  if (!isArrayOfObjects(parsed)) {
    return { error: 'data' };
  }
  const rows = parsed as DataRow[];
  return { full: viewUsedProperties === null ? rows : restoreHiddenDataProperties(rows, fullData, viewUsedProperties) };
}

export type DataApplyResult =
  | { ok: true; data: DataRow[] }
  | { ok: false; errorMessage: string; callbackError: string };

/**
 * Parse and validate a data-tab edit for Apply: the footer error message and
 * the onDataError payload on failure, or the full dataset to apply on success.
 */
export function applyDataEdit(text: string, fullData: DataRow[], viewUsedProperties: Set<string> | null, config: DemoConfig): DataApplyResult {
  const parsed = parseFullData(text, fullData, viewUsedProperties);
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
    const dataErrors = getDataErrors(mochartConfig, new ArrayOfObjectsDataProvider(parsedData, mochartConfig.groupAxisConfig.property ?? '') as unknown as DataProvider);
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
