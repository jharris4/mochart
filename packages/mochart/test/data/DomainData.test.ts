import { describe, it, expect } from 'vitest';
import {
  nullDomain,
  getCategoryDomainForValues,
  getDomainForValues,
  mergeDomain,
  getDomainExtent,
  getDomainExtents,
  getSafeDomainExtent,
  getMaxDomain,
  copyDomain
} from '../../src/data/DomainData';

describe('getCategoryDomainForValues', () => {
  it('finds the min and max of numeric values', () => {
    expect(getCategoryDomainForValues([3, 1, 4, 1, 5, 9, 2])).toEqual([1, 9]);
  });

  it('returns the null domain for an empty array', () => {
    expect(getCategoryDomainForValues([])).toEqual([null, null]);
  });

  it('compares dates by timestamp and returns the extreme date instances', () => {
    const a = new Date('2020-01-01');
    const b = new Date('2020-06-01');
    const c = new Date('2020-03-01');
    expect(getCategoryDomainForValues([c, a, b])).toEqual([a, b]);
  });

  it('handles a single value as both min and max', () => {
    expect(getCategoryDomainForValues([7])).toEqual([7, 7]);
  });
});

describe('getDomainForValues', () => {
  it('finds the min and max ignoring undefined holes', () => {
    expect(getDomainForValues([5, undefined, 2, undefined, 8])).toEqual([2, 8]);
  });

  it('returns the null domain for null input', () => {
    expect(getDomainForValues(null)).toEqual([null, null]);
  });

  it('returns the null domain when every value is undefined', () => {
    expect(getDomainForValues([undefined, undefined])).toEqual([null, null]);
  });

  it('handles negative values', () => {
    expect(getDomainForValues([-3, -1, -7])).toEqual([-7, -1]);
  });
});

describe('mergeDomain', () => {
  it('returns the other domain when one side is null', () => {
    expect(mergeDomain(nullDomain, [2, 5])).toEqual([2, 5]);
    expect(mergeDomain([2, 5], nullDomain)).toEqual([2, 5]);
  });

  it('takes the widest bounds of two populated domains', () => {
    expect(mergeDomain([2, 5], [1, 4])).toEqual([1, 5]);
    expect(mergeDomain([2, 5], [3, 9])).toEqual([2, 9]);
  });
});

describe('getDomainExtent', () => {
  it('returns the numeric span of a domain', () => {
    expect(getDomainExtent([2, 5])).toBe(3);
  });

  it('returns 0 for a null or degenerate domain', () => {
    expect(getDomainExtent([null, null])).toBe(0);
    expect(getDomainExtent([5, 5])).toBe(0);
  });

  it('measures dates by elapsed milliseconds', () => {
    const a = new Date('2020-01-01T00:00:00Z');
    const b = new Date('2020-01-01T00:00:01Z');
    expect(getDomainExtent([a, b])).toBe(1000);
  });
});

describe('getDomainExtents', () => {
  it('maps each named domain to its extent', () => {
    expect(getDomainExtents({ a: [0, 10], b: [3, 5] })).toEqual({ a: 10, b: 2 });
  });
});

describe('getSafeDomainExtent', () => {
  it('returns the extent for a non-degenerate domain', () => {
    expect(getSafeDomainExtent([2, 6])).toBe(4);
  });

  it('falls back to the value itself for a degenerate non-null domain', () => {
    expect(getSafeDomainExtent([5, 5])).toBe(5);
  });

  it('falls back to 1 for a null domain', () => {
    expect(getSafeDomainExtent([null, null])).toBe(1);
  });
});

describe('getMaxDomain', () => {
  it('returns the other domain when one side is null', () => {
    expect(getMaxDomain([null, null], [1, 4])).toEqual([1, 4]);
    expect(getMaxDomain([1, 4], [null, null])).toEqual([1, 4]);
  });

  it('returns the widest bounds across both domains', () => {
    expect(getMaxDomain([2, 5], [1, 9])).toEqual([1, 9]);
    expect(getMaxDomain([0, 3], [1, 2])).toEqual([0, 3]);
  });
});

describe('copyDomain', () => {
  it('produces an equal but distinct array', () => {
    const domain: [number, number] = [1, 2];
    const copy = copyDomain(domain);
    expect(copy).toEqual(domain);
    expect(copy).not.toBe(domain);
  });
});
