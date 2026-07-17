import type {
  Auto, Align, VerticalAlign, Anchor, Position, Scale, DataType, RendererType,
  CurveType, CapType, LabelPosition, ColorMode, ColorInterpolation, MarkerShape
} from '../config/core/constants';
import type { MarginPadding, InnerOuter } from './geometry';

/**
 * A CSS color string, or one of the palette color modes
 * ('series' | 'same' | 'seriesIndex' | 'groupIndex').
 * The `string & {}` keeps ColorMode literals in autocomplete while still
 * accepting arbitrary color strings.
 */
export type SeriesColor = ColorMode | (string & {});

export interface BackgroundStyle {
  stroke: string | null;
  strokeOpacity: number | null;
  strokeWidth: number | null;
  fill: string | null;
  fillOpacity: number | null;
}

export type TextStyle = BackgroundStyle;

export interface AnimationConfig {
  animate: boolean;
  initialDuration: number;
  expansionDuration: number;
  valueChangeDuration: number;
  collapseDuration: number;
  focusDuration: number;
}

export interface ChartConfig {
  margin: MarginPadding;
  padding: MarginPadding;
  backgroundStyle: BackgroundStyle;
}

export interface PlotConfig {
  inverted: boolean;
  margin: MarginPadding;
  padding: MarginPadding;
  backgroundStyle: BackgroundStyle;
}

export interface ColorPalette {
  strokeColors: string[];
  fillColors: string[];
}

export interface ColorPaletteConfig {
  series: ColorPalette;
  seriesFocused: ColorPalette;
  seriesDefocused: ColorPalette;
  marker: ColorPalette;
  markerFocused: ColorPalette;
  markerDefocused: ColorPalette;
  label: ColorPalette;
  labelFocused: ColorPalette;
  labelDefocused: ColorPalette;
}

export interface CrosshairConfig {
  visible: boolean;
  applyFocus: boolean;
  showGroup: boolean;
  showSeries: boolean;
  lineColor: string;
  lineWidth: number;
  lineDashArray: string;
  showBehindTooltip: boolean;
}

export interface TitleConfig {
  title: string | null;
  position: Position;
  titlePrefix: string | null;
  titleSuffix: string | null;
  link: string | null;
  linkDisabled: boolean;
  truncationEnabled: boolean;
  truncationValue: string;
  alignedToAxes: boolean;
  align: Align;
  verticalAlign: VerticalAlign;
  verticalExpand: boolean;
  margin: MarginPadding;
  padding: MarginPadding;
  textMargin: MarginPadding;
  textPadding: MarginPadding;
  prefixMargin: MarginPadding;
  prefixPadding: MarginPadding;
  suffixMargin: MarginPadding;
  suffixPadding: MarginPadding;
  backgroundStyle: BackgroundStyle;
  titleBackgroundStyle: BackgroundStyle;
  titleTextStyle: TextStyle;
  prefixBackgroundStyle: BackgroundStyle;
  prefixTextStyle: TextStyle;
  suffixBackgroundStyle: BackgroundStyle;
  suffixTextStyle: TextStyle;
}

export interface LegendConfig {
  visible: boolean;
  position: Position;
  truncationEnabled: boolean;
  truncationValue: string;
  alignedToAxes: boolean;
  align: Align;
  margin: MarginPadding;
  padding: MarginPadding;
  backgroundStyle: BackgroundStyle;
  itemMargin: MarginPadding;
  itemPadding: MarginPadding;
  itemBackgroundStyle: BackgroundStyle;
  showIconColors: boolean;
  showIconShapes: boolean;
  showIconPlaceholders: boolean;
  iconSize: number;
  iconSpacerSize: number;
  iconBorderSize: number;
  iconBorderColor: string;
  iconSuppressedColor: string;
  iconUnsuppressedColor: string;
  focusOnMouseOver: boolean;
  focusOnClick: boolean;
  filterOnClick: boolean;
}

export interface TooltipConfig {
  visible: boolean;
  applyFocus: boolean;
  snapToGroup: boolean;
  mouseOver: boolean;
  closeOnClick: boolean;
  filterOnSeriesClick: boolean;
  focusOnGroupClick: boolean;
  focusOnSeriesClick: boolean;
  focusOnGroupMouseOver: boolean;
  focusOnSeriesMouseOver: boolean;
  showControls: boolean;
  keepInside: boolean;
  minWidth: number;
  padding: number;
  linePadding: number;
  alignValues: boolean;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  dropShadowColor: string;
  dropShadowOffsetX: number;
  dropShadowOffsetY: number;
  dropShadowBlurRadius: number;
  showIconColors: boolean;
  showIconShapes: boolean;
  showIconPlaceholders: boolean;
  iconSize: number;
  iconSpacerSize: number;
  iconBorderSize: number;
  iconBorderColor: string;
  iconSuppressedColor: string;
  iconUnsuppressedColor: string;
  adjustForSuppression: boolean;
  adjustSizeForSuppression: boolean;
  hideSuppressed: boolean;
  showMissingValues: boolean;
  suppressedValueText: string | null;
  suppressedValueCharacter: string;
  missingValueText: string;
  rangeValueText: string;
}

/** Shared properties of the group axis and series axes (config/defaults/axisConfig.ts). */
export interface AxisConfigBase {
  axisLine: boolean;
  axisLineFront: boolean;
  axisLineWidth: number;
  axisLineDashArray: string | null;
  axisLineMargin: number;
  axisLineColor: string;
  axisLineFocusedColor: string;
  axisLineDefocusedColor: string;
  axisLineOpacity: number;
  axisLineFocusedOpacity: number;
  axisLineDefocusedOpacity: number;

  backgroundStyle: BackgroundStyle;
  backgroundFront: boolean;

  before: boolean;

  collapsed: boolean;

  focusRange: boolean;
  focusRangeFront: boolean;
  focusRangeApplyToTitle: boolean;
  focusRangeStrokeColor: string;
  focusRangeFillColor: string;
  focusRangeStrokeOpacity: number;
  focusRangeFillOpacity: number;
  focusRangeStrokeWidth: number;
  focusRangeDashArray: string | null;

  focusTickMarks: boolean;
  focusTickMarksFront: boolean;
  focusTickMarkSize: number;
  focusTickMarkMargin: number;
  focusTickMarkWidth: number;
  focusTickMarkColor: string;
  focusTickMarkOpacity: number;

  gridLines: boolean;
  gridLinesFront: boolean;
  gridLineWidth: number;
  gridLineDashArray: string | null;
  gridLineColor: string;
  gridLineFocusedColor: string;
  gridLineDefocusedColor: string;
  gridLineOpacity: number;
  gridLineFocusedOpacity: number;
  gridLineDefocusedOpacity: number;

  marginInner: number;
  marginOuter: number;

  max: number | Auto;
  maxOffset: number;
  maxTickCount: number;

  min: number | Auto;
  minOffset: number;

  minTickSpacing: number;
  minTickInterval: number;

  paddingInner: number;
  paddingOuter: number;

  softMin: number | null;
  softMax: number | null;

  threshold: number | null;
  thresholdFront: boolean;
  thresholdTitle: string | null;
  thresholdTitleBefore: boolean;
  thresholdTitleSnapToValue: boolean;
  thresholdTitleMargin: MarginPadding;
  thresholdTitlePadding: MarginPadding;
  thresholdTitleStrokeColor: string;
  thresholdTitleFocusedStrokeColor: string;
  thresholdTitleDefocusedStrokeColor: string;
  thresholdTitleFillColor: string;
  thresholdTitleFocusedFillColor: string;
  thresholdTitleDefocusedFillColor: string;
  thresholdTitleStrokeOpacity: number;
  thresholdTitleFocusedStrokeOpacity: number;
  thresholdTitleDefocusedStrokeOpacity: number;
  thresholdTitleFillOpacity: number;
  thresholdTitleFocusedFillOpacity: number;
  thresholdTitleDefocusedFillOpacity: number;
  thresholdTitleBackgroundStyle: BackgroundStyle;
  thresholdWidth: number;
  thresholdDashArray: string | null;
  thresholdColor: string;
  thresholdFocusedColor: string;
  thresholdDefocusedColor: string;
  thresholdOpacity: number;
  thresholdFocusedOpacity: number;
  thresholdDefocusedOpacity: number;

  tickCount: number | Auto;

  tickLabelFront: boolean;
  tickLabelAnchor: Anchor | Auto;
  tickLabelBackgroundStyle: BackgroundStyle;
  tickLabelSize: number | Auto;
  tickLabelMarginInner: number;
  tickLabelMarginOuter: number;
  tickLabelPaddingInner: number;
  tickLabelPaddingOuter: number;
  tickLabelStrokeWidth: number;
  tickLabelFormat: string | Auto;
  tickLabelPrefix: string | null;
  tickLabelSuffix: string | null;
  tickLabelRotation: number;
  tickLabelStrokeColor: string;
  tickLabelFocusedStrokeColor: string;
  tickLabelDefocusedStrokeColor: string;
  tickLabelFillColor: string;
  tickLabelFocusedFillColor: string;
  tickLabelDefocusedFillColor: string;
  tickLabelStrokeOpacity: number;
  tickLabelFocusedStrokeOpacity: number;
  tickLabelDefocusedStrokeOpacity: number;
  tickLabelFillOpacity: number;
  tickLabelFocusedFillOpacity: number;
  tickLabelDefocusedFillOpacity: number;

  tickMarks: boolean;
  tickMarkFront: boolean;
  tickMarkSize: number;
  tickMarkMargin: number;
  tickMarkWidth: number;
  tickMarkColor: string;
  tickMarkFocusedColor: string;
  tickMarkDefocusedColor: string;
  tickMarkOpacity: number;
  tickMarkFocusedOpacity: number;
  tickMarkDefocusedOpacity: number;

  title: string | null;
  titleFront: boolean;
  titleBackgroundStyle: BackgroundStyle;
  titleTruncationEnabled: boolean;
  titleTruncationValue: string;
  titleSize: number | Auto;
  titleMarginInner: number;
  titleMarginOuter: number;
  titlePaddingInner: number;
  titlePaddingOuter: number;
  titleStrokeWidth: number;
  titleStrokeColor: string;
  titleFocusedStrokeColor: string;
  titleDefocusedStrokeColor: string;
  titleFillColor: string;
  titleFocusedFillColor: string;
  titleDefocusedFillColor: string;
  titleStrokeOpacity: number;
  titleFocusedStrokeOpacity: number;
  titleDefocusedStrokeOpacity: number;
  titleFillOpacity: number;
  titleFocusedFillOpacity: number;
  titleDefocusedFillOpacity: number;
  visible: boolean;
}

export interface GroupAxisConfig extends AxisConfigBase {
  /** Data property holding the group value; set by the user, no default. */
  property?: string;
  dateUTC: boolean;
  displayProperty: string | null;
  groupPadding: InnerOuter;
  groupCountPadding: number;
  minGroupValueExtent: number;
  scale: Scale;
  tickLabelTruncationEnabled: boolean;
  tickLabelTruncationValue: string;
  tickLabelTruncationMinLength: number;
  tickLabelTruncationMaxPercent: number;
  type: DataType;
  valueFormat: string | Auto;
  valueLabel: string | null;
  valuePrefix: string | null;
  valueSuffix: string | null;
}

export interface SeriesAxisConfig extends AxisConfigBase {
  id: string;
  order: number;
  adjustForSuppression: boolean;
  adjustTickLabelSizeForSuppression: boolean;
  alwaysVisible: boolean;
  base: number | null;
  baseLine: boolean;
  baseLineFront: boolean;
  baseLineWidth: number;
  baseLineDashArray: string | null;
  baseLineColor: string;
  baseLineFocusedColor: string;
  baseLineDefocusedColor: string;
  baseLineOpacity: number;
  baseLineFocusedOpacity: number;
  baseLineDefocusedOpacity: number;
  focusOnMouseOver: boolean;
  focusOnClick: boolean;
  maxMarginPercent: number;
  minMarginPercent: number;
  scale: Scale;
  type: DataType;
  useSeriesFocus: boolean;
  /** Back-references assigned by buildMochartConfig. */
  seriesConfigs?: SeriesConfig[];
  seriesConfigIndicesById?: Record<string, number>;
}

export interface SeriesCurve {
  type: CurveType;
  /** Passed to the selected D3 curve's tension/alpha configurator. */
  param?: number;
}

export interface SeriesConfig {
  id: string;
  order: number;
  /** Data property holding the series value; set by the user, no default. */
  property?: string;
  rangeProperty: string | null;
  markerProperty: string | null;
  colorProperty: string | null;
  labelProperty: string | null;
  /** Referenced config ids. */
  axis?: string;
  stack: string | null;
  group: string | null;
  gradient: string | null;
  ignore: boolean;
  renderer: RendererType;
  skipMissing: boolean;
  showMissingAtBase: boolean;
  animateBaseFromAdjacent: boolean;
  curve: SeriesCurve;
  capSize: number;
  capType: CapType | null;
  capExpand: boolean;
  capOnlyStackOuter: boolean;
  valueLabel: string | null;
  valueFormat: string | Auto;
  valuePrefix: string | null;
  valueSuffix: string | null;
  useTitleForValueLabel: boolean;
  title: string | null;
  labelFormat: string | Auto;
  labelStrokeColor: SeriesColor;
  labelFocusedStrokeColor: SeriesColor;
  labelDefocusedStrokeColor: SeriesColor;
  labelFillColor: SeriesColor;
  labelFocusedFillColor: SeriesColor;
  labelDefocusedFillColor: SeriesColor;
  labelMinPositionPercent: number | null;
  labelMaxPositionPercent: number | null;
  labelMinRangePercent: number | null;
  labelOffset: number;
  labelPosition: LabelPosition;
  labelAboveBaseMinPositionPercent: number | Auto;
  labelAboveBaseMaxPositionPercent: number | Auto;
  labelBelowBaseMinPositionPercent: number | Auto;
  labelBelowBaseMaxPositionPercent: number | Auto;
  labelAboveBaseOffset: number | Auto;
  labelBelowBaseOffset: number | Auto;
  labelAboveBasePosition: LabelPosition | Auto;
  labelBelowBasePosition: LabelPosition | Auto;
  labelStrokeWidth: number;
  labelFocusedStrokeWidth: number;
  labelDefocusedStrokeWidth: number;
  labelStrokeOpacity: number;
  labelFillOpacity: number;
  labelFocusedStrokeOpacity: number;
  labelFocusedFillOpacity: number;
  labelDefocusedStrokeOpacity: number;
  labelDefocusedFillOpacity: number;
  strokeColor: SeriesColor;
  focusedStrokeColor: SeriesColor;
  defocusedStrokeColor: SeriesColor;
  fillColor: SeriesColor;
  focusedFillColor: SeriesColor;
  defocusedFillColor: SeriesColor;
  strokeOpacity: number;
  fillOpacity: number;
  focusedStrokeOpacity: number;
  focusedFillOpacity: number;
  defocusedStrokeOpacity: number;
  defocusedFillOpacity: number;
  strokeWidth: number;
  focusedStrokeWidth: number;
  defocusedStrokeWidth: number;
  colorInterpolation: ColorInterpolation | null;
  colorMin: string | null;
  colorMax: string | null;
  colorBaseAboveMin: string | null;
  colorBaseAboveMax: string | null;
  colorBase: number | null;
  colorBaseBelowMin: string | null;
  colorBaseBelowMax: string | null;
  minMarkerSize: number;
  markerShowMissing: boolean;
  markerSize: number;
  markerShape: MarkerShape | null;
  markerStrokeColor: SeriesColor;
  markerFocusedStrokeColor: SeriesColor;
  markerDefocusedStrokeColor: SeriesColor;
  markerFillColor: SeriesColor;
  markerFocusedFillColor: SeriesColor;
  markerDefocusedFillColor: SeriesColor;
  markerStrokeWidth: number;
  markerFocusedStrokeWidth: number;
  markerDefocusedStrokeWidth: number;
  markerStrokeOpacity: number;
  markerFillOpacity: number;
  markerFocusedStrokeOpacity: number;
  markerFocusedFillOpacity: number;
  markerDefocusedStrokeOpacity: number;
  markerDefocusedFillOpacity: number;
  showInLegend: boolean;
  showInTooltip: boolean;
  showColorInLegend: boolean;
  showColorInTooltip: boolean;
  suppressible: boolean;
  focusOnMouseOver: boolean;
  focusOnClick: boolean;
  focusGroupOnMouseOver: boolean;
  focusGroupOnClick: boolean;
  useAxisFocus: boolean;
  /** Back-references assigned by buildMochartConfig. */
  seriesAxisConfig: SeriesAxisConfig;
  seriesStackConfig?: SeriesStackConfig;
  seriesGroupConfig?: SeriesGroupConfig;
  linearGradientConfig?: LinearGradientConfig;
  radialGradientConfig?: RadialGradientConfig;
}

export interface SeriesStackConfig {
  id: string;
  order?: number;
  /** Referenced series axis id. */
  axis?: string;
  outerCapSize: number;
  outerCapType: CapType | null;
  outerCapExpand: boolean;
  /** Back-references assigned by buildMochartConfig. */
  seriesAxisConfig?: SeriesAxisConfig;
  seriesConfigs?: SeriesConfig[];
  seriesConfigIndicesById?: Record<string, number>;
}

export interface SeriesGroupConfig {
  id: string;
  order?: number;
  /** Back-references assigned by buildMochartConfig. */
  seriesConfigs?: SeriesConfig[];
  seriesConfigIndicesById?: Record<string, number>;
}

export interface GradientStop {
  offset: number;
  color: string;
  opacity: number;
}

export interface LinearGradientConfig {
  id: string;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  rotation: number;
  stops?: GradientStop[];
}

export interface RadialGradientConfig {
  id: string;
  cx: number;
  cy: number;
  fx: number;
  fy: number;
  r: number;
  rotation: number;
  stops?: GradientStop[];
}

export interface ConfigValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** The fully built config returned by buildMochartConfig (all defaults applied). */
export interface MochartConfig {
  id?: string;
  animationConfig: AnimationConfig;
  chartConfig: ChartConfig;
  colorPaletteConfig: ColorPaletteConfig;
  crosshairConfig: CrosshairConfig;
  groupAxisConfig: GroupAxisConfig;
  legendConfig: LegendConfig;
  linearGradientConfigs: LinearGradientConfig[];
  plotConfig: PlotConfig;
  radialGradientConfigs: RadialGradientConfig[];
  seriesAxisConfigs: SeriesAxisConfig[];
  seriesAxisConfigsById: Record<string, SeriesAxisConfig>;
  seriesAxisConfigIndicesById: Record<string, number>;
  seriesConfigs: SeriesConfig[];
  seriesConfigsById: Record<string, SeriesConfig>;
  seriesConfigIndicesById: Record<string, number>;
  seriesGroupConfigs: SeriesGroupConfig[];
  seriesGroupConfigsById: Record<string, SeriesGroupConfig>;
  seriesStackConfigs: SeriesStackConfig[];
  seriesStackConfigsById: Record<string, SeriesStackConfig>;
  titleConfig: TitleConfig;
  tooltipConfig: TooltipConfig;
  validation: ConfigValidation;
}

type OneOrMany<T> = T | T[];

/** The user-facing config accepted by buildMochartConfig, before defaults are applied. */
export interface MochartInputConfig {
  id?: string;
  version?: string;
  animationConfig?: Partial<AnimationConfig>;
  chartConfig?: Partial<ChartConfig>;
  colorPaletteConfig?: Partial<ColorPaletteConfig>;
  crosshairConfig?: Partial<CrosshairConfig>;
  groupAxisConfig?: Partial<GroupAxisConfig>;
  legendConfig?: Partial<LegendConfig>;
  plotConfig?: Partial<PlotConfig>;
  titleConfig?: Partial<TitleConfig>;
  tooltipConfig?: Partial<TooltipConfig>;
  linearGradientConfigs?: OneOrMany<Partial<LinearGradientConfig>>;
  linearGradientAllConfig?: Partial<LinearGradientConfig>;
  radialGradientConfigs?: OneOrMany<Partial<RadialGradientConfig>>;
  radialGradientAllConfig?: Partial<RadialGradientConfig>;
  seriesAxisConfigs?: OneOrMany<Partial<SeriesAxisConfig>>;
  seriesAxisAllConfig?: Partial<SeriesAxisConfig>;
  seriesConfigs?: OneOrMany<Partial<SeriesConfig>>;
  seriesAllConfig?: Partial<SeriesConfig>;
  seriesGroupConfigs?: OneOrMany<Partial<SeriesGroupConfig>>;
  seriesGroupAllConfig?: Partial<SeriesGroupConfig>;
  seriesStackConfigs?: OneOrMany<Partial<SeriesStackConfig>>;
  seriesStackAllConfig?: Partial<SeriesStackConfig>;
}
