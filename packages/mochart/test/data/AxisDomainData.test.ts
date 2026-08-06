import { describe, it, expect } from 'vitest';
import { getAxisDomain } from '../../src/data/AxisDomainData';

// getAxisDomain(axisConfig, calculator): resolves an axis domain from explicit
// min/max, soft bounds, margins and offsets. calculator supplies the data-driven
// [min, max] used whenever a bound is "auto".
const cfg = (over: Record<string, unknown>) => ({
  type: 'number',
  min: 'auto',
  max: 'auto',
  minOffset: 0,
  maxOffset: 0,
  softMin: null,
  softMax: null,
  base: null,
  minMarginFraction: 0,
  maxMarginFraction: 0,
  ...over
}) as never;

describe('getAxisDomain', () => {
  it('uses explicit min and max verbatim', () => {
    expect(getAxisDomain(cfg({ min: 5, max: 50 }), () => [0, 100])).toEqual([5, 50]);
  });

  it('uses the calculated domain when both bounds are auto', () => {
    expect(getAxisDomain(cfg({}), () => [10, 90])).toEqual([10, 90]);
  });

  it('applies an explicit min against an auto max', () => {
    expect(getAxisDomain(cfg({ min: 0 }), () => [10, 90])).toEqual([0, 90]);
  });

  it('applies an explicit max against an auto min', () => {
    expect(getAxisDomain(cfg({ max: 100 }), () => [10, 90])).toEqual([10, 100]);
  });

  it('extends the min to a lower softMin', () => {
    expect(getAxisDomain(cfg({ softMin: -5 }), () => [10, 90])).toEqual([-5, 90]);
  });

  it('ignores a softMin that is above the calculated min', () => {
    expect(getAxisDomain(cfg({ softMin: 50 }), () => [10, 90])).toEqual([10, 90]);
  });

  it('extends the max to a higher softMax', () => {
    expect(getAxisDomain(cfg({ softMax: 200 }), () => [10, 90])).toEqual([10, 200]);
  });

  it('ignores a softMax that is below the calculated max', () => {
    expect(getAxisDomain(cfg({ softMax: 50 }), () => [10, 90])).toEqual([10, 90]);
  });

  it('adds margin percentages to an auto domain', () => {
    // extent 80, 10% each side => [10-8, 90+8]
    expect(getAxisDomain(cfg({ minMarginFraction: 0.1, maxMarginFraction: 0.1 }), () => [10, 90]))
      .toEqual([2, 98]);
  });

  it('does not add the min margin when the min equals the base', () => {
    // min (10) === base (10) => no bottom margin, top still grows
    expect(getAxisDomain(cfg({ base: 10, minMarginFraction: 0.1, maxMarginFraction: 0.1 }), () => [10, 90]))
      .toEqual([10, 98]);
  });

  it('applies min and max offsets to an auto domain', () => {
    expect(getAxisDomain(cfg({ minOffset: -5, maxOffset: 5 }), () => [10, 90])).toEqual([5, 95]);
  });

  it('collapses to the softMin when the data domain is empty', () => {
    expect(getAxisDomain(cfg({ softMin: 50 }), () => [null, null])).toEqual([50, 50]);
  });

  it('collapses to the softMax when the data domain is empty', () => {
    expect(getAxisDomain(cfg({ softMax: 200 }), () => [null, null])).toEqual([200, 200]);
  });

  it('spans softMin to softMax when the data domain is empty', () => {
    expect(getAxisDomain(cfg({ softMin: -5, softMax: 200 }), () => [null, null])).toEqual([-5, 200]);
  });

  it('collapses to an explicit min when the data domain is empty and max is auto', () => {
    expect(getAxisDomain(cfg({ min: 5 }), () => [null, null])).toEqual([5, 5]);
  });

  it('stays fully null when the data domain is empty and no bounds are set', () => {
    expect(getAxisDomain(cfg({}), () => [null, null])).toEqual([null, null]);
  });

  it('creates Date bounds for a date axis', () => {
    const t0 = Date.UTC(2020, 0, 1);
    const t1 = Date.UTC(2021, 0, 1);
    const [min, max] = getAxisDomain(cfg({ type: 'date', min: t0, max: t1 }), () => [null, null]);
    expect(min).toBeInstanceOf(Date);
    expect((min as Date).getTime()).toBe(t0);
    expect((max as Date).getTime()).toBe(t1);
  });

  it('offsets a date axis by milliseconds', () => {
    const t0 = Date.UTC(2020, 0, 1);
    const day = 24 * 60 * 60 * 1000;
    const [min] = getAxisDomain(cfg({ type: 'date', minOffset: -day }), () => [new Date(t0), new Date(t0 + day)]);
    expect((min as Date).getTime()).toBe(t0 - day);
  });
});
