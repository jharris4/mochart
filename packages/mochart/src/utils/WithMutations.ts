export type CustomMutator = (oldValue: unknown, newValue: unknown) => unknown;

// Merged outputs are created with a null prototype, so both must pass.
function isPlainObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Structurally merges newValue with oldValue, returning oldValue (or its
 * sub-objects) wherever nothing changed, so unchanged references are preserved.
 */
export function getWithMutations<T>(oldValue: T | null | undefined, newValue: T, customMutator?: CustomMutator): T;
export function getWithMutations(oldValue: unknown, newValue: unknown, customMutator?: CustomMutator): unknown {
  if (oldValue === null || oldValue === undefined || newValue === undefined || newValue === null || oldValue === newValue) {
    return newValue;
  }
  else if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    if (oldValue.length === newValue.length) {
      const newArray = oldValue.map((v, i) => getWithMutations(v, newValue[i], customMutator));
      if (oldValue.some((v, i) => v !== newArray[i])) {
        return newArray;
      }
      else {
        return oldValue;
      }
    }
    else {
      return newValue;
    }
  }
  else if (oldValue instanceof Date && newValue instanceof Date) {
    return oldValue.getTime() === newValue.getTime() ? oldValue : newValue;
  }
  // Plain objects only: keyless exotics (Date, Map, Set) would vacuously compare equal below.
  else if (typeof oldValue === "object" && typeof newValue === "object" && isPlainObject(oldValue) && isPlainObject(newValue)) {
    const oldObject = oldValue as Record<string, unknown>;
    const incomingObject = newValue as Record<string, unknown>;
    const oldKeys = Object.keys(oldValue);
    const newKeys = Object.keys(newValue);
    // null proto: merged maps can be keyed by external ids (__proto__ must survive the merge)
    const oldKeyMap = oldKeys.reduce<Record<string, boolean>>((map, key) => { map[key] = true; return map }, Object.create(null));
    const newObject: Record<string, unknown> = Object.create(null);
    for (const newKey of newKeys) {
      if (oldKeyMap[newKey]) {
        newObject[newKey] = getWithMutations(oldObject[newKey], incomingObject[newKey], customMutator);
      }
      else {
        newObject[newKey] = incomingObject[newKey];
      }
    }
    if (oldKeys.length === newKeys.length && newKeys.every(newKey => oldKeyMap[newKey]) && oldKeys.every(oldKey => newObject[oldKey] === oldObject[oldKey])) {
      return oldValue;
    }
    else {
      return newObject;
    }
  }
  else if (customMutator !== undefined) {
    return customMutator(oldValue, newValue);
  }
  else {
    return newValue;
  }
}
