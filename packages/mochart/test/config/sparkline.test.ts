import { describe, it, expect } from 'vitest';
import { createSparklineConfig } from '../../src/config/helper/sparkline';
import { enhanceConfig } from '../../src/config/helper';
import type { MochartInputConfig } from '../../src/types/config';

const baseConfig = (): MochartInputConfig => ({
  version: '1.0.0',
  groupAxisConfig: { property: 'i', type: 'number', scale: 'linear' },
  seriesAxisConfigs: [{ id: 'sa' }],
  seriesConfigs: [{ axis: 'sa', property: 'value', renderer: 'line' }]
});

describe('createSparklineConfig', () => {
  it('hides the chart chrome and collapses the margins', () => {
    const mochartConfig = enhanceConfig(createSparklineConfig(baseConfig()));
    expect(mochartConfig.validation.valid).toBe(true);
    expect(mochartConfig.groupAxisConfig.visible).toBe(false);
    expect(mochartConfig.seriesAxisConfigsById.sa.visible).toBe(false);
    expect(mochartConfig.legendConfig.visible).toBe(false);
    expect(mochartConfig.tooltipConfig.visible).toBe(false);
    expect(mochartConfig.crosshairConfig.visible).toBe(false);
    expect(mochartConfig.chartConfig.margin).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    expect(mochartConfig.chartConfig.padding).toEqual({ top: 2, right: 2, bottom: 2, left: 2 });
  });

  it('hides the per-point markers line series default to', () => {
    const mochartConfig = enhanceConfig(createSparklineConfig(baseConfig()));
    expect(mochartConfig.seriesConfigs[0].markerShape).toBeNull();
  });

  // Regression: with no declared seriesAxisConfigs the all-config never
  // reached the synthesized default axis, so the axis stayed visible.
  it('hides the synthesized axis when the config declares none', () => {
    const config = baseConfig();
    delete config.seriesAxisConfigs;
    config.seriesConfigs = [{ property: 'value', renderer: 'line' }];
    const mochartConfig = enhanceConfig(createSparklineConfig(config));
    expect(mochartConfig.validation.valid).toBe(true);
    expect(mochartConfig.seriesAxisConfigs.length).toBe(1);
    expect(mochartConfig.seriesAxisConfigs[0].visible).toBe(false);
    expect(mochartConfig.seriesConfigs[0].axis).toBe(mochartConfig.seriesAxisConfigs[0].id);
  });

  it('hides every series axis when there are several', () => {
    const config = baseConfig();
    config.seriesAxisConfigs = [{ id: 'sa' }, { id: 'sb' }];
    config.seriesConfigs = [
      { axis: 'sa', property: 'value', renderer: 'line' },
      { axis: 'sb', property: 'other', renderer: 'line' }
    ];
    const mochartConfig = enhanceConfig(createSparklineConfig(config));
    expect(mochartConfig.seriesAxisConfigsById.sa.visible).toBe(false);
    expect(mochartConfig.seriesAxisConfigsById.sb.visible).toBe(false);
  });

  it('keeps the tooltip and crosshairs when interactive', () => {
    const mochartConfig = enhanceConfig(createSparklineConfig(baseConfig(), { interactive: true }));
    expect(mochartConfig.tooltipConfig.visible).toBe(true);
    expect(mochartConfig.crosshairConfig.visible).toBe(true);
    expect(mochartConfig.groupAxisConfig.visible).toBe(false);
  });

  it('applies a custom padding', () => {
    const mochartConfig = enhanceConfig(createSparklineConfig(baseConfig(), { padding: 0 }));
    expect(mochartConfig.chartConfig.padding).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it('lets explicit config values win over the preset', () => {
    const config = baseConfig();
    config.groupAxisConfig = { ...config.groupAxisConfig, visible: true };
    config.legendConfig = { visible: true };
    config.chartConfig = { padding: { top: 8, right: 8, bottom: 8, left: 8 } };
    const mochartConfig = enhanceConfig(createSparklineConfig(config));
    expect(mochartConfig.groupAxisConfig.visible).toBe(true);
    expect(mochartConfig.legendConfig.visible).toBe(true);
    expect(mochartConfig.chartConfig.padding).toEqual({ top: 8, right: 8, bottom: 8, left: 8 });
    expect(mochartConfig.chartConfig.margin).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it('does not mutate the passed config', () => {
    const config = baseConfig();
    const snapshot = JSON.parse(JSON.stringify(config));
    createSparklineConfig(config);
    expect(config).toEqual(snapshot);
  });
});
