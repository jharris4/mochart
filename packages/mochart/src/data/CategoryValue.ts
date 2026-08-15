/** Stable lookup key for category values; Dates key by epoch ms because Date#toString() drops milliseconds. */
export function getCategoryValueKey(value: unknown): string {
  return value instanceof Date ? String(value.getTime()) : String(value);
}
