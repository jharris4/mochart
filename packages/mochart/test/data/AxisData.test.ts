import { describe, it, expect } from 'vitest';
import { getGroupSpacingInfo } from '../../src/data/AxisData';
import type { GroupAxisConfig } from '../../src/types/config';
import type { GroupAxisDomain } from '../../src/types/data';

// getGroupSpacingInfo turns a group axis domain + pixel extent into the pixel
// range, per-group extent and offset used to place group values. Only a few
// config fields participate; build small partials.
const axis = (over: Partial<GroupAxisConfig>): GroupAxisConfig => ({
  groupCountPadding: 0,
  minGroupValueExtent: 0,
  groupPaddingFraction: { outer: 0 },
  ...over
}) as GroupAxisConfig;

describe('getGroupSpacingInfo', () => {
  it('spans the full extent when the domain is a single point and there is no padding', () => {
    const info = getGroupSpacingInfo(axis({}), [5, 5] as GroupAxisDomain, 200);
    expect(info.groupRange).toEqual([0, 200]);
    expect(info.groupValueExtent).toBe(200);
    expect(info.groupValueOffset).toBe(100);
  });

  it('divides the extent evenly across the domain when there is no padding', () => {
    // domain extent 4, pixel extent 200 => 50px per unit
    const info = getGroupSpacingInfo(axis({}), [0, 4] as GroupAxisDomain, 200);
    expect(info.groupValueExtent).toBe(50);
    expect(info.groupRange).toEqual([0, 200]);
  });

  it('reserves half a slot on each end when groupCountPadding is set', () => {
    // extent / (domainExtent + padding) = 200 / (4 + 1) = 40; range shrinks by 20 each side
    const info = getGroupSpacingInfo(axis({ groupCountPadding: 1 }), [0, 4] as GroupAxisDomain, 200);
    expect(info.groupValueExtent).toBe(40);
    expect(info.groupRange).toEqual([20, 180]);
  });

  it('shrinks the group value extent by the outer padding fraction', () => {
    // 50px per unit, 20% outer padding => floor(50 * 0.8) = 40
    const info = getGroupSpacingInfo(axis({ groupPaddingFraction: { outer: 0.2 } as GroupAxisConfig['groupPaddingFraction'] }), [0, 4] as GroupAxisDomain, 200);
    expect(info.groupValueExtent).toBe(40);
  });

  it('never drops below the configured minimum group value extent', () => {
    const info = getGroupSpacingInfo(axis({ minGroupValueExtent: 30 }), [0, 100] as GroupAxisDomain, 200);
    expect(info.groupValueExtent).toBe(30);
  });

  it('treats a null domain bound as a zero extent', () => {
    const info = getGroupSpacingInfo(axis({}), [null, null] as GroupAxisDomain, 120);
    expect(info.groupValueExtent).toBe(120);
  });
});
