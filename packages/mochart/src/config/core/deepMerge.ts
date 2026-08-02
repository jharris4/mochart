/**
 * The single deep-merge used by every config layering step (defaults under `*All` configs under the
 * user's config). `undefined` means "not specified" and is dropped from the result; `null` is a real
 * value that overrides a default, because it is how a config says "omit this svg attribute", which is
 * what keeps a shape hit-testable. Plain objects merge recursively; everything else replaces.
 */

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
    const clone: MergeRecord = {};
    for (const key of keysFiltered) {
      clone[key] = source[key];
    }
    return clone as T;
  }
  return object;
}

/** Merge `source` over `target` without mutating either. Key order is target-first, which fixes the order of the svg attributes written from a merged style. */
export function deepMerge<T extends object>(target: T | null | undefined, source: object | null | undefined): T {
  const merged: MergeRecord = {};
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
