import type {
  LinearGradientConfig, MochartConfig, RadialGradientConfig,
  SeriesConfig, SeriesGroupConfig, SeriesStackConfig, ValueAxisConfig
} from './config';

/**
 * Internal enhanced views of the public config types. buildMochartConfig
 * assigns cross-references and lookup maps while it builds the config; they
 * are deliberately absent from the public types (and so from autocomplete and
 * the input config), and the core casts to these types at its entry points.
 * Never exported from the package index.
 */

export interface EnhancedValueAxisConfig extends ValueAxisConfig {
  seriesConfigs?: EnhancedSeriesConfig[];
  seriesConfigIndicesById?: Record<string, number>;
}

export interface EnhancedSeriesConfig extends SeriesConfig {
  valueAxisConfig: EnhancedValueAxisConfig;
  seriesStackConfig?: EnhancedSeriesStackConfig;
  seriesGroupConfig?: EnhancedSeriesGroupConfig;
  linearGradientConfig?: LinearGradientConfig;
  radialGradientConfig?: RadialGradientConfig;
}

export interface EnhancedSeriesStackConfig extends SeriesStackConfig {
  valueAxisConfig?: EnhancedValueAxisConfig;
  seriesConfigs?: EnhancedSeriesConfig[];
  seriesConfigIndicesById?: Record<string, number>;
}

export interface EnhancedSeriesGroupConfig extends SeriesGroupConfig {
  seriesConfigs?: EnhancedSeriesConfig[];
  seriesConfigIndicesById?: Record<string, number>;
}

export interface EnhancedMochartConfig extends Omit<MochartConfig, 'valueAxes' | 'series' | 'seriesGroups' | 'seriesStacks'> {
  valueAxes: EnhancedValueAxisConfig[];
  valueAxesById: Record<string, EnhancedValueAxisConfig>;
  valueAxisIndicesById: Record<string, number>;
  series: EnhancedSeriesConfig[];
  seriesById: Record<string, EnhancedSeriesConfig>;
  seriesIndicesById: Record<string, number>;
  seriesGroups: EnhancedSeriesGroupConfig[];
  seriesGroupsById: Record<string, EnhancedSeriesGroupConfig>;
  seriesStacks: EnhancedSeriesStackConfig[];
  seriesStacksById: Record<string, EnhancedSeriesStackConfig>;
}
