/**
 * Stable lookup key for supported category values. Dates compare by their
 * complete epoch value because Date#toString() discards milliseconds.
 */
export function getCategoryValueKey(value: unknown): string {
  return value instanceof Date ? String(value.getTime()) : String(value);
}
