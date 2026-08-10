// The ambient d3 module shims must ride along for consumers that typecheck this package from source
// (the development export condition) — their programs only see files reachable from this entry. A
// global-scope declaration file cannot be imported, only referenced, hence the lint exception.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./types/d3.d.ts" />
export type * from './types';
export { createChart, createDefaultChart } from './createChart';
export type { ChartHandle } from './createChart';
export { getVersionString } from './version';
export { Renderer, El, TextEl, svgEl, htmlEl, textEl, shallowEqual } from './render';
export { default as Chart } from './components/Chart';
export { FocusController } from './chart/FocusController';
export { StaticDataSource } from './chart/StaticDataSource';
export { AnimatedDataSource } from './chart/AnimatedDataSource';
export type { ChartDataSource, ChartDataSourceInput, InternalFocus } from './chart/ChartDataSource';
export { default as Legend } from './components/Legend';
export { default as Crosshair } from './components/Crosshair';
export { default as Tooltip } from './components/Tooltip';
export { ArrayOfObjectsDataProvider, ObjectOfArraysDataProvider } from './data/DataProvider';
export { default as buildMochartConfig, hasConfigStructureChange, applyDefaults, sectionKeyAllMap } from './config/core/mochartConfig';
export { getDefaults } from './config/defaults/mochartConfig';
export { default as validateConfig } from './config/validation/mochartConfig';
export { validateConfigDetailed } from './config/validation/mochartConfig';
export { default as migrateConfig } from './config/migration/mochartConfig';
export { enhanceConfig } from './config/helper';
export { createSparklineConfig } from './config/helper/sparkline';
export type { CreateSparklineConfigOptions } from './config/helper/sparkline';
export { NONE, AUTO, CONFIG_VERSION, TYPE_DATE, TYPE_NUMBER, TYPE_STRING, SCALE_ORDINAL, SCALE_LINEAR } from './config/core/constants';
export {
  ALIGN_LEFT, ALIGN_CENTER, ALIGN_RIGHT,
  VERTICAL_ALIGN_TOP, VERTICAL_ALIGN_MIDDLE, VERTICAL_ALIGN_BOTTOM,
  ANCHOR_START, ANCHOR_MIDDLE, ANCHOR_END,
  POSITION_TOP, POSITION_BOTTOM,
  SIDE_START, SIDE_END,
  TITLE_SIDE_LOW, TITLE_SIDE_HIGH,
  MISSING_VALUES_BREAK, MISSING_VALUES_CONNECT, MISSING_VALUES_BASE,
  RENDERER_BAR, RENDERER_LINE, RENDERER_AREA, RENDERER_NONE,
  CURVE_TYPE_LINEAR, CURVE_TYPE_MONOTONE_X, CURVE_TYPE_MONOTONE_Y, CURVE_TYPE_BASIS,
  CURVE_TYPE_CARDINAL, CURVE_TYPE_CATMULL_ROM, CURVE_TYPE_NATURAL,
  CURVE_TYPE_STEP, CURVE_TYPE_STEP_BEFORE, CURVE_TYPE_STEP_AFTER,
  CAP_TYPE_POINT, CAP_TYPE_CURVE, CAP_TYPE_ROUND,
  LABEL_POSITION_INSIDE, LABEL_POSITION_CENTER, LABEL_POSITION_OUTSIDE,
  COLOR_SERIES, COLOR_SAME, COLOR_SERIES_INDEX, COLOR_CATEGORY_INDEX, COLOR_CURRENT,
  COLOR_INTERPOLATION_RGB, COLOR_INTERPOLATION_HSL, COLOR_INTERPOLATION_LAB, COLOR_INTERPOLATION_HCL,
  MARKER_SHAPE_CIRCLE, MARKER_SHAPE_CROSS, MARKER_SHAPE_DIAMOND, MARKER_SHAPE_SQUARE,
  MARKER_SHAPE_STAR, MARKER_SHAPE_TRIANGLE, MARKER_SHAPE_WYE,
  MARKER_SIZE_SCALE_SQRT, MARKER_SIZE_SCALE_LINEAR,
  PIE_LABEL_TYPE_VALUE, PIE_LABEL_TYPE_PERCENT, PIE_LABEL_TYPE_TITLE,
  PIE_LABEL_TYPE_VALUE_PERCENT, PIE_LABEL_TYPE_PERCENT_VALUE,
  PIE_LABEL_TYPE_TITLE_VALUE, PIE_LABEL_TYPE_TITLE_PERCENT
} from './config/core/constants';
// the union types every config member is declared with, so a host can name one in its own signatures
export type {
  Auto, Align, VerticalAlign, Anchor, Position, MissingValues, AxisSide, ThresholdTitleSide,
  ChartType, PieLabelType, PieTooltipLabelType, Scale, DataType, RendererType, CurveType,
  CapType, LabelPosition, ColorMode, ColorInterpolation, MarkerShape, MarkerSizeScale
} from './config/core/constants';
export { getDataErrors } from './data/DataValidator';
export { binValues, createHistogram } from './data/Histogram';
export type { HistogramBin, BinValuesOptions, CreateHistogramOptions, HistogramData } from './data/Histogram';
export { computeWaterfallSteps, createWaterfall } from './data/Waterfall';
export type { WaterfallDirection, WaterfallItem, WaterfallStep, CreateWaterfallOptions, WaterfallData } from './data/Waterfall';
export { createHeatmap, createHeatmapColorScale } from './data/Heatmap';
export type { HeatmapRow, CreateHeatmapOptions, CreateHeatmapColorScaleOptions, HeatmapData } from './data/Heatmap';
export { computeCandlesticks, createCandlestick } from './data/Candlestick';
export type { CandlestickDirection, CandlestickItem, Candlestick, CreateCandlestickOptions, CandlestickVolumeOptions, CandlestickData } from './data/Candlestick';
export { createOhlc } from './data/Ohlc';
export type { CreateOhlcOptions, OhlcData } from './data/Ohlc';
export { computePieFractions, createPie } from './data/Pie';
export type { PieItem, CreatePieOptions, PieData } from './data/Pie';
export { CHART_TYPE_XY, CHART_TYPE_PIE } from './config/core/constants';
export { mochartCssClasses } from './utils/ChartDom';
export { isDataProviderValid } from './data/ChartData';
