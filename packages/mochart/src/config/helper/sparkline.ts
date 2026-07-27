import type { MochartInputConfig } from '../../types/config';
import type { MarginPadding } from '../../types/geometry';

export interface CreateSparklineConfigOptions {
  /**
   * Whether the tooltip and crosshairs should stay enabled. Sparklines are
   * usually too small to host either, so both default to off.
   *
   * @default false
   */
  interactive?: boolean;
  /**
   * The uniform chart padding (in pixels). A couple of pixels keeps strokes at
   * the extremes of the data from clipping against the chart edges.
   *
   * @default 2
   */
  padding?: number;
}

const uniform = (value: number): MarginPadding => ({ top: value, right: value, bottom: value, left: value });

/**
 * Turns a chart input config into a sparkline preset: axes, legend, tooltip,
 * crosshairs and per-point markers hidden and margins collapsed, leaving only
 * the plotted shapes for tiny inline charts. The preset only fills in
 * defaults — any value set on the passed config wins, so individual pieces
 * (e.g. the tooltip) can be opted back in per chart.
 */
export function createSparklineConfig(config: MochartInputConfig, options: CreateSparklineConfigOptions = {}): MochartInputConfig {
  const interactive = options.interactive ?? false;
  const padding = options.padding ?? 2;
  return {
    ...config,
    chartConfig: { margin: uniform(0), padding: uniform(padding), ...config.chartConfig },
    legendConfig: { visible: false, ...config.legendConfig },
    tooltipConfig: { visible: interactive, ...config.tooltipConfig },
    crosshairConfig: { visible: interactive, ...config.crosshairConfig },
    groupAxisConfig: { visible: false, ...config.groupAxisConfig },
    seriesAxisAllConfig: { visible: false, ...config.seriesAxisAllConfig },
    seriesAllConfig: { markerShape: null, ...config.seriesAllConfig }
  };
}
