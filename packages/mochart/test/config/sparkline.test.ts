import { describe, it, expect } from 'vitest';
import { createSparklineConfig } from '../../src/config/helper/sparkline';
import { enhanceConfig } from '../../src/config/helper';
import type { MochartInputConfig } from '../../src/types/config';

const baseConfig = (): MochartInputConfig => ({
  version: '1.0.0',
  categoryAxis: { property: 'i', type: 'number', scale: 'linear' },
  valueAxes: [{ id: 'va' }],
  series: [{ axis: 'va', property: 'value', renderer: 'line' }]
});

describe('createSparklineConfig', () => {
  it('hides the chart chrome and collapses the margins', () => {
    const mochartConfig = enhanceConfig(createSparklineConfig(baseConfig()));
    expect(mochartConfig.validation.valid).toBe(true);
    expect(mochartConfig.categoryAxis.visible).toBe(false);
    expect((mochartConfig as unknown as { valueAxesById: Record<string, { visible: boolean }> }).valueAxesById.sa.visible).toBe(false);
    expect(mochartConfig.legend.visible).toBe(false);
    expect(mochartConfig.tooltip.visible).toBe(false);
    expect(mochartConfig.crosshair.visible).toBe(false);
    expect(mochartConfig.chart.margin).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    expect(mochartConfig.chart.padding).toEqual({ top: 2, right: 2, bottom: 2, left: 2 });
  });

  it('hides the per-point markers line series default to', () => {
    const mochartConfig = enhanceConfig(createSparklineConfig(baseConfig()));
    expect(mochartConfig.series[0].markerShape).toBeNull();
  });

  // Regression: with no declared valueAxisConfigs the all-config never
  // reached the synthesized default axis, so the axis stayed visible.
  it('hides the synthesized axis when the config declares none', () => {
    const config = baseConfig();
    delete config.valueAxes;
    config.series = [{ property: 'value', renderer: 'line' }];
    const mochartConfig = enhanceConfig(createSparklineConfig(config));
    expect(mochartConfig.validation.valid).toBe(true);
    expect(mochartConfig.valueAxes.length).toBe(1);
    expect(mochartConfig.valueAxes[0].visible).toBe(false);
    expect(mochartConfig.series[0].axis).toBe(mochartConfig.valueAxes[0].id);
  });

  it('hides every value axis when there are several', () => {
    const config = baseConfig();
    config.valueAxes = [{ id: 'va' }, { id: 'sb' }];
    config.series = [
      { axis: 'va', property: 'value', renderer: 'line' },
      { axis: 'sb', property: 'other', renderer: 'line' }
    ];
    const mochartConfig = enhanceConfig(createSparklineConfig(config));
    expect((mochartConfig as unknown as { valueAxesById: Record<string, { visible: boolean }> }).valueAxesById.sa.visible).toBe(false);
    expect((mochartConfig as unknown as { valueAxesById: Record<string, { visible: boolean }> }).valueAxesById.sb.visible).toBe(false);
  });

  it('keeps the tooltip and crosshairs when interactive', () => {
    const mochartConfig = enhanceConfig(createSparklineConfig(baseConfig(), { interactive: true }));
    expect(mochartConfig.tooltip.visible).toBe(true);
    expect(mochartConfig.crosshair.visible).toBe(true);
    expect(mochartConfig.categoryAxis.visible).toBe(false);
  });

  it('applies a custom padding', () => {
    const mochartConfig = enhanceConfig(createSparklineConfig(baseConfig(), { padding: 0 }));
    expect(mochartConfig.chart.padding).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it('lets explicit config values win over the preset', () => {
    const config = baseConfig();
    config.categoryAxis = { ...config.categoryAxis, visible: true };
    config.legend = { visible: true };
    config.chart = { padding: { top: 8, right: 8, bottom: 8, left: 8 } };
    const mochartConfig = enhanceConfig(createSparklineConfig(config));
    expect(mochartConfig.categoryAxis.visible).toBe(true);
    expect(mochartConfig.legend.visible).toBe(true);
    expect(mochartConfig.chart.padding).toEqual({ top: 8, right: 8, bottom: 8, left: 8 });
    expect(mochartConfig.chart.margin).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it('does not mutate the passed config', () => {
    const config = baseConfig();
    const snapshot = JSON.parse(JSON.stringify(config));
    createSparklineConfig(config);
    expect(config).toEqual(snapshot);
  });
});
