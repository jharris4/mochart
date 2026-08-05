import { describe, it, expect } from 'vitest';
import { computePieFractions, createPie } from '../../src/data/Pie';
import { enhanceConfig } from '../../src/config/helper';
import { getDataErrors } from '../../src/data/DataValidator';
import { ArrayOfObjectsDataProvider } from '../../src/data/DataProvider';
import type { PieItem } from '../../src/data/Pie';
import type { MochartInputConfig } from '../../src/types/config';

const items = (): PieItem[] => [
  { label: 'Chrome', value: 62 },
  { label: 'Safari', value: 20 },
  { label: 'Firefox', value: 18 }
];

describe('computePieFractions', () => {
  it('returns each value\'s fraction of the total', () => {
    const { total, fractions } = computePieFractions([62, 20, 18]);
    expect(total).toBe(100);
    expect(fractions).toEqual([0.62, 0.2, 0.18]);
  });

  it('clamps negative and non-finite values to 0', () => {
    const { total, fractions } = computePieFractions([-5, NaN, Infinity, 10]);
    expect(total).toBe(10);
    expect(fractions).toEqual([0, 0, 0, 1]);
  });

  it('yields all-zero fractions for an all-zero total', () => {
    const { total, fractions } = computePieFractions([0, 0]);
    expect(total).toBe(0);
    expect(fractions).toEqual([0, 0]);
  });
});

describe('createPie', () => {
  it('builds a single data row with one property per slice', () => {
    const { data, categoryAxis: categoryAxisConfig, series: seriesConfigs, chart: chartConfig } = createPie(items());
    expect(chartConfig).toEqual({ type: 'pie' });
    expect(data).toHaveLength(1);
    expect(data[0]).toEqual({ category: 'all', slice0: 62, slice1: 20, slice2: 18 });
    expect(categoryAxisConfig).toEqual({ property: 'category', type: 'string', scale: 'ordinal' });
    expect(seriesConfigs).toEqual([
      { id: 'slice0', property: 'slice0', title: 'Chrome' },
      { id: 'slice1', property: 'slice1', title: 'Safari' },
      { id: 'slice2', property: 'slice2', title: 'Firefox' }
    ]);
  });

  it('honors categoryValue, explicit colors and valueFormat', () => {
    const { data, series: seriesConfigs } = createPie([{ label: 'A', value: 1, color: '#ff0000' }], { categoryValue: 'total', valueFormat: '.1f' });
    expect(data[0].category).toBe('total');
    expect(seriesConfigs[0]).toMatchObject({ shapeStyle: { normal: { strokeColor: '#ff0000', fillColor: '#ff0000' } }, valueFormat: '.1f' });
  });

  it('forwards tooltipValues to the pieConfig fragment, leaving the data alone', () => {
    const { data, pie: pieConfig, series: seriesConfigs } = createPie(items(), { tooltipValues: 'percentValue' });
    // percentages are computed by the chart from the live slice shares, so
    // nothing is baked into the row and no tooltipProperty is wired up
    expect(pieConfig).toEqual({ tooltipValues: 'percentValue' });
    expect(data[0]).toEqual({ category: 'all', slice0: 62, slice1: 20, slice2: 18 });
    expect(seriesConfigs[0].tooltipProperty).toBeUndefined();
  });

  it('emits a donut pieConfig fragment via the donut and innerRadiusFraction options', () => {
    expect(createPie(items()).pie).toEqual({});
    expect(createPie(items(), { donut: true, tooltipValues: 'percent' }).pie)
      .toEqual({ tooltipValues: 'percent', innerRadiusFraction: 0.6 });
    expect(createPie(items(), { donut: true }).pie).toEqual({ innerRadiusFraction: 0.6 });
    expect(createPie(items(), { donut: true, innerRadiusFraction: 0.4 }).pie).toEqual({ innerRadiusFraction: 0.4 });
  });

  it('clamps negative slice values to 0 in the data row', () => {
    const { data, total } = createPie([{ label: 'A', value: -3 }, { label: 'B', value: 5 }]);
    expect(data[0].slice0).toBe(0);
    expect(data[0].slice1).toBe(5);
    expect(total).toBe(5);
  });

  it('assembles into a valid config and data provider', () => {
    const pie = createPie(items(), { donut: true, tooltipValues: 'percent' });
    const config: MochartInputConfig = {
      version: '1.0.0',
      chart: pie.chart,
      pie: pie.pie,
      categoryAxis: pie.categoryAxis,
      series: pie.series
    };
    const mochartConfig = enhanceConfig(config);
    expect(mochartConfig.validation.errors).toEqual([]);
    expect(mochartConfig.validation.valid).toBe(true);
    const provider = new ArrayOfObjectsDataProvider(pie.data, 'category');
    expect(getDataErrors(mochartConfig, provider)).toEqual([]);
  });
});
