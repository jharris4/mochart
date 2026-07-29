import { describe, it, expect } from 'vitest';
import { getPieSliceAngles, degreesToRadians } from '../../src/data/PieData';
import { getRadialLayoutInfo } from '../../src/layout/RadialLayout';
import type { PieConfig, SeriesConfig } from '../../src/types/config';
import type { SeriesValueObject } from '../../src/types/data';
import type { LayoutInfo } from '../../src/types/layout';

const TWO_PI = Math.PI * 2;

const seriesConfig = (id: string) => ({ id }) as SeriesConfig;
const pieConfig = (overrides: Partial<PieConfig> = {}) => ({
  innerRadiusPercent: 0, outerRadiusPercent: 1, startAngle: 0, padAngle: 0, cornerRadius: 0,
  showLabels: false, labelType: 'percent', labelFormat: 'auto', labelRadiusPercent: 0.5, labelMinAnglePercent: 0.05,
  ...overrides
}) as PieConfig;
const values = (plain: (number | undefined)[] | null) => ({ plain }) as SeriesValueObject;

describe('getPieSliceAngles', () => {
  it('divides the circle proportionally in series config order', () => {
    const angles = getPieSliceAngles(
      [seriesConfig('a'), seriesConfig('b')],
      { a: values([3]), b: values([1]) },
      pieConfig()
    );
    expect(angles.a.startAngle).toBe(0);
    expect(angles.a.endAngle).toBeCloseTo(TWO_PI * 0.75, 10);
    expect(angles.a.fraction).toBeCloseTo(0.75, 10);
    expect(angles.b.startAngle).toBeCloseTo(TWO_PI * 0.75, 10);
    expect(angles.b.endAngle).toBeCloseTo(TWO_PI, 10);
  });

  it('offsets all slices by startAngle degrees', () => {
    const angles = getPieSliceAngles(
      [seriesConfig('a')],
      { a: values([1]) },
      pieConfig({ startAngle: 90 })
    );
    expect(angles.a.startAngle).toBeCloseTo(degreesToRadians(90), 10);
    expect(angles.a.endAngle).toBeCloseTo(degreesToRadians(90) + TWO_PI, 10);
  });

  it('skips suppressed (null) series and renormalizes the remainder', () => {
    const angles = getPieSliceAngles(
      [seriesConfig('a'), seriesConfig('b'), seriesConfig('c')],
      { a: values([1]), b: values(null), c: values([1]) },
      pieConfig()
    );
    expect(angles.a.fraction).toBeCloseTo(0.5, 10);
    expect(angles.b.fraction).toBe(0);
    expect(angles.c.fraction).toBeCloseTo(0.5, 10);
    expect(angles.c.endAngle).toBeCloseTo(TWO_PI, 10);
  });

  it('clamps negative and missing values to zero-width slices', () => {
    const angles = getPieSliceAngles(
      [seriesConfig('a'), seriesConfig('b'), seriesConfig('c')],
      { a: values([-2]), b: values([undefined]), c: values([4]) },
      pieConfig()
    );
    expect(angles.a.fraction).toBe(0);
    expect(angles.b.fraction).toBe(0);
    expect(angles.c.fraction).toBe(1);
  });

  it('returns an empty map when the total is not positive', () => {
    expect(getPieSliceAngles([seriesConfig('a')], { a: values([0]) }, pieConfig())).toEqual({});
    expect(getPieSliceAngles([seriesConfig('a')], { a: values(null) }, pieConfig())).toEqual({});
  });
});

describe('getRadialLayoutInfo', () => {
  const layout = (width: number, height: number) => ({ x: 10, y: 20, width, height }) as LayoutInfo;

  it('centers the circle and sizes the radius from the shorter side', () => {
    const info = getRadialLayoutInfo(layout(400, 300), pieConfig());
    expect(info).toEqual({ cx: 200, cy: 150, innerRadius: 0, outerRadius: 150 });
  });

  it('applies outerRadiusPercent and innerRadiusPercent', () => {
    const info = getRadialLayoutInfo(layout(400, 300), pieConfig({ outerRadiusPercent: 0.8, innerRadiusPercent: 0.5 }));
    expect(info.outerRadius).toBeCloseTo(120, 10);
    expect(info.innerRadius).toBeCloseTo(60, 10);
  });
});
