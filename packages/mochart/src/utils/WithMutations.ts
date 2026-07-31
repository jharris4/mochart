export type CustomMutator = (oldValue: unknown, newValue: unknown) => unknown;

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
  else if (typeof oldValue === "object" && typeof newValue === "object") {
    const oldObject = oldValue as Record<string, unknown>;
    const incomingObject = newValue as Record<string, unknown>;
    const oldKeys = Object.keys(oldValue);
    const newKeys = Object.keys(newValue);
    const oldKeyMap = oldKeys.reduce<Record<string, boolean>>((map, key) => { map[key] = true; return map }, {});
    const newObject: Record<string, unknown> = {};
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
