// The single deep-merge behind every config layering step: plain objects merge recursively, everything else replaces.
// `undefined` means "not specified" and is dropped; `null` is a real value that overrides (a config's way to omit an svg attribute, keeping shapes hit-testable).

type MergeRecord = Record<string, unknown>;

/** A plain data object; arrays, class instances, functions and `null` are values rather than structures. */
export function isPlainObject(value: unknown): value is MergeRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** A copy of `object` without the keys whose value is `undefined`. */
export function withoutUndefined<T extends object>(object: T): T {
  const keys = Object.keys(object);
  const source = object as MergeRecord;
  const keysFiltered = keys.filter(key => source[key] !== undefined);
  if (keysFiltered.length < keys.length) {
    const clone: MergeRecord = Object.create(null);
    for (const key of keysFiltered) {
      clone[key] = source[key];
    }
    return clone as T;
  }
  return object;
}

/** Merge `source` over `target` without mutating either. Key order is target-first, which fixes the order of the svg attributes written from a merged style. */
export function deepMerge<T extends object>(target: T | null | undefined, source: object | null | undefined): T {
  const merged: MergeRecord = Object.create(null); // null proto: a JSON-owned __proto__ key must not rewrite the merged prototype
  if (target) {
    const targetRecord = target as MergeRecord;
    for (const key of Object.keys(targetRecord)) {
      if (targetRecord[key] !== undefined) {
        merged[key] = targetRecord[key];
      }
    }
  }
  if (source) {
    const sourceRecord = source as MergeRecord;
    for (const key of Object.keys(sourceRecord)) {
      const sourceValue = sourceRecord[key];
      if (sourceValue === undefined) {
        continue;
      }
      const targetValue = merged[key];
      merged[key] = (isPlainObject(targetValue) && isPlainObject(sourceValue))
        ? deepMerge(targetValue, sourceValue)
        : sourceValue;
    }
  }
  return merged as T;
}

/** `deepMerge` over a list of layers, each merged over the ones before it. */
export function deepMergeAll<T extends object>(...layers: (object | null | undefined)[]): T {
  let merged: MergeRecord = {};
  for (const layer of layers) {
    merged = deepMerge(merged, layer);
  }
  return merged as T;
}

/** A fully independent copy: plain objects and arrays are copied recursively, dates are copied, anything else passes through by reference. */
export function deepClone<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(deepClone) as T;
  }
  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }
  if (isPlainObject(value)) {
    const clone: MergeRecord = Object.create(null); // null proto: a JSON-owned __proto__ key must not rewrite the clone prototype
    for (const key of Object.keys(value)) {
      clone[key] = deepClone(value[key]);
    }
    return clone as T;
  }
  return value;
}
