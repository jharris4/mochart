export const idAccessor = ({ id }: { id: string }): string => id;

export function arrayToMap<T, V = T>(
  theArray: readonly T[],
  keyAccessor: (element: NoInfer<T>) => string,
  valueFormatter: (element: NoInfer<T>) => V = element => element as unknown as V
): Record<string, V> {
  const map: Record<string, V> = Object.create(null); // null proto: keys are external ids (__proto__ must work)
  for (const element of theArray) {
    map[keyAccessor(element)] = valueFormatter(element);
  }
  return map;
}

export function mapMap<V, R>(map: Record<string, V>, mapFunction: (value: V) => R): Record<string, R> {
  const mapKeys = Object.keys(map);
  const newMap: Record<string, R> = Object.create(null);
  for (const mapKey of mapKeys) {
    newMap[mapKey] = mapFunction(map[mapKey]);
  }
  return newMap;
}

export function onClickDisabled(e: Event): void {
  e.preventDefault();
}

/** Marks focus the library moved itself, which pointer paths reach too - :focus-visible never
 * matches there, so the stylesheet has nothing to ring without this. Cleared on blur. */
export const focusRestoredAttribute = 'data-mochart-focus-restored';

export function focusRestored(node: SVGElement | HTMLElement | null | undefined): void {
  if (node === null || node === undefined) {
    return;
  }
  node.setAttribute(focusRestoredAttribute, '');
  node.addEventListener('blur', () => node.removeAttribute(focusRestoredAttribute), { once: true });
  node.focus();
}

export function translate(x: number, y: number): string {
  return 'translate(' + x + ',' + y + ')';
}

export function rotate(a: number): string {
  return 'rotate(' + a + ')';
}

export function translateRotate(x: number, y: number, a = 0): string {
  return translate(x, y) + (a === 0 ? '' : ' ' + rotate(a));
}

export function translateObject({ x, y }: { x: number; y: number }): string {
  return translate(x, y);
}

export const textDY = '0.35em'; // more or less centers the text vertically http://stackoverflow.com/questions/12250403/vertical-alignment-of-text-element-in-svg

export function centerTextY(textBounds: { x?: number; y?: number; height: number }): { dy: string; transform: string } {
  const dy = textDY;
  const { x = 0, y = 0, height } = textBounds;
  const transform = translate(x, Math.floor(y + height / 2.0));
  return {
    dy,
    transform
  };
}

export function createArrayFilledWithUndefined(count: number): undefined[] {
  const theArray: undefined[] = [];
  for (let i=0; i<count; i++) {
    theArray.push(undefined);
  }
  return theArray;
}

export function createArrayFilledWithZero(count: number): number[] {
  const theArray: number[] = [];
  for (let i=0; i<count; i++) {
    theArray.push(0);
  }
  return theArray;
}

export function createArrayWithValueIfNotUndefined<T, V>(source: readonly T[], value: V): (V | undefined)[] {
  const theArray: (V | undefined)[] = [];
  const count = source.length;
  for (let i=0; i<count; i++) {
    if (source[i] !== undefined) {
      theArray.push(value);
    }
    else {
      theArray.push(undefined);
    }
  }
  return theArray;
}

export function copyArrayWithValueIfNotUndefined<T, U>(source: readonly T[], otherSource: readonly U[]): (T | undefined)[] {
  const theArray: (T | undefined)[] = [];
  const count = source.length;
  for (let i=0; i<count; i++) {
    if (otherSource[i] === undefined) {
      theArray.push(undefined);
    }
    else {
      theArray.push(source[i]);
    }
  }
  return theArray;
}

export function replaceArrayUndefinedWithValue<T>(array: (T | undefined)[], value: T): void {
  const count = array.length;
  for (let i=0; i<count; i++) {
    if (array[i] === undefined) {
      array[i] = value;
    }
  }
}

export function copyWithValueOnlyIfOtherUndefined<T, U>(source: T[], otherSource: readonly (U | undefined)[], value: T): T[] {
  let i, found = -1;
  const count = source.length;
  for (i=0; i<count; i++) {
    if (otherSource[i] === undefined) {
      found = i;
      break;
    }
  }
  if (found >= 0) {
    const copy = source.slice();
    for (i=found; i<count; i++) {
      if (otherSource[i] === undefined) {
        copy[i] = value;
      }
    }
    return copy;
  }
  else {
    return source;
  }
}

export function areMapsEqual(mapA: Record<string, unknown>, mapB: Record<string, unknown>): boolean {
  const keys = Object.keys(mapA);
  if (keys.length !== Object.keys(mapB).length) {
    return false;
  }
  for (const key of keys) {
    if (!(key in mapB) || mapA[key] !== mapB[key]) {
      return false;
    }
  }
  return true;
}

export function areArraysAndEqual(oldValue: unknown, newValue: unknown): boolean {
  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    if (oldValue.length === newValue.length) {
      const count = oldValue.length;
      for (let i=0; i<count; i++) {
        if (oldValue[i] !== newValue[i]) {
          return false;
        }
      }
      return true;
    }
    else {
      return false;
    }
  }
  else {
    return false;
  }
}

export function getValuesAtIndices<T>(source: readonly T[], indices: readonly number[]): T[] {
  const values: T[] = [];
  const count = indices.length;
  for (let i=0; i<count; i++) {
    values.push(source[indices[i]]);
  }
  return values;
}

export function setArrayValuesIfOneIsUndefined<T>(array: (T | undefined)[], otherArray: (T | undefined)[], value: T): void {
  const count = array.length;
  for (let i=0; i<count; i++) {
    if (array[i] !== otherArray[i]) {
      if (array[i] === undefined) {
        array[i] = value;
      }
      else if (otherArray[i] === undefined) {
        otherArray[i] = value;
      }
    }
  }
}

export function setArrayValuesFromSourcesIfOneIsUndefined<T>(
  array: (T | undefined)[],
  otherArray: (T | undefined)[],
  sourceArray: readonly T[],
  otherSourceArray: readonly T[]
): void {
  const count = array.length;
  for (let i=0; i<count; i++) {
    if (array[i] !== otherArray[i]) {
      if (array[i] === undefined) {
        array[i] = sourceArray[i];
      }
      else if (otherArray[i] === undefined) {
        otherArray[i] = otherSourceArray[i];
      }
    }
  }
}

export function setArrayValuesForRange<T>(array: T[], min: number, max: number, value: T): void {
  let i;
  for (i=min; i<max; i++) {
    array[i] = value;
  }
}

export function hasUndefinedForRange(array: readonly unknown[], min: number, max: number): boolean {
  let i;
  for (i=min; i<max; i++) {
    if (array[i] === undefined) {
      return true;
    }
  }
  return false;
}

export function getMaxAbsoluteValue(values: readonly (number | null | undefined)[] | null): number {
  let max = 0;
  if (values !== null) {
    const count = values.length;
    let i, temp;
    for (i=0; i<count; i++) {
      temp = values[i];
      if (temp && Math.abs(temp) > max) {
        max = Math.abs(temp);
      }
    }
  }
  return max;
}

export function getArrayDeltas(array: readonly number[], otherArray: readonly (number | undefined)[]): number[] {
  const count = array.length;
  const deltas: number[] = [];
  for (let i=0; i<count; i++) {
    if (otherArray[i] !== undefined) { // if one is undefined, both should be undefined
      deltas.push((otherArray[i] as number) - array[i]);
    }
    else {
      deltas.push(0);
    }
  }
  return deltas;
}

// a11y affordances (roles, labels, tab stops) apply only when enabled and not decorative-hidden
export function accessibilityActive({ enabled, hidden }: { enabled: boolean; hidden: boolean }): boolean {
  return enabled && !hidden;
}
