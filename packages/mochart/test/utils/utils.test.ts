import { describe, it, expect } from 'vitest';
import {
  idAccessor,
  arrayToMap,
  mapMap,
  onClickDisabled,
  translate,
  rotate,
  translateRotate,
  translateObject,
  centerTextY,
  createArrayFilledWithUndefined,
  createArrayFilledWithZero,
  createArrayWithValueIfNotUndefined,
  copyArrayWithValueIfNotUndefined,
  replaceArrayUndefinedWithValue,
  copyWithValueOnlyIfOtherUndefined,
  areMapsEqual,
  areArraysAndEqual,
  getValuesAtIndices,
  setArrayValuesIfOneIsUndefined,
  setArrayValuesFromSourcesIfOneIsUndefined,
  setArrayValuesForRange,
  hasUndefinedForRange,
  getMaxAbsoluteValue,
  getArrayDeltas
} from '../../src/utils/utils';

const U = void 0;

describe('idAccessor', () => {
  it('reads the id property', () => {
    expect(idAccessor({ id: 'abc' })).toBe('abc');
  });
});

describe('arrayToMap', () => {
  it('keys elements by an accessor, defaulting the value to the element', () => {
    const items = [{ id: 'a', n: 1 }, { id: 'b', n: 2 }];
    expect(arrayToMap(items, idAccessor)).toEqual({ a: items[0], b: items[1] });
  });

  it('applies a value formatter when provided', () => {
    const items = [{ id: 'a', n: 1 }, { id: 'b', n: 2 }];
    expect(arrayToMap(items, idAccessor, e => e.n)).toEqual({ a: 1, b: 2 });
  });

  it('is empty for an empty array', () => {
    expect(arrayToMap([], idAccessor)).toEqual({});
  });
});

describe('mapMap', () => {
  it('maps every value of an object', () => {
    expect(mapMap({ a: 1, b: 2 }, v => v * 10)).toEqual({ a: 10, b: 20 });
  });

  it('is empty for an empty map', () => {
    expect(mapMap({}, (v: number) => v)).toEqual({});
  });
});

describe('onClickDisabled', () => {
  it('prevents the default event action', () => {
    let prevented = false;
    onClickDisabled({ preventDefault: () => { prevented = true; } } as unknown as Event);
    expect(prevented).toBe(true);
  });
});

describe('transform string builders', () => {
  it('translate builds an SVG translate()', () => {
    expect(translate(1, 2)).toBe('translate(1,2)');
  });

  it('rotate builds an SVG rotate()', () => {
    expect(rotate(45)).toBe('rotate(45)');
  });

  it('translateRotate omits rotate() when the angle is 0', () => {
    expect(translateRotate(1, 2)).toBe('translate(1,2)');
    expect(translateRotate(1, 2, 0)).toBe('translate(1,2)');
  });

  it('translateRotate appends rotate() for a non-zero angle', () => {
    expect(translateRotate(1, 2, 90)).toBe('translate(1,2) rotate(90)');
  });

  it('translateObject reads x and y from an object', () => {
    expect(translateObject({ x: 3, y: 4 })).toBe('translate(3,4)');
  });
});

describe('centerTextY', () => {
  it('centers vertically using half of the height, flooring the y', () => {
    expect(centerTextY({ x: 2, y: 3, height: 11 })).toEqual({
      dy: '0.35em',
      transform: 'translate(2,8)' // 3 + floor(11/2) = 3 + 5
    });
  });

  it('defaults x and y to 0 when absent', () => {
    expect(centerTextY({ height: 10 })).toEqual({
      dy: '0.35em',
      transform: 'translate(0,5)'
    });
  });
});

describe('array constructors', () => {
  it('createArrayFilledWithUndefined fills holes explicitly', () => {
    const a = createArrayFilledWithUndefined(3);
    expect(a).toHaveLength(3);
    expect(a).toEqual([U, U, U]);
    expect(0 in a).toBe(true);
  });

  it('createArrayFilledWithZero fills with zeroes', () => {
    expect(createArrayFilledWithZero(3)).toEqual([0, 0, 0]);
  });

  it('createArrayWithValueIfNotUndefined mirrors the source holes', () => {
    expect(createArrayWithValueIfNotUndefined([1, U, 3], 'x')).toEqual(['x', U, 'x']);
  });

  it('copyArrayWithValueIfNotUndefined copies where the other source is defined', () => {
    expect(copyArrayWithValueIfNotUndefined([1, 2, 3], ['a', U, 'c'])).toEqual([1, U, 3]);
  });
});

describe('array mutators', () => {
  it('replaceArrayUndefinedWithValue fills holes in place', () => {
    const a = [1, U, 3, U];
    replaceArrayUndefinedWithValue(a, 0);
    expect(a).toEqual([1, 0, 3, 0]);
  });

  it('copyWithValueOnlyIfOtherUndefined returns the same array when no holes exist', () => {
    const src = [1, 2, 3];
    expect(copyWithValueOnlyIfOtherUndefined(src, [1, 2, 3], 0)).toBe(src);
  });

  it('copyWithValueOnlyIfOtherUndefined copies and fills from the first hole onward', () => {
    const src = [1, 2, 3, 4];
    const out = copyWithValueOnlyIfOtherUndefined(src, [1, U, 3, U], -1);
    expect(out).not.toBe(src);
    expect(out).toEqual([1, -1, 3, -1]);
  });

  it('setArrayValuesForRange sets a half-open range', () => {
    const a = [0, 0, 0, 0];
    setArrayValuesForRange(a, 1, 3, 9);
    expect(a).toEqual([0, 9, 9, 0]);
  });
});

describe('setArrayValuesIfOneIsUndefined', () => {
  it('fills whichever side has the hole when the pair differs', () => {
    const a = [1, U, 3];
    const b = [1, 2, U];
    setArrayValuesIfOneIsUndefined(a, b, 0);
    expect(a).toEqual([1, 0, 3]);
    expect(b).toEqual([1, 2, 0]);
  });

  it('leaves matching entries untouched', () => {
    const a = [1, 2];
    const b = [1, 2];
    setArrayValuesIfOneIsUndefined(a, b, 9);
    expect(a).toEqual([1, 2]);
    expect(b).toEqual([1, 2]);
  });
});

describe('setArrayValuesFromSourcesIfOneIsUndefined', () => {
  it('fills each hole from its corresponding source array', () => {
    const a = [1, U, 3];
    const b = [1, 2, U];
    setArrayValuesFromSourcesIfOneIsUndefined(a, b, [10, 20, 30], [100, 200, 300]);
    expect(a).toEqual([1, 20, 3]);
    expect(b).toEqual([1, 2, 300]);
  });
});

describe('equality helpers', () => {
  it('areMapsEqual compares by the keys of the first map', () => {
    expect(areMapsEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    expect(areMapsEqual({ a: 1 }, { a: 2 })).toBe(false);
    // extra keys in the second map are ignored
    expect(areMapsEqual({ a: 1 }, { a: 1, b: 2 })).toBe(true);
  });

  it('areArraysAndEqual requires both to be arrays of equal length and content', () => {
    expect(areArraysAndEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(areArraysAndEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(areArraysAndEqual([1, 2], [1, 9])).toBe(false);
    expect(areArraysAndEqual([1, 2], 'nope')).toBe(false);
    expect(areArraysAndEqual('nope', [1, 2])).toBe(false);
  });
});

describe('getValuesAtIndices', () => {
  it('gathers values at the given indices', () => {
    expect(getValuesAtIndices(['a', 'b', 'c', 'd'], [3, 0, 2])).toEqual(['d', 'a', 'c']);
  });
});

describe('hasUndefinedForRange', () => {
  it('is true when a hole exists in the half-open range', () => {
    expect(hasUndefinedForRange([1, 2, U, 4], 1, 3)).toBe(true);
  });

  it('is false when the range is fully populated', () => {
    expect(hasUndefinedForRange([1, 2, 3, 4], 0, 2)).toBe(false);
  });
});

describe('getMaxAbsoluteValue', () => {
  it('returns 0 for null', () => {
    expect(getMaxAbsoluteValue(null)).toBe(0);
  });

  it('finds the largest magnitude, ignoring null/undefined/zero', () => {
    expect(getMaxAbsoluteValue([1, -5, 3, null, U, 0])).toBe(5);
  });

  it('returns 0 when all values are falsy', () => {
    expect(getMaxAbsoluteValue([0, null, U])).toBe(0);
  });
});

describe('getArrayDeltas', () => {
  it('subtracts the base array from the other, using 0 for holes', () => {
    expect(getArrayDeltas([1, 2, 3], [4, U, 10])).toEqual([3, 0, 7]);
  });
});
