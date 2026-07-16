export type CustomMutator = (oldValue: unknown, newValue: unknown) => unknown;

/**
 * Structurally merges newValue with oldValue, returning oldValue (or its
 * sub-objects) wherever nothing changed, so unchanged references are preserved.
 */
export function getWithMutations<T>(oldValue: T | null | undefined, newValue: T, customMutator?: CustomMutator): T;
export function getWithMutations(oldValue: any, newValue: any, customMutator?: CustomMutator): any {
  if (oldValue === null || oldValue === void 0 || newValue === void 0 || newValue === null || oldValue === newValue) {
    return newValue;
  }
  else if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    if (oldValue.length === newValue.length) {
      let newArray = oldValue.map((v, i) => getWithMutations(v, newValue[i], customMutator));
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
    let oldKeys = Object.keys(oldValue);
    let newKeys = Object.keys(newValue);
    let oldKeyMap = oldKeys.reduce<Record<string, boolean>>((map, key) => { map[key] = true; return map }, {});
    let newObject: Record<string, unknown> = {};
    for (let newKey of newKeys) {
      if (oldKeyMap[newKey]) {
        newObject[newKey] = getWithMutations(oldValue[newKey], newValue[newKey], customMutator);
      }
      else {
        newObject[newKey] = newValue[newKey];
      }
    }
    if (oldKeys.length === newKeys.length && newKeys.every(newKey => oldKeyMap[newKey]) && oldKeys.every(oldKey => newObject[oldKey] === oldValue[oldKey])) {
      return oldValue;
    }
    else {
      return newObject;
    }
  }
  else if (customMutator !== void 0) {
    return customMutator(oldValue, newValue);
  }
  else {
    return newValue;
  }
}
