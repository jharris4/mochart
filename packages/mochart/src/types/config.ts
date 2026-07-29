import type {
  Auto, Align, VerticalAlign, Anchor, Position, Scale, DataType, RendererType,
  CurveType, CapType, LabelPosition, ColorMode, ColorInterpolation, MarkerShape,
  ChartType, PieLabelType
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
  /**
   * Whether all animation should be enabled or disabled.
   *
   * The master switch for staged animation. When `false`, config, data, and
   * size changes apply instantly. When `true`, each update plays up to three
   * sequential phases — axis expansion, value change, axis contraction —
   * skipping phases it does not need, and each phase’s duration scales with the
   * size of its change (small updates play faster than the configured maximum).
   *
   * @default true
   */
  animate: boolean;
  /**
   * The maximum duration for the initial animation when chart data is first
   * loaded.
   *
   * Duration (in milliseconds) of the first render animation when the chart
   * mounts with data.
   *
   * @default 1000
   */
  initialDuration: number;
  /**
   * The maximum duration for the axis expansion animation phase when new data
   * is added to the chart.
   *
   * Duration (in milliseconds) of the axis expansion phase, which plays first
   * when an update needs larger axis domains (new groups or larger values) so
   * incoming data has room to land.
   *
   * @default 1000
   */
  expansionDuration: number;
  /**
   * The maximum duration for the value change animation phase when data in the
   * chart changes.
   *
   * Duration (in milliseconds) of the value change phase, which tweens values
   * to their new positions and also plays group transitions (groups
   * added/removed/reordered) and series transitions (series added, removed, or
   * filtered via the legend).
   *
   * @default 1000
   */
  valueChangeDuration: number;
  /**
   * The maximum duration for the axis collapse animation phase when new data is
   * removed from the chart.
   *
   * Duration (in milliseconds) of the axis contraction phase, which plays last
   * when the settled data needs smaller axis domains.
   *
   * @default 1000
   */
  collapseDuration: number;
  /**
   * The duration of animation showing the transition between focus on a
   * specific series or group value.
   *
   * Duration (in milliseconds) of focus transitions — the emphasis change
   * between focused/defocused styling when a series or group gains or loses
   * focus via hover, click, or the legend.
   *
   * @default 1000
   */
  focusDuration: number;
}

export interface ChartConfig {
  /**
   * The type of chart to render: an x/y plot with axes (xy) or a pie/donut
   * chart (pie).
   *
   * @default "xy"
   */
  type: ChartType;
  /**
   * The margin (in pixels) for the top, right, bottom and left sides of the
   * chart.
   *
   * @default { top: 2, right: 2, bottom: 2, left: 2 }
   */
  margin: MarginPadding;
  /**
   * The padding (in pixels) for the top, right, bottom and left sides of the
   * chart.
   *
   * @default { top: 3, right: 3, bottom: 3, left: 3 }
   */
  padding: MarginPadding;
  /**
   * The styles to apply to the chart background (stroke, strokeOpacity,
   * strokeWidth, fill, fillOpacity (use null for none)).
   *
   * @default { stroke: null, strokeOpacity: 0, strokeWidth: null, fill: null, fillOpacity: 0 }
   */
  backgroundStyle: BackgroundStyle;
}

export interface PlotConfig {
  /**
   * Whether the group axis should be left to right (false) or top to bottom
   * (true).
   *
   * @default false
   */
  inverted: boolean;
  /**
   * The margin (in pixels) for the top, right, bottom and left sides of the
   * plot.
   *
   * @default { top: 0, right: 0, bottom: 0, left: 0 }
   */
  margin: MarginPadding;
  /**
   * The padding (in pixels) for the top, right, bottom and left sides of the
   * plot.
   *
   * @default { top: 0, right: 0, bottom: 0, left: 0 }
   */
  padding: MarginPadding;
  /**
   * The styles to apply to the plot background (stroke, strokeOpacity,
   * strokeWidth, fill, fillOpacity (use null for none)).
   *
   * @default { stroke: null, strokeOpacity: 0, strokeWidth: null, fill: null, fillOpacity: 0 }
   */
  backgroundStyle: BackgroundStyle;
}

export interface PieConfig {
  /**
   * The inner radius of the slices as a fraction (0 to 1) of the outer radius
   * (use a value greater than 0 for a donut chart).
   *
   * @default 0
   */
  innerRadiusPercent: number;
  /**
   * The outer radius of the slices as a fraction (0 to 1) of the largest radius
   * that fits within the plot.
   *
   * @default 1
   */
  outerRadiusPercent: number;
  /**
   * The angle (in degrees, clockwise from the top) at which the first slice
   * starts.
   *
   * @default 0
   */
  startAngle: number;
  /**
   * The angle (in degrees, clockwise from the top) at which the last slice ends
   * (use startAngle -90 and endAngle 90 for a half/gauge pie).
   *
   * Default:
   * - `startAngle + 360` — a full circle from startAngle
   */
  endAngle: number;
  /**
   * The angle (in degrees) of the gap between adjacent slices.
   *
   * @default 0
   */
  padAngle: number;
  /**
   * The corner radius (in pixels) applied to the slice corners.
   *
   * @default 0
   */
  cornerRadius: number;
  /**
   * Offset the focused slice away from the center by this fraction (0 to 1) of
   * the outer radius (an exploded slice).
   *
   * @default 0
   */
  focusOffsetPercent: number;
  /**
   * Whether labels should be shown on the slices.
   *
   * @default false
   */
  showLabels: boolean;
  /**
   * The content of the slice labels: the slice value (value), the slice
   * percentage of the total (percent) or the series title (title).
   *
   * @default "percent"
   */
  labelType: PieLabelType;
  /**
   * The d3 format specifier used to format value and percent slice labels (use
   * auto to derive a format).
   *
   * @default "auto"
   */
  labelFormat: string | Auto;
  /**
   * The radial position of the slice labels as a fraction (0 to 1) between the
   * inner radius and the outer radius.
   *
   * @default 0.5
   */
  labelRadiusPercent: number;
  /**
   * Hide the label of any slice whose value is smaller than this fraction (0 to
   * 1) of the slice total.
   *
   * @default 0.05
   */
  labelMinAnglePercent: number;
  /**
   * Whether percent slice labels (and the labelMinAnglePercent threshold)
   * renormalize against the unsuppressed slices (true) or always use every
   * slice's share of the full total (false).
   *
   * @default true
   */
  adjustLabelsForSuppression: boolean;
  /**
   * A text label shown at the center of the pie (use null for none; most useful
   * for donut and gauge charts).
   *
   * @default null
   */
  centerLabel: string | null;
  /**
   * Whether the total of the slice values should be shown at the center of the
   * pie.
   *
   * @default false
   */
  showCenterTotal: boolean;
  /**
   * The d3 format specifier used to format the center total (use auto to derive
   * a format).
   *
   * @default "auto"
   */
  centerTotalFormat: string | Auto;
  /**
   * Whether the center total counts only the unsuppressed slices (true) or
   * always shows the full total (false).
   *
   * @default true
   */
  adjustCenterTotalForSuppression: boolean;
}

export interface ColorPalette {
  strokeColors: string[];
  fillColors: string[];
}

export interface ColorPaletteConfig {
  /**
   * The color palette to use for series shapes that are colored by series or
   * group index.
   *
   * The fallback coloring for series that do not set explicit colors: each
   * series takes the palette entry for its series index (or its group index,
   * for series configured to color by group index). The focused/defocused
   * variants apply while another element has focus.
   *
   * @default { strokeColors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf", "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5", "#c49c94", "#f7b6d2", "#c7c7c7", "#dbdb8d", "#9edae5"], fillColors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf", "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5", "#c49c94", "#f7b6d2", "#c7c7c7", "#dbdb8d", "#9edae5"] }
   */
  series: ColorPalette;
  /**
   * The color palette to use for focused series shapes that are colored by
   * series or group index.
   *
   * @default { strokeColors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf", "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5", "#c49c94", "#f7b6d2", "#c7c7c7", "#dbdb8d", "#9edae5"], fillColors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf", "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5", "#c49c94", "#f7b6d2", "#c7c7c7", "#dbdb8d", "#9edae5"] }
   */
  seriesFocused: ColorPalette;
  /**
   * The color palette to use for defocused series shapes that are colored by
   * series or group index.
   *
   * @default { strokeColors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf", "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5", "#c49c94", "#f7b6d2", "#c7c7c7", "#dbdb8d", "#9edae5"], fillColors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf", "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5", "#c49c94", "#f7b6d2", "#c7c7c7", "#dbdb8d", "#9edae5"] }
   */
  seriesDefocused: ColorPalette;
  /**
   * The color palette to use for series markers that are colored by series or
   * group index.
   *
   * @default { strokeColors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf", "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5", "#c49c94", "#f7b6d2", "#c7c7c7", "#dbdb8d", "#9edae5"], fillColors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf", "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5", "#c49c94", "#f7b6d2", "#c7c7c7", "#dbdb8d", "#9edae5"] }
   */
  marker: ColorPalette;
  /**
   * The color palette to use for focused series markers that are colored by
   * series or group index.
   *
   * @default { strokeColors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf", "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5", "#c49c94", "#f7b6d2", "#c7c7c7", "#dbdb8d", "#9edae5"], fillColors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf", "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5", "#c49c94", "#f7b6d2", "#c7c7c7", "#dbdb8d", "#9edae5"] }
   */
  markerFocused: ColorPalette;
  /**
   * The color palette to use for defocused series markers that are colored by
   * series or group index.
   *
   * @default { strokeColors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf", "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5", "#c49c94", "#f7b6d2", "#c7c7c7", "#dbdb8d", "#9edae5"], fillColors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf", "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5", "#c49c94", "#f7b6d2", "#c7c7c7", "#dbdb8d", "#9edae5"] }
   */
  markerDefocused: ColorPalette;
  /**
   * The color palette to use for series labels that are colored by series or
   * group index.
   *
   * @default { strokeColors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf", "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5", "#c49c94", "#f7b6d2", "#c7c7c7", "#dbdb8d", "#9edae5"], fillColors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf", "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5", "#c49c94", "#f7b6d2", "#c7c7c7", "#dbdb8d", "#9edae5"] }
   */
  label: ColorPalette;
  /**
   * The color palette to use for focused series labels that are colored by
   * series or group index.
   *
   * @default { strokeColors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf", "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5", "#c49c94", "#f7b6d2", "#c7c7c7", "#dbdb8d", "#9edae5"], fillColors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf", "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5", "#c49c94", "#f7b6d2", "#c7c7c7", "#dbdb8d", "#9edae5"] }
   */
  labelFocused: ColorPalette;
  /**
   * The color palette to use for defocused series labels that are colored by
   * series or group index.
   *
   * @default { strokeColors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf", "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5", "#c49c94", "#f7b6d2", "#c7c7c7", "#dbdb8d", "#9edae5"], fillColors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf", "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5", "#c49c94", "#f7b6d2", "#c7c7c7", "#dbdb8d", "#9edae5"] }
   */
  labelDefocused: ColorPalette;
}

export interface CrosshairConfig {
  /**
   * Whether or not crosshairs should be shown when a group or series is
   * focused.
   *
   * @default true
   */
  visible: boolean;
  /**
   * Whether to change the focused group as the crosshairs are shown or hidden.
   *
   * @default true
   */
  applyFocus: boolean;
  /**
   * Whether or not crosshair lines for focused groups should be shown.
   *
   * @default true
   */
  showGroup: boolean;
  /**
   * Whether or not crosshair lines for focused series should be shown.
   *
   * @default true
   */
  showSeries: boolean;
  /**
   * The color to use when showing the crosshair lines.
   *
   * @default 'rgba(0,0,0,0.3)'
   */
  lineColor: string;
  /**
   * The stroke width (in pixels) of the crosshair lines.
   *
   * @default 3
   */
  lineWidth: number;
  /**
   * The dash array pattern to use when drawing the crosshair lines (use null
   * for none).
   *
   * @default "10, 5"
   */
  lineDashArray: string;
  /**
   * Whether to show the crosshair lines for sections where they are overlapped
   * by the tooltip.
   *
   * @default false
   */
  showBehindTooltip: boolean;
}

export interface TitleConfig {
  /**
   * The text to display in the title at the top of the chart (use null for
   * none).
   *
   * @default null
   */
  title: string | null;
  /**
   * The position of the title relative to the chart (top or bottom).
   *
   * @default "top"
   */
  position: Position;
  /**
   * The text to display at the start of the title at the top of the chart (use
   * null for none).
   *
   * @default null
   */
  titlePrefix: string | null;
  /**
   * The text to display at the end of the title at the top of the chart (use
   * null for none).
   *
   * @default null
   */
  titleSuffix: string | null;
  /**
   * The link to create for the title (use null for none).
   *
   * @default null
   */
  link: string | null;
  /**
   * Whether to prevent default navigation behaviour when the link is clicked.
   *
   * @default false
   */
  linkDisabled: boolean;
  /**
   * Whether to use text truncation when the title width exceeds the width of
   * the chart.
   *
   * @default true
   */
  truncationEnabled: boolean;
  /**
   * The truncation text to append to the title when its length exceeds the
   * length of the chart.
   *
   * @default "…"
   */
  truncationValue: string;
  /**
   * Whether the title should be aligned between the axes (true) or the chart
   * bounds (false).
   *
   * @default true
   */
  alignedToAxes: boolean;
  /**
   * The alignment for the title (left, center, right).
   *
   * @default "center"
   */
  align: Align;
  /**
   * The vertical alignment of the prefix/text/suffix within the title.
   *
   * @default "middle"
   */
  verticalAlign: VerticalAlign;
  /**
   * Whether to expand the padding height of the prefix/text/suffix to match the
   * max section height.
   *
   * @default false
   */
  verticalExpand: boolean;
  /**
   * The margin (in pixels) for the top, right, bottom and left sides of the
   * title.
   *
   * @default { top: 0, right: 0, bottom: 5, left: 0 }
   */
  margin: MarginPadding;
  /**
   * The padding (in pixels) for the top, right, bottom and left sides of the
   * title.
   *
   * @default { top: 0, right: 0, bottom: 5, left: 0 }
   */
  padding: MarginPadding;
  /**
   * The margin (in pixels) for the top, right, bottom and left sides of the
   * title text.
   *
   * @default { top: 0, right: 0, bottom: 0, left: 0 }
   */
  textMargin: MarginPadding;
  /**
   * The padding (in pixels) for the top, right, bottom and left sides of the
   * title text.
   *
   * @default { top: 0, right: 0, bottom: 0, left: 0 }
   */
  textPadding: MarginPadding;
  /**
   * The margin (in pixels) for the top, right, bottom and left sides of the
   * title prefix.
   *
   * @default { top: 0, right: 5, bottom: 0, left: 0 }
   */
  prefixMargin: MarginPadding;
  /**
   * The padding (in pixels) for the top, right, bottom and left sides of the
   * title prefix.
   *
   * @default { top: 0, right: 5, bottom: 0, left: 0 }
   */
  prefixPadding: MarginPadding;
  /**
   * The margin (in pixels) for the top, right, bottom and left sides of the
   * title suffix.
   *
   * @default { top: 0, right: 0, bottom: 0, left: 5 }
   */
  suffixMargin: MarginPadding;
  /**
   * The padding (in pixels) for the top, right, bottom and left sides of the
   * title suffix.
   *
   * @default { top: 0, right: 0, bottom: 0, left: 5 }
   */
  suffixPadding: MarginPadding;
  /**
   * The styles to apply to the title background (stroke, strokeOpacity,
   * strokeWidth, fill, fillOpacity (use null for none)).
   *
   * @default { stroke: null, strokeOpacity: 0, strokeWidth: null, fill: null, fillOpacity: 0 }
   */
  backgroundStyle: BackgroundStyle;
  /**
   * The styles to apply to the title text background (stroke, strokeOpacity,
   * strokeWidth, fill, fillOpacity (use null for none)).
   *
   * @default { stroke: null, strokeOpacity: 0, strokeWidth: null, fill: null, fillOpacity: 0 }
   */
  titleBackgroundStyle: BackgroundStyle;
  /**
   * The styles to apply to the title text (stroke, strokeOpacity, strokeWidth,
   * fill, fillOpacity (use null for none)).
   *
   * @default { stroke: null, strokeOpacity: null, strokeWidth: null, fill: null, fillOpacity: null }
   */
  titleTextStyle: TextStyle;
  /**
   * The styles to apply to the title prefix background (stroke, strokeOpacity,
   * strokeWidth, fill, fillOpacity (use null for none)).
   *
   * @default { stroke: null, strokeOpacity: 0, strokeWidth: null, fill: null, fillOpacity: 0 }
   */
  prefixBackgroundStyle: BackgroundStyle;
  /**
   * The styles to apply to the title prefix text (stroke, strokeOpacity,
   * strokeWidth, fill, fillOpacity (use null for none)).
   *
   * @default { stroke: null, strokeOpacity: null, strokeWidth: null, fill: null, fillOpacity: null }
   */
  prefixTextStyle: TextStyle;
  /**
   * The styles to apply to the title suffix background (stroke, strokeOpacity,
   * strokeWidth, fill, fillOpacity (use null for none)).
   *
   * @default { stroke: null, strokeOpacity: 0, strokeWidth: null, fill: null, fillOpacity: 0 }
   */
  suffixBackgroundStyle: BackgroundStyle;
  /**
   * The styles to apply to the title suffix text (stroke, strokeOpacity,
   * strokeWidth, fill, fillOpacity (use null for none)).
   *
   * @default { stroke: null, strokeOpacity: null, strokeWidth: null, fill: null, fillOpacity: null }
   */
  suffixTextStyle: TextStyle;
}

export interface LegendConfig {
  /**
   * Whether the legend should be visible.
   *
   * Default:
   * - `true` — when seriesConfigs.length is > 1
   * - `false` — when seriesConfigs.length is <= 1
   */
  visible: boolean;
  /**
   * The position of the legend relative to the chart (top or bottom).
   *
   * @default "bottom"
   */
  position: Position;
  /**
   * Whether to use text truncation when a legend item width exceeds the width
   * of the chart.
   *
   * @default true
   */
  truncationEnabled: boolean;
  /**
   * The truncation text to append to legend item text when its length exceeds
   * the length of the chart.
   *
   * @default "…"
   */
  truncationValue: string;
  /**
   * Whether the legend should be centered between the axes (true) or the chart
   * bounds (false).
   *
   * @default true
   */
  alignedToAxes: boolean;
  /**
   * The alignment for the legend (left, center, right).
   *
   * @default "center"
   */
  align: Align;
  /**
   * The margin (in pixels) for the top, right, bottom and left sides of the
   * legend.
   *
   * @default { top: 5, right: 0, bottom: 0, left: 0 }
   */
  margin: MarginPadding;
  /**
   * The padding (in pixels) for the top, right, bottom and left sides of the
   * legend.
   *
   * @default { top: 0, right: 0, bottom: 0, left: 0 }
   */
  padding: MarginPadding;
  /**
   * The styles to apply to the legend background (stroke, strokeOpacity,
   * strokeWidth, fill, fillOpacity (use null for none)).
   *
   * @default { stroke: null, strokeOpacity: 0, strokeWidth: null, fill: null, fillOpacity: 0 }
   */
  backgroundStyle: BackgroundStyle;
  /**
   * The margin (in pixels) for the top, right, bottom and left sides of the
   * legend items.
   *
   * @default { top: 1, right: 1, bottom: 1, left: 1 }
   */
  itemMargin: MarginPadding;
  /**
   * The padding (in pixels) for the top, right, bottom and left sides of the
   * legend items.
   *
   * @default { top: 1, right: 1, bottom: 1, left: 1 }
   */
  itemPadding: MarginPadding;
  /**
   * The styles to apply to the legend item backgrounds (stroke, strokeOpacity,
   * strokeWidth, fill, fillOpacity (use null for none)).
   *
   * @default { stroke: null, strokeOpacity: 0, strokeWidth: null, fill: null, fillOpacity: 0 }
   */
  itemBackgroundStyle: BackgroundStyle;
  /**
   * Whether to show series colors next to series titles in the legend.
   *
   * @default true
   */
  showIconColors: boolean;
  /**
   * Whether to show series marker shape next to series titles in the legend.
   *
   * @default true
   */
  showIconShapes: boolean;
  /**
   * Whether to show placeholder icons next to the series titles in the legend.
   *
   * @default true
   */
  showIconPlaceholders: boolean;
  /**
   * The width and height (in pixels) of the series icons.
   *
   * @default 14
   */
  iconSize: number;
  /**
   * The horizontal space (in pixels) to show between series icons and titles.
   *
   * @default 4
   */
  iconSpacerSize: number;
  /**
   * The width (in pixels) of the border drawn around series icons.
   *
   * @default 1
   */
  iconBorderSize: number;
  /**
   * The color of the border drawn around series icons.
   *
   * @default '#999999'
   */
  iconBorderColor: string;
  /**
   * The color to use for the series icon when the corresponding series is
   * suppressed.
   *
   * @default 'rgba(255,255,255,0)'
   */
  iconSuppressedColor: string;
  /**
   * The color to use for the placeholder series icons when the corresponding
   * series is not suppressed.
   *
   * @default 'rgba(0,0,0,0.5)'
   */
  iconUnsuppressedColor: string;
  /**
   * Whether to focus a series when the mouse is moved over the series icon or
   * title.
   *
   * When `true`, hovering a legend item focuses its series: the series gets its
   * focused styling and every other series gets its defocused styling.
   * `onFocus` reports focus changes.
   *
   * @default true
   */
  focusOnMouseOver: boolean;
  /**
   * Whether to focus a series when the series icon or title is clicked.
   *
   * When `true`, clicking a legend item focuses its series (see
   * `focusOnMouseOver`). Combine with `filterOnClick` deliberately — with both
   * enabled a click filters and focuses.
   *
   * @default false
   */
  focusOnClick: boolean;
  /**
   * Whether to suppress a series when the series icon or title is clicked.
   *
   * When `true`, clicking a legend item toggles its series out of (and back
   * into) the chart, playing the staged series transition; the item stays in
   * the legend so it can be restored. `onSeriesFilter` reports every change.
   *
   * @default true
   */
  filterOnClick: boolean;
}

export interface TooltipConfig {
  /**
   * Whether or not to show the tooltip.
   *
   * @default true
   */
  visible: boolean;
  /**
   * Whether to change the focused group as the tooltip is shown or hidden.
   *
   * @default true
   */
  applyFocus: boolean;
  /**
   * Whether the tooltip should be centered at the closest group value (true) or
   * at the click/tap position (false).
   *
   * Default:
   * - `false` — when chartConfig.type is pie
   * - `true` — when chartConfig.type is xy
   */
  snapToGroup: boolean;
  /**
   * Whether the tooltip should be track the mouse position in the chart drawing
   * area.
   *
   * @default false
   */
  mouseOver: boolean;
  /**
   * Whether to hide the tooltip when the user clicks/taps within it.
   *
   * @default true
   */
  closeOnClick: boolean;
  /**
   * Whether series should be filtered when the user clicks/taps on them in the
   * tooltip.
   *
   * @default false
   */
  filterOnSeriesClick: boolean;
  /**
   * Whether group values should be focused when the user clicks/taps on them in
   * the tooltip.
   *
   * @default false
   */
  focusOnGroupClick: boolean;
  /**
   * Whether series should be focused when the user clicks/taps on them in the
   * tooltip.
   *
   * @default false
   */
  focusOnSeriesClick: boolean;
  /**
   * Whether group values should be focused when the user mouses over them in
   * the tooltip.
   *
   * @default false
   */
  focusOnGroupMouseOver: boolean;
  /**
   * Whether series should be focused when the user mouses over them in the
   * tooltip.
   *
   * @default false
   */
  focusOnSeriesMouseOver: boolean;
  /**
   * Whether the focus/filter controls should be shown at the top of the
   * tooltip.
   *
   * @default false
   */
  showControls: boolean;
  /**
   * Whether to keep the tooltip within the series drawing area (true) or allow
   * it to overlap the axes (false).
   *
   * @default false
   */
  keepInside: boolean;
  /**
   * The minimum width (in pixels) for the tooltip.
   *
   * @default 120
   */
  minWidth: number;
  /**
   * The padding (in pixels) to show on each side of the tooltip.
   *
   * @default 2
   */
  padding: number;
  /**
   * The padding (in pixels) betwen each line of the tooltip.
   *
   * @default 3
   */
  linePadding: number;
  /**
   * Whether to right-align the values shown in the tooltip.
   *
   * @default true
   */
  alignValues: boolean;
  /**
   * The background color for the interior of the tooltip.
   *
   * @default 'rgba(255,255,255,0.9)'
   */
  backgroundColor: string;
  /**
   * The color of the border around the tooltip.
   *
   * @default 'rgba(0,0,0,0.3)'
   */
  borderColor: string;
  /**
   * The width (in pixels) of the the border around the tooltip.
   *
   * @default 2
   */
  borderWidth: number;
  /**
   * The radius (in pixels) of the corners of the tooltip.
   *
   * @default 4
   */
  borderRadius: number;
  /**
   * The color of the drop shadow effect used for the tooltip.
   *
   * @default 'rgba(0,0,0,0.3)'
   */
  dropShadowColor: string;
  /**
   * The x offset (in pixels) of the drop shadow effect used for the tooltip.
   *
   * @default 0
   */
  dropShadowOffsetX: number;
  /**
   * The y offset (in pixels) of the drop shadow effect used for the tooltip.
   *
   * @default 5
   */
  dropShadowOffsetY: number;
  /**
   * The blur radius (in pixels) of the drop shadow effect used for the tooltip.
   *
   * @default 10
   */
  dropShadowBlurRadius: number;
  /**
   * Whether to show series colors next to series titles in the tooltip.
   *
   * @default true
   */
  showIconColors: boolean;
  /**
   * Whether to show series marker shape next to series titles in the tooltip.
   *
   * @default true
   */
  showIconShapes: boolean;
  /**
   * Whether to show placeholder icons next to the series titles in the tooltip.
   *
   * @default true
   */
  showIconPlaceholders: boolean;
  /**
   * The width and height (in pixels) of the series icons.
   *
   * @default 14
   */
  iconSize: number;
  /**
   * The horizontal space (in pixels) to show between series icons and titles.
   *
   * @default 4
   */
  iconSpacerSize: number;
  /**
   * The width (in pixels) of the border drawn around series icons.
   *
   * @default 1
   */
  iconBorderSize: number;
  /**
   * The color of the border drawn around series icons.
   *
   * @default '#999999'
   */
  iconBorderColor: string;
  /**
   * The color to use for the series icon when the corresponding series is
   * suppressed.
   *
   * @default 'rgba(255,255,255,0)'
   */
  iconSuppressedColor: string;
  /**
   * The color to use for the placeholder series icons when the corresponding
   * series is not suppressed.
   *
   * @default 'rgba(0,0,0,0.5)'
   */
  iconUnsuppressedColor: string;
  /**
   * Whether to adjust the series values when series suppression changes.
   *
   * @default true
   */
  adjustForSuppression: boolean;
  /**
   * Whether to adjust the width of the tooltip when the series values change
   * due to suppression changes.
   *
   * @default false
   */
  adjustSizeForSuppression: boolean;
  /**
   * Whether to hide series that have been suppressed from the tooltip.
   *
   * @default false
   */
  hideSuppressed: boolean;
  /**
   * Whether to show series that do not have defined values in the tooltip.
   *
   * @default true
   */
  showMissingValues: boolean;
  /**
   * The text to show for series that have been suppressed (use null for none).
   *
   * @default null
   */
  suppressedValueText: string | null;
  /**
   * The character to show in place of each digit of a series value that has
   * been suppressed (use null for none).
   *
   * @default "-"
   */
  suppressedValueCharacter: string;
  /**
   * The text to show for series that do not have defined values.
   *
   * @default "N/A"
   */
  missingValueText: string;
  /**
   * The text to use when joining the values for a series that has more than one
   * value.
   *
   * @default " - "
   */
  rangeValueText: string;
}

/** Shared properties of the group axis and series axes (config/defaults/axisConfig.ts). */
export interface AxisConfigBase {
  /**
   * Whether to show a line along the length of the axis.
   *
   * @default true
   */
  axisLine: boolean;
  /**
   * Whether the axis line should be shown in front (true) or behind (false) the
   * series shapes.
   *
   * @default false
   */
  axisLineFront: boolean;
  /**
   * The stroke width (in pixels) of the line shown along the axis.
   *
   * @default 1
   */
  axisLineWidth: number;
  /**
   * The dash array pattern to use when drawing the line shown along the axis
   * (use null for none).
   *
   * @default null
   */
  axisLineDashArray: string | null;
  /**
   * The margin (in pixels) between the line shown along the axis and the inner
   * boundary of the axis.
   *
   * @default 0
   */
  axisLineMargin: number;
  /**
   * The color of the line shown along the axis.
   *
   * @default '#000000'
   */
  axisLineColor: string;
  /**
   * The color of the line shown along the focused axis.
   *
   * @default '#000000'
   */
  axisLineFocusedColor: string;
  /**
   * The color of the line shown along the defocused axis.
   *
   * @default '#000000'
   */
  axisLineDefocusedColor: string;
  /**
   * The opacity (0 - 1) of the line shown along the axis.
   *
   * @default 1
   */
  axisLineOpacity: number;
  /**
   * The opacity (0 - 1) of the line shown along the focused axis.
   *
   * @default 1
   */
  axisLineFocusedOpacity: number;
  /**
   * The opacity (0 - 1) of the line shown along the defocused axis.
   *
   * @default 0.5
   */
  axisLineDefocusedOpacity: number;

  /**
   * The styles to apply to the axis background (stroke, strokeOpacity,
   * strokeWidth, fill, fillOpacity (use null for none)).
   *
   * @default { stroke: "#000000", strokeOpacity: 0, strokeWidth: null, fill: null, fillOpacity: 0 }
   */
  backgroundStyle: BackgroundStyle;
  /**
   * Whether the axis background should be shown in front (true) or behind
   * (false) the series shapes.
   *
   * @default false
   */
  backgroundFront: boolean;

  /**
   * Whether the axis should be position before (top/left) or after
   * (bottom/right) the chart.
   *
   * Group axis defaults:
   * - `true` — when plotConfig.inverted is true
   * - `false` — when plotConfig.inverted is false
   * Series axis default: `true`.
   */
  before: boolean;

  /**
   * Whether the axis should consume space in the layout (false) or not (true).
   *
   * @default false
   */
  collapsed: boolean;

  /**
   * Whether to show the focus range on the axis when it has a focused series
   * domain or group value.
   *
   * Group axis default: `false`.
   * Series axis default: `true`.
   */
  focusRange: boolean;
  /**
   * Whether the focus range should be shown in front (true) or behind (false)
   * the series shapes.
   *
   * @default false
   */
  focusRangeFront: boolean;
  /**
   * Whether to show the focus range only over tick labels (false) or over both
   * tick labels and title (true).
   *
   * @default false
   */
  focusRangeApplyToTitle: boolean;
  /**
   * The stroke color of the focus range.
   *
   * @default '#000033'
   */
  focusRangeStrokeColor: string;
  /**
   * The fill color of the focus range.
   *
   * @default '#aaccff'
   */
  focusRangeFillColor: string;
  /**
   * The stroke opacity of the focus range.
   *
   * @default 0.2
   */
  focusRangeStrokeOpacity: number;
  /**
   * The fill opacity of the focus range.
   *
   * @default 0.3
   */
  focusRangeFillOpacity: number;
  /**
   * The stroke width of the focus range.
   *
   * @default 1
   */
  focusRangeStrokeWidth: number;
  /**
   * The stroke dash array of the focus range.
   *
   * @default null
   */
  focusRangeDashArray: string | null;

  /**
   * Whether to show lines perpendicular to the axis showing the focused series
   * domain or group value.
   *
   * Group axis default: `true`.
   * Series axis default: `false`.
   */
  focusTickMarks: boolean;
  /**
   * Whether the focus tick marks should be shown in front (true) or behind
   * (false) the series shapes.
   *
   * @default false
   */
  focusTickMarksFront: boolean;
  /**
   * The length (in pixels) of the focus tick mark line(s).
   *
   * @default 9
   */
  focusTickMarkSize: number;
  /**
   * The margin (in pixels) to show between the inside of the axis and the focus
   * tick mark line(s).
   *
   * @default 3
   */
  focusTickMarkMargin: number;
  /**
   * The stroke width (in pixels) of the focus tick mark line(s).
   *
   * @default 3
   */
  focusTickMarkWidth: number;
  /**
   * The color of the focus tick mark line(s).
   *
   * @default '#0000ff'
   */
  focusTickMarkColor: string;
  /**
   * The opacity (0 - 1) of the focus tick mark line(s).
   *
   * @default 1
   */
  focusTickMarkOpacity: number;

  /**
   * Whether to show grid lines perpendicular to each tick on the axis.
   *
   * @default false
   */
  gridLines: boolean;
  /**
   * Whether the axis grid lines should be shown in front (true) or behind
   * (false) the series shapes.
   *
   * @default false
   */
  gridLinesFront: boolean;
  /**
   * The stroke width (in pixels) of the axis grid lines.
   *
   * @default 1
   */
  gridLineWidth: number;
  /**
   * The dash array pattern to use when drawing the axis grid lines (use null
   * for none).
   *
   * @default "5, 5"
   */
  gridLineDashArray: string | null;
  /**
   * The color of the axis grid lines.
   *
   * @default '#e5e5e5'
   */
  gridLineColor: string;
  /**
   * The color of the focused axis grid lines.
   *
   * @default '#e5e5e5'
   */
  gridLineFocusedColor: string;
  /**
   * The color of the defocused axis grid lines.
   *
   * @default '#e5e5e5'
   */
  gridLineDefocusedColor: string;
  /**
   * The opacity (0 - 1) of the axis grid lines.
   *
   * @default 0.75
   */
  gridLineOpacity: number;
  /**
   * The opacity (0 - 1) of the focused axis grid lines.
   *
   * @default 1
   */
  gridLineFocusedOpacity: number;
  /**
   * The opacity (0 - 1) of the defocused axis grid lines.
   *
   * @default 0.5
   */
  gridLineDefocusedOpacity: number;

  /**
   * The inner (closest to chart) margin (in pixels) of the axis.
   *
   * @default 0
   */
  marginInner: number;
  /**
   * The outer (furthest from chart) margin (in pixels) of the axis.
   *
   * @default 1
   */
  marginOuter: number;

  /**
   * The forced maximum numeric value for the axis (use "auto" to compute from
   * the values).
   *
   * With `"auto"` the maximum is computed from the data (including stacking) on
   * every update, and changes animate through the staged axis
   * expansion/contraction phases. Set a number to pin the bound instead.
   *
   * @default "auto"
   */
  max: number | Auto;
  /**
   * The numeric offset to apply to the maximum value of the axis.
   *
   * @default 0
   */
  maxOffset: number;
  /**
   * The maximum number of ticks to show along the length of the axis (use 0 to
   * disable the maximum).
   *
   * Group axis defaults:
   * - `10` — when scale is linear
   * - `0` — when scale is ordinal
   * Series axis default: `10`.
   */
  maxTickCount: number;

  /**
   * The forced minimum numeric value for the axis (use "auto" to compute from
   * the values).
   *
   * With `"auto"` the minimum is computed from the data (including stacking) on
   * every update, and changes animate through the staged axis
   * expansion/contraction phases. Set a number to pin the bound instead.
   *
   * @default "auto"
   */
  min: number | Auto;
  /**
   * The numeric offset to apply to the minimum value of the axis.
   *
   * @default 0
   */
  minOffset: number;

  /**
   * The minimum space (in pixels) to allow between the the bounds of any tick
   * label text.
   *
   * Group axis defaults:
   * - `12` — when scale is linear
   * - `4` — when scale is ordinal
   * Series axis default: `12`.
   */
  minTickSpacing: number;
  /**
   * The minimum value interval to use between any two consecutive tick label
   * values.
   *
   * @default 0
   */
  minTickInterval: number;

  /**
   * The inner (closest to chart) padding (in pixels) of the axis.
   *
   * @default 0
   */
  paddingInner: number;
  /**
   * The outer (furthest from chart) padding (in pixels) of the axis.
   *
   * @default 1
   */
  paddingOuter: number;

  /**
   * The forced minimum numeric value for the axis to be used if no data value
   * is less than this value (use null to disable).
   *
   * A lower bound that only applies while no data value is below it — the axis
   * covers at least this value, but real data smaller than it still expands the
   * domain. Unlike `min`, it never clips data.
   *
   * @default null
   */
  softMin: number | null;
  /**
   * The forced maximum numeric value for the axis to be used if no data value
   * is greater than this value (use null to disable).
   *
   * An upper bound that only applies while no data value is above it — the axis
   * covers at least this value, but real data larger than it still expands the
   * domain. Unlike `max`, it never clips data.
   *
   * @default null
   */
  softMax: number | null;

  /**
   * The number (or date) value to show a threshold line at.
   *
   * @default null
   */
  threshold: number | null;
  /**
   * Whether the threshold line should be shown in front (true) or behind
   * (false) the series shapes.
   *
   * @default true
   */
  thresholdFront: boolean;
  /**
   * The title to show next to the threshold line (use null for none).
   *
   * @default null
   */
  thresholdTitle: string | null;
  /**
   * Whether the threshold title should be positioned on the smaller (true) or
   * larger (false) value side of the threshold line.
   *
   * @default false
   */
  thresholdTitleBefore: boolean;
  /**
   * Whether to ignore titleBefore if the label has no room on that side of the
   * threshold line.
   *
   * @default true
   */
  thresholdTitleSnapToValue: boolean;
  /**
   * The margin (top,right,bottom,left) (in pixels) of the threshold title -
   * relative to its orientation.
   *
   * @default { top: 0, right: 0, bottom: 0, left: 0 }
   */
  thresholdTitleMargin: MarginPadding;
  /**
   * The padding (top,right,bottom,left) (in pixels) of the threshold title -
   * relative to its orientation.
   *
   * @default { top: 0, right: 0, bottom: 0, left: 0 }
   */
  thresholdTitlePadding: MarginPadding;
  /**
   * The stroke color to use for the threshold title text.
   *
   * @default "none"
   */
  thresholdTitleStrokeColor: string;
  /**
   * The stroke color to use for the focused threshold title text.
   *
   * @default "none"
   */
  thresholdTitleFocusedStrokeColor: string;
  /**
   * The stroke color to use for the defocused threshold title text.
   *
   * @default "none"
   */
  thresholdTitleDefocusedStrokeColor: string;
  /**
   * The fill color to use for the threshold title text.
   *
   * @default '#000000'
   */
  thresholdTitleFillColor: string;
  /**
   * The fill color to use for the focused threshold title text.
   *
   * @default '#000000'
   */
  thresholdTitleFocusedFillColor: string;
  /**
   * The fill color to use for the defocused threshold title text.
   *
   * @default '#000000'
   */
  thresholdTitleDefocusedFillColor: string;
  /**
   * The stroke opacity (0 - 1) of the threshold title text.
   *
   * @default 1
   */
  thresholdTitleStrokeOpacity: number;
  /**
   * The stroke opacity (0 - 1) of the focused threshold title text.
   *
   * @default 1
   */
  thresholdTitleFocusedStrokeOpacity: number;
  /**
   * The stroke opacity (0 - 1) of the defocused threshold title text.
   *
   * @default 1
   */
  thresholdTitleDefocusedStrokeOpacity: number;
  /**
   * The fill opacity (0 - 1) of the threshold title text.
   *
   * @default 1
   */
  thresholdTitleFillOpacity: number;
  /**
   * The fill opacity (0 - 1) of the focused threshold title text.
   *
   * @default 1
   */
  thresholdTitleFocusedFillOpacity: number;
  /**
   * The fill opacity (0 - 1) of the defocused threshold title text.
   *
   * @default 1
   */
  thresholdTitleDefocusedFillOpacity: number;
  /**
   * The styles to apply to the threshold title background (stroke,
   * strokeOpacity, strokeWidth, fill, fillOpacity (use null for none)).
   *
   * @default { stroke: "#000000", strokeOpacity: 0, strokeWidth: null, fill: null, fillOpacity: 0 }
   */
  thresholdTitleBackgroundStyle: BackgroundStyle;
  /**
   * The width (in pixels) of the threshold line.
   *
   * @default 1
   */
  thresholdWidth: number;
  /**
   * The dash array pattern to use when drawing the threshold line.
   *
   * @default null
   */
  thresholdDashArray: string | null;
  /**
   * The color of the threshold line.
   *
   * @default '#000000'
   */
  thresholdColor: string;
  /**
   * The color of the focused threshold line.
   *
   * @default '#000000'
   */
  thresholdFocusedColor: string;
  /**
   * The color of the defocused threshold line.
   *
   * @default '#000000'
   */
  thresholdDefocusedColor: string;
  /**
   * The opacity (0 - 1) of the threshold line.
   *
   * @default 1
   */
  thresholdOpacity: number;
  /**
   * The opacity (0 - 1) of the focused threshold line.
   *
   * @default 1
   */
  thresholdFocusedOpacity: number;
  /**
   * The opacity (0 - 1) of the defocused threshold line.
   *
   * @default 0.5
   */
  thresholdDefocusedOpacity: number;

  /**
   * The number of ticks to show along the length of the axis (use "auto" to
   * derive the tick count from the data).
   *
   * @default "auto"
   */
  tickCount: number | Auto;

  /**
   * Whether the axis tick labels should be shown in front (true) or behind
   * (false) the series shapes.
   *
   * @default false
   */
  tickLabelFront: boolean;
  /**
   * The anchor to use for all axis tick labels (start, end, middle) (use "auto"
   * to determine automatically).
   *
   * @default "auto"
   */
  tickLabelAnchor: Anchor | Auto;
  /**
   * The styles to apply to the axis tick label background (stroke,
   * strokeOpacity, strokeWidth, fill, fillOpacity (use null for none)).
   *
   * @default { stroke: "#000000", strokeOpacity: 0, strokeWidth: null, fill: null, fillOpacity: 0 }
   */
  tickLabelBackgroundStyle: BackgroundStyle;
  /**
   * The space (in pixels) perpendicular to the axis direction to allocate for
   * the tick labels (use "auto" to derive from the font size).
   *
   * @default "auto"
   */
  tickLabelSize: number | Auto;
  /**
   * The margin (in pixels) to show between the tick labels and the inside of
   * the axis.
   *
   * @default 2
   */
  tickLabelMarginInner: number;
  /**
   * The margin (in pixels) to show between the tick labels and the outside of
   * the axis.
   *
   * @default 1
   */
  tickLabelMarginOuter: number;
  /**
   * The padding (in pixels) to show between the tick labels and the inside of
   * the axis.
   *
   * @default 5
   */
  tickLabelPaddingInner: number;
  /**
   * The padding (in pixels) to show between the tick labels and the outside of
   * the axis.
   *
   * @default 5
   */
  tickLabelPaddingOuter: number;
  /**
   * The stroke width (in pixels) to use for the axis tick labels text.
   *
   * @default 0
   */
  tickLabelStrokeWidth: number;
  /**
   * The d3 format string to be applied to the group values when displayed in
   * axis tick labels (use null for none, use "auto" to derive from data).
   *
   * @default "auto"
   */
  tickLabelFormat: string | Auto;
  /**
   * The string to prefix to the text of each axis tick label (use null for
   * none).
   *
   * @default null
   */
  tickLabelPrefix: string | null;
  /**
   * The string to append to the text of each axis tick label (use null for
   * none).
   *
   * @default null
   */
  tickLabelSuffix: string | null;
  /**
   * The rotation (in degrees) to apply to each axis tick label.
   *
   * @default 0
   */
  tickLabelRotation: number;
  /**
   * The stroke color to use for the axis tick labels text.
   *
   * @default "none"
   */
  tickLabelStrokeColor: string;
  /**
   * The stroke color to use for the focused axis tick labels text.
   *
   * @default "none"
   */
  tickLabelFocusedStrokeColor: string;
  /**
   * The stroke color to use for the defocused axis tick labels text.
   *
   * @default "none"
   */
  tickLabelDefocusedStrokeColor: string;
  /**
   * The fill color to use for the axis tick labels text.
   *
   * @default '#000000'
   */
  tickLabelFillColor: string;
  /**
   * The fill color to use for the focused axis tick labels text.
   *
   * @default '#000000'
   */
  tickLabelFocusedFillColor: string;
  /**
   * The fill color to use for the defocused axis tick labels text.
   *
   * @default '#000000'
   */
  tickLabelDefocusedFillColor: string;
  /**
   * The stroke opacity (0 - 1) to use for the axis tick labels text.
   *
   * @default 1
   */
  tickLabelStrokeOpacity: number;
  /**
   * The stroke opacity (0 - 1) to use for the focused axis tick labels text.
   *
   * @default 1
   */
  tickLabelFocusedStrokeOpacity: number;
  /**
   * The stroke opacity (0 - 1) to use for the defocused axis tick labels text.
   *
   * @default 0.5
   */
  tickLabelDefocusedStrokeOpacity: number;
  /**
   * The fill opacity (0 - 1) to use for the axis tick labels text.
   *
   * @default 1
   */
  tickLabelFillOpacity: number;
  /**
   * The fill opacity (0 - 1) to use for the focused axis tick labels text.
   *
   * @default 1
   */
  tickLabelFocusedFillOpacity: number;
  /**
   * The fill opacity (0 - 1) to use for the defocused axis tick labels text.
   *
   * @default 0.5
   */
  tickLabelDefocusedFillOpacity: number;

  /**
   * Whether to show lines perpendicular to each tick value along the axis.
   *
   * @default true
   */
  tickMarks: boolean;
  /**
   * Whether the axis tick marks should be shown in front (true) or behind
   * (false) the series shapes.
   *
   * @default false
   */
  tickMarkFront: boolean;
  /**
   * The length (in pixels) of the axis tick mark lines.
   *
   * @default 3
   */
  tickMarkSize: number;
  /**
   * The margin (in pixels) to show between the inside of the axis and the axis
   * tick mark lines.
   *
   * @default 0
   */
  tickMarkMargin: number;
  /**
   * The stroke width (in pixels) of axis the tick mark lines.
   *
   * @default 1
   */
  tickMarkWidth: number;
  /**
   * The color of the axis tick mark lines.
   *
   * @default '#000000'
   */
  tickMarkColor: string;
  /**
   * The color of the focused axis tick mark lines.
   *
   * @default '#000000'
   */
  tickMarkFocusedColor: string;
  /**
   * The color of the defocused axis tick mark lines.
   *
   * @default '#000000'
   */
  tickMarkDefocusedColor: string;
  /**
   * The opacity (0 - 1) of the axis tick mark lines.
   *
   * @default 1
   */
  tickMarkOpacity: number;
  /**
   * The opacity (0 - 1) of the focused axis tick mark lines.
   *
   * @default 1
   */
  tickMarkFocusedOpacity: number;
  /**
   * The opacity (0 - 1) of the defocused axis tick mark lines.
   *
   * @default 0.5
   */
  tickMarkDefocusedOpacity: number;

  /**
   * The title text to be shown along side to the axis (use null for no title).
   *
   * @default null
   */
  title: string | null;
  /**
   * Whether the axis title should be shown in front (true) or behind (false)
   * the series shapes.
   *
   * @default false
   */
  titleFront: boolean;
  /**
   * The styles to apply to the axis title background (stroke, strokeOpacity,
   * strokeWidth, fill, fillOpacity (use null for none)).
   *
   * @default { stroke: "#000000", strokeOpacity: 0, strokeWidth: null, fill: null, fillOpacity: 0 }
   */
  titleBackgroundStyle: BackgroundStyle;
  /**
   * Whether to apply text truncation to the contents of the axis title when it
   * would overflow the axis bounds.
   *
   * @default true
   */
  titleTruncationEnabled: boolean;
  /**
   * The truncation text to append to the axis title when its length exceeds the
   * bounds of the axis.
   *
   * @default "…"
   */
  titleTruncationValue: string;
  /**
   * The space (in pixels) perpendicular to the axis direction to allocate for
   * the axis title (use "auto" to derive from the font size).
   *
   * @default "auto"
   */
  titleSize: number | Auto;
  /**
   * The margin (in pixels) to show between the axis title and the inside of the
   * axis.
   *
   * @default 2
   */
  titleMarginInner: number;
  /**
   * The margin (in pixels) to show between the axis title and the outside of
   * the axis.
   *
   * @default 2
   */
  titleMarginOuter: number;
  /**
   * The padding (in pixels) to show between the axis title and the inside of
   * the axis.
   *
   * @default 3
   */
  titlePaddingInner: number;
  /**
   * The padding (in pixels) to show between the axis title and the outside of
   * the axis.
   *
   * @default 3
   */
  titlePaddingOuter: number;
  /**
   * The stroke width (in pixels) of the axis title text.
   *
   * @default 0
   */
  titleStrokeWidth: number;
  /**
   * The stroke color of the axis title text.
   *
   * @default "none"
   */
  titleStrokeColor: string;
  /**
   * The stroke color of the focused axis title text.
   *
   * @default "none"
   */
  titleFocusedStrokeColor: string;
  /**
   * The stroke color of the defocused axis title text.
   *
   * @default "none"
   */
  titleDefocusedStrokeColor: string;
  /**
   * The fill color of the axis title text.
   *
   * @default '#000000'
   */
  titleFillColor: string;
  /**
   * The fill color of the focused axis title text.
   *
   * @default '#000000'
   */
  titleFocusedFillColor: string;
  /**
   * The fill color of the defocused axis title text.
   *
   * @default '#000000'
   */
  titleDefocusedFillColor: string;
  /**
   * The stroke opacity (0 - 1) of the axis title text.
   *
   * @default 1
   */
  titleStrokeOpacity: number;
  /**
   * The stroke opacity (0 - 1) of the focused axis title text.
   *
   * @default 1
   */
  titleFocusedStrokeOpacity: number;
  /**
   * The stroke opacity (0 - 1) of the defocused axis title text.
   *
   * @default 0.5
   */
  titleDefocusedStrokeOpacity: number;
  /**
   * The fill opacity (0 - 1) of the axis title text.
   *
   * @default 1
   */
  titleFillOpacity: number;
  /**
   * The fill opacity (0 - 1) of the focused axis title text.
   *
   * @default 1
   */
  titleFocusedFillOpacity: number;
  /**
   * The fill opacity (0 - 1) of the defocused axis title text.
   *
   * @default 0.5
   */
  titleDefocusedFillOpacity: number;
  /**
   * Whether the axis should be visible.
   *
   * Group axis defaults:
   * - `false` — when chartConfig.type is pie
   * - `true` — when chartConfig.type is xy
   * Series axis defaults:
   * - `false` — when chartConfig.type is pie
   * - `true` — when chartConfig.type is xy
   */
  visible: boolean;
}

export interface GroupAxisConfig extends AxisConfigBase {
  /**
   * The property to retrieve from the data provider for the group values.
   *
   * The chart reads this property from each entry of the data provider to get
   * the group (category) value. It is required — the only group axis property
   * without a default.
   */
  property?: string;
  /**
   * Whether dates should be treated as UTC (true) or local (false).
   *
   * @default true
   */
  dateUTC: boolean;
  /**
   * The property to retrieve from the data provider for the group display
   * values (use null for none).
   *
   * When set, this property’s value is used wherever the group value is
   * displayed (tick labels, tooltip), while `property` still drives positioning
   * — useful for pre-formatted or friendly labels.
   *
   * @default null
   */
  displayProperty: string | null;
  /**
   * The padding percentages (0 - 1) of the group extent for all group values
   * (outer) and grouped series (inner).
   *
   * @default { inner: 0.1, outer: 0.1 }
   */
  groupPadding: InnerOuter;
  /**
   * The extra count to be added to the group value count when dividing the
   * group extent for displaying group values.
   *
   * @default 1
   */
  groupCountPadding: number;
  /**
   * The minimum group extent (in pixels) for a non-inverted bar this is the
   * minimum width.
   *
   * @default 1
   */
  minGroupValueExtent: number;
  /**
   * The scale to use for the displayed group values (ordinal, linear).
   *
   * `ordinal` places the groups at evenly spaced positions in data order
   * regardless of their values; `linear` positions `number`/`date` group values
   * proportionally along the axis, so uneven spacing in the data shows as
   * uneven spacing in the chart.
   *
   * @default "ordinal"
   */
  scale: Scale;
  /**
   * Whether or not to use text truncation (true) when the axis tick labels
   * would overlap each other instead of skipping ticks (false).
   *
   * Default:
   * - `true` — when type is string
   * - `false` — when type is not string
   */
  tickLabelTruncationEnabled: boolean;
  /**
   * The truncation text to append to the axis tick label text when its content
   * is truncated.
   *
   * @default "…"
   */
  tickLabelTruncationValue: string;
  /**
   * The minimum length at which to apply tick label truncation if the maximum
   * percentage settings is used.
   *
   * @default 0
   */
  tickLabelTruncationMinLength: number;
  /**
   * The maximum percentage (0 - 1) of the chart bounds to allow any tick label
   * text to occupy when they are perpendicular to the axis.
   *
   * @default 0.2
   */
  tickLabelTruncationMaxPercent: number;
  /**
   * The type of the displayed group values (number, date, string).
   *
   * How group values are interpreted: `string` for labels, `number` for numeric
   * values, and `date` for date values (`dateUTC` controls their timezone
   * handling). The type drives parsing, tick label formatting, and which
   * `scale` options make sense.
   *
   * @default "string"
   */
  type: DataType;
  /**
   * The d3 format string to be applied to the group value when displayed in the
   * tooltip (use null for none, use "auto" to derive from data).
   *
   * @default "auto"
   */
  valueFormat: string | Auto;
  /**
   * The label to show before a group value in the tooltip (use null for none).
   *
   * @default null
   */
  valueLabel: string | null;
  /**
   * The text to prefix group values with when showing them in the tooltip (use
   * null for none).
   *
   * @default null
   */
  valuePrefix: string | null;
  /**
   * The text to append group values with when showing them in the tooltip (use
   * null for none).
   *
   * @default null
   */
  valueSuffix: string | null;
}

export interface SeriesAxisTick {
  /** The axis value to place the tick at. */
  value: number;
  /** The tick label text; when omitted the value is formatted with `tickLabelFormat`. */
  label?: string;
}

export interface SeriesAxisConfig extends AxisConfigBase {
  /**
   * The unique identifier for the series axis so it can be referenced by series
   * that belong to it.
   *
   * Referenced by `seriesConfigs.axis` (and `seriesStackConfigs.axis`) to
   * assign series to this axis. With a single axis the ids can be omitted
   * everywhere.
   *
   * Default:
   * - `SA${index}` — series axis index
   */
  id: string;
  /**
   * The unique order number of the series axis controlling its order of
   * appearance.
   *
   * Default:
   * - `${index}` — series axis index
   */
  order: number;
  /**
   * Whether to adjust the domain of the axis as series belonging to it are
   * suppressed.
   *
   * @default false
   */
  adjustForSuppression: boolean;
  /**
   * Whether to adjust the size of the axis tick label bounds as series
   * belonging to it are suppressed.
   *
   * @default false
   */
  adjustTickLabelSizeForSuppression: boolean;
  /**
   * Whether the axis should be visible when all series belonging to it are
   * suppressed.
   *
   * @default true
   */
  alwaysVisible: boolean;
  /**
   * The numeric base value of the axis, used for animation and relative
   * positioning for shapes (use null for none).
   *
   * The value that bars and areas grow from, and the resting position shapes
   * animate from/to when series enter or leave. With mixed positive/negative
   * data the base separates the two directions.
   *
   * Default:
   * - `0` — series axis has stacks
   * - `null` — series axis has no stacks
   */
  base: number | null;
  /**
   * Whether to show a line along the base of the axis.
   *
   * @default true
   */
  baseLine: boolean;
  /**
   * Whether the base line should be shown in front (true) or behind (false) the
   * series shapes.
   *
   * @default false
   */
  baseLineFront: boolean;
  /**
   * The stroke width (in pixels) of the line shown along the base of the axis.
   *
   * @default 1
   */
  baseLineWidth: number;
  /**
   * The dash array pattern to use when drawing the line shown along the base of
   * the axis.
   *
   * @default null
   */
  baseLineDashArray: string | null;
  /**
   * The color to use when drawing the line shown along the base of the axis.
   *
   * @default '#000000'
   */
  baseLineColor: string;
  /**
   * The color to use when drawing the line shown along the base of the focused
   * axis.
   *
   * @default '#000000'
   */
  baseLineFocusedColor: string;
  /**
   * The color to use when drawing the line shown along the base of the
   * defocused axis.
   *
   * @default '#000000'
   */
  baseLineDefocusedColor: string;
  /**
   * The opacity (0 - 1) of the line shown along the base of the axis.
   *
   * @default 1
   */
  baseLineOpacity: number;
  /**
   * The opacity (0 - 1) of the line shown along the base of the focused axis.
   *
   * @default 1
   */
  baseLineFocusedOpacity: number;
  /**
   * The opacity (0 - 1) of the line shown along the base of the defocused axis.
   *
   * @default 0.5
   */
  baseLineDefocusedOpacity: number;
  /**
   * Whether the series axis should be focused whenever the user mouses over a
   * part of it in the chart.
   *
   * @default true
   */
  focusOnMouseOver: boolean;
  /**
   * Whether the series axis should be focused whenever the user clicks/taps a
   * part of it in the chart.
   *
   * @default false
   */
  focusOnClick: boolean;
  /**
   * The percentage margin (0 or greater) relative to the domain of the axis to
   * use at the maximum extent of the axis (only applied if max is "auto" and
   * max value is not equal base).
   *
   * The margin is relative to the pre-margin domain, so values above 1 are
   * allowed and confine the data to a band of the plot: a margin of 4 leaves
   * the data in the bottom fifth — how the candlestick/OHLC volume pane
   * reserves the upper plot for the price axis.
   *
   * @default 0.05
   */
  maxMarginPercent: number;
  /**
   * The percentage margin (0 or greater) relative to the domain of the axis to
   * use at the minimum extent of the axis (only applied if min is "auto" and
   * min value is not equal base).
   *
   * The margin is relative to the pre-margin domain, so values above 1 are
   * allowed and confine the data to a band of the plot: a price axis with
   * margin 1/3 keeps its data in the top three quarters, leaving the bottom for
   * a volume pane.
   *
   * @default 0.05
   */
  minMarginPercent: number;
  /**
   * The scale of the series axis, must be linear.
   *
   * @default "linear"
   */
  scale: Scale;
  /**
   * The explicit ticks to show on the axis in place of the generated ones, each
   * { value, label } placing label text at an axis value (label falls back to
   * the formatted value, use null for none).
   *
   * Replaces the automatic tick generation entirely: tick counts, intervals and
   * domain-edge ticks are ignored. Useful for naming fixed positions, e.g.
   * heatmap row bands or threshold levels. Ticks outside the current axis
   * domain are hidden.
   *
   * @default null
   */
  ticks: SeriesAxisTick[] | null;
  /**
   * The type of the series axis, must be number.
   *
   * @default "number"
   */
  type: DataType;
  /**
   * Whether to show the axis as focused when any series belonging to is
   * focused.
   *
   * @default true
   */
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
  /**
   * The unique identifier for the series.
   *
   * Default:
   * - `S${index}` — series index
   */
  id: string;
  /**
   * The unique order number of the series controlling its order of appearance.
   *
   * Default:
   * - `${index}` — series index
   */
  order: number;
  /**
   * The property to retrieve from the data provider for the series values.
   *
   * The chart reads this property from each group of the data provider to get
   * the series value — it is the only series property without a default, so
   * every series must set it. Use `getDataErrors` to check a dataset against
   * the configured properties.
   */
  property?: string;
  /**
   * The property to retrieve from the data provider for the secondary series
   * values (use null for none).
   *
   * When set, the series shape spans from the `rangeProperty` value to the
   * `property` value instead of starting at the axis base — producing floating
   * bars or a banded (low/high) area.
   *
   * @default null
   */
  rangeProperty: string | null;
  /**
   * The property to retrieve from the data provider for the absolute lower
   * error bound values used to draw error bars (use null for none).
   *
   * The bounds are absolute values in series axis units, not deltas from the
   * series value, and they join the series axis domain so the whiskers never
   * clip. Either bound can be used alone for a one-sided error bar; a group
   * whose bound is undefined just omits that side of the whisker. Error bars
   * draw on `bar`, `line`, `area` and `none` renderer series (centered on each
   * bar — including grouped sub-slot bars — or on each point), but not on
   * stacked series, where absolute bounds have no meaning against the
   * cumulative stack position.
   *
   * @default null
   */
  errorLowProperty: string | null;
  /**
   * The property to retrieve from the data provider for the absolute upper
   * error bound values used to draw error bars (use null for none).
   *
   * See `errorLowProperty` — the same rules apply to the upper bound.
   *
   * @default null
   */
  errorHighProperty: string | null;
  /**
   * The property to retrieve from the data provider for the marker size values
   * (use null for none).
   *
   * @default null
   */
  markerProperty: string | null;
  /**
   * The property to retrieve from the data provider for the series color values
   * (use null for none).
   *
   * @default null
   */
  colorProperty: string | null;
  /**
   * The property to retrieve from the data provider for the series label values
   * (use null for none).
   *
   * @default null
   */
  labelProperty: string | null;
  /**
   * The property to retrieve from the data provider for the values shown for
   * the series in the tooltip in place of the series values (use null for
   * none).
   *
   * @default null
   */
  tooltipProperty: string | null;
  /**
   * The unique identifier of the axis that the series belongs to.
   *
   * Assigns the series to the value axis in `seriesAxisConfigs` whose `id`
   * matches. With a single configured axis this can be omitted — it defaults to
   * that axis id.
   *
   * Default:
   * - `sole axis id` — series axis
   */
  axis?: string;
  /**
   * The unique identifier of the series stack that the series belongs to (use
   * null for none).
   *
   * Series sharing the same stack id (an `id` from `seriesStackConfigs`) are
   * drawn stacked on one another and animate as a single unit, so the stack
   * stays gapless mid-transition. Defaults to the sole stack id when exactly
   * one stack is configured; use `null` to opt a series out.
   *
   * Default:
   * - `sole stack id` — series stack
   */
  stack: string | null;
  /**
   * The unique identifier of the series group that the series belongs to (use
   * null for none).
   *
   * Series sharing the same group id (an `id` from `seriesGroupConfigs`) are
   * laid out side by side within each group slot — grouped/clustered bars.
   * Defaults to the sole group id when exactly one group is configured; use
   * `null` to opt a series out.
   *
   * Default:
   * - `sole group id` — series group
   */
  group: string | null;
  /**
   * The unique id of the gradient config to be used when coloring the series
   * shape (use null for none).
   *
   * Default:
   * - `sole gradient id` — series gradient
   */
  gradient: string | null;
  /**
   * Whether to ignore this series and treat it as though it were not specified.
   *
   * @default false
   */
  ignore: boolean;
  /**
   * The shape renderer to use when drawing the series shape (line, area, bar,
   * none).
   *
   * `bar` draws a rectangle per group value, `line` connects the values with a
   * path, `area` fills between the value line and the series axis base, and
   * `none` draws no shape. Different series in the same chart can use different
   * renderers, e.g. bars with a line overlay.
   *
   * @default "line"
   */
  renderer: RendererType;
  /**
   * Whether to skip undefined values when drawing the shape for this series.
   *
   * When `true`, groups whose value is missing (`undefined`) are left out of
   * the shape, so lines and areas connect directly between the neighbouring
   * defined values; when `false` the shape breaks at the gap. For a series with
   * a `rangeProperty`, a group counts as missing only when both properties are
   * undefined — see `skipPartialRange`.
   *
   * @default false
   */
  skipMissing: boolean;
  /**
   * Whether to treat a value as missing when either of property or
   * rangeProperty is undefined, instead of collapsing to the defined one.
   *
   * Only affects series with a `rangeProperty` (stacked series are unaffected).
   * By default a group with just one of `property`/`rangeProperty` undefined
   * keeps a zero-extent span collapsed at the defined value, so ranged areas
   * stay connected through it. When `true` such groups count as missing
   * instead, following the configured missing-value treatment: a break in the
   * shape, or skipped over when `skipMissing` is set, or drawn at the base when
   * `showMissingAtBase` is set.
   *
   * @default false
   */
  skipPartialRange: boolean;
  /**
   * Whether to use the series axis base value for missing values when drawing
   * the shape for this series.
   *
   * An alternative missing-value treatment: instead of leaving a gap, missing
   * values are drawn at the series axis base value.
   *
   * @default false
   */
  showMissingAtBase: boolean;
  /**
   * Whether to animate leading/trailing series position values from their
   * adjacent values (true) or from the base value (false).
   *
   * Default:
   * - `false` — when renderer is bar
   * - `true` — when renderer is line
   * - `true` — when renderer is area
   * - `false` — when renderer is none
   */
  animateBaseFromAdjacent: boolean;
  /**
   * The d3 curve type and param to use when drawing the series shape.
   *
   * Only affects the `line` and `area` renderers. `type` selects the d3-shape
   * curve (`linear`, `monotoneX`, `natural`, `step`, `cardinal`, `catmullRom`,
   * …) and `param` is passed to the curve’s tension/alpha configurator for the
   * curve types that take one.
   *
   * @default { type: "linear" }
   */
  curve: SeriesCurve;
  /**
   * The fraction (0 - 1) of the bar layout slot width to use when drawing bars
   * in the series.
   *
   * Only affects the `bar` renderer. Narrows each bar within its layout slot
   * (the full group slot, or the series’ sub-slot when grouped), so a narrow
   * bar can overlay a full-width one from another series — e.g. a candlestick
   * wick behind its body, or a bullet-chart measure over its backing range. The
   * narrowed bar is centered by default; `barAlignPercent` moves it within the
   * slot.
   *
   * @default 1
   */
  barWidthPercent: number;
  /**
   * The fraction (0 - 1) of the slot width freed by barWidthPercent placed
   * before each bar in the series (0 aligns with the slot start, 0.5 centers, 1
   * aligns with the slot end).
   *
   * Only affects the `bar` renderer, and only when `barWidthPercent` is less
   * than 1. Lets narrowed bars from different series share one slot side by
   * side — e.g. the left open tick and right close tick of an OHLC bar.
   *
   * @default 0.5
   */
  barAlignPercent: number;
  /**
   * The minimum extent (in pixels) of each bar in the series along the value
   * direction.
   *
   * Only affects the `bar` renderer. A bar whose two ends resolve to (nearly)
   * the same position — e.g. a ranged bar whose `property` and `rangeProperty`
   * values are equal — is expanded to this extent, centered on its position, so
   * it stays visible as a tick mark: e.g. the open/close ticks of an OHLC bar,
   * or a candlestick doji body.
   *
   * @default 0
   */
  barMinExtent: number;
  /**
   * The size of the cap (in pixels) to use when drawing caps on a bar series.
   *
   * @default 5
   */
  capSize: number;
  /**
   * The type (point, curve, round, use null for none) of cap to use when
   * drawing caps on a bar series.
   *
   * Draws a decorative cap on the value end of each bar in the series;
   * `capSize` controls its extent. To cap only the outside of a stacked bar,
   * see `capOnlyStackOuter` and `seriesStackConfigs.outerCapType`.
   *
   * @default null
   */
  capType: CapType | null;
  /**
   * Whether to expand the base of caps on a bar series when the size of the cap
   * is greater than the extent of the bar.
   *
   * @default true
   */
  capExpand: boolean;
  /**
   * Whether to only show the cap on bars in the series when they are an outer
   * series of a stack.
   *
   * @default false
   */
  capOnlyStackOuter: boolean;
  /**
   * The full width (in pixels) of the horizontal caps drawn at the ends of the
   * series error bars (use 0 to hide the caps).
   *
   * The caps are the horizontal ticks at the whisker ends. On a `bar` renderer
   * series the cap width is clamped to the bar layout slot so caps never
   * overlap a neighbouring bar; use `0` to draw plain whiskers without caps.
   *
   * @default 6
   */
  errorBarCapSize: number;
  /**
   * The stroke width (in pixels) of the series error bars.
   *
   * @default 1.5
   */
  errorBarStrokeWidth: number;
  /**
   * The stroke color to use for the series error bars (use "series" to reuse
   * the strokeColor, use "seriesIndex" to apply the colorPaletteConfig series
   * strokeColor for the series index, use "groupIndex" to apply the
   * colorPaletteConfig series strokeColor for the group index).
   *
   * @default "series"
   */
  errorBarStrokeColor: SeriesColor;
  /**
   * The stroke opacity (0 - 1) of the series error bars.
   *
   * @default 0.9
   */
  errorBarStrokeOpacity: number;
  /**
   * The focused stroke opacity (0 - 1) of the series error bars.
   *
   * @default 1
   */
  errorBarFocusedStrokeOpacity: number;
  /**
   * The defocused stroke opacity (0 - 1) of the series error bars.
   *
   * @default 0.5
   */
  errorBarDefocusedStrokeOpacity: number;
  /**
   * The label to show before a series value in the tooltip (use null for none).
   *
   * @default null
   */
  valueLabel: string | null;
  /**
   * The d3 format string to be applied to the series value when displayed in
   * the tooltip (use null for none, use "auto" to derive from data ("auto" will
   * use the series axis tick label format if it is set)).
   *
   * A d3-format specifier applied to the value shown in the tooltip, e.g.
   * `".1f"` or `",.0f"`. `"auto"` derives a format from the data, preferring
   * the series axis `tickLabelFormat` when that is set.
   *
   * @default "auto"
   */
  valueFormat: string | Auto;
  /**
   * The text to prefix series values with when showing them in the tooltip (use
   * null for none).
   *
   * @default null
   */
  valuePrefix: string | null;
  /**
   * The text to append series values with when showing them in the tooltip (use
   * null for none).
   *
   * @default null
   */
  valueSuffix: string | null;
  /**
   * Whether to use the title value for the valueLabel value when the valueLabel
   * is not set.
   *
   * @default true
   */
  useTitleForValueLabel: boolean;
  /**
   * The title to display for the series in the legend (use null for none).
   *
   * @default null
   */
  title: string | null;
  /**
   * The d3 format string to be applied to the series label values (use null for
   * none, use "auto" to derive from data).
   *
   * @default "auto"
   */
  labelFormat: string | Auto;
  /**
   * The stroke color to use for the series label values (use "series" to reuse
   * the strokeColor, use "seriesIndex" to apply the colorPaletteConfig label
   * strokeColor for the series index, use "groupIndex" to apply the
   * colorPaletteConfig label strokeColor for the group index).
   *
   * @default '#000000'
   */
  labelStrokeColor: SeriesColor;
  /**
   * The focused stroke color to use for the series label values (use "series"
   * to reuse the focusedStrokeColor, use "same" to reuse the labelStrokeColor,
   * use "seriesIndex" to apply the colorPaletteConfig labelFocused strokeColor
   * for the series index, use "groupIndex" to apply the colorPaletteConfig
   * labelFocused strokeColor for the group index).
   *
   * @default "same"
   */
  labelFocusedStrokeColor: SeriesColor;
  /**
   * The defocused stroke color to use for the series label values (use "series"
   * to reuse the defocusedStrokeColor, use "same" to reuse the
   * labelStrokeColor, use "seriesIndex" to apply the colorPaletteConfig
   * labelDefocused strokeColor for the series index, use "groupIndex" to apply
   * the colorPaletteConfig labelDefocused strokeColor for the group index).
   *
   * @default "same"
   */
  labelDefocusedStrokeColor: SeriesColor;
  /**
   * The fill color to use for the series label values (use "series" to reuse
   * the fillColor, use "seriesIndex" to apply the colorPaletteConfig label
   * fillColor for the series index, use "groupIndex" to apply the
   * colorPaletteConfig label fillColor for the group index).
   *
   * @default '#000000'
   */
  labelFillColor: SeriesColor;
  /**
   * The focused fill color to use for the series label values (use "series" to
   * reuse the focusedFillColor, use "same" to reuse the labelFillColor, use
   * "seriesIndex" to apply the colorPaletteConfig labelFocused fillColor for
   * the series index, use "groupIndex" to apply the colorPaletteConfig
   * labelFocused fillColor for the group index).
   *
   * @default "same"
   */
  labelFocusedFillColor: SeriesColor;
  /**
   * The defocused fill color to use for the series label values (use "series"
   * to reuse the defocusedFillColor, use "same" to reuse the labelFillColor,
   * use "seriesIndex" to apply the colorPaletteConfig labelDefocused fillColor
   * for the series index, use "groupIndex" to apply the colorPaletteConfig
   * labelDefocused fillColor for the group index).
   *
   * @default "same"
   */
  labelDefocusedFillColor: SeriesColor;
  /**
   * The minimum position percentage (0 - 1) from the domain minimum for which
   * series labels should be shown (use null for none).
   *
   * @default null
   */
  labelMinPositionPercent: number | null;
  /**
   * The maximum position percentage (0 - 1) from the domain maximum for which
   * series labels should be shown (use null for none).
   *
   * @default null
   */
  labelMaxPositionPercent: number | null;
  /**
   * The minimum position percentage (0 - 1) between two series values for which
   * series labels should be shown (use null for none).
   *
   * @default null
   */
  labelMinRangePercent: number | null;
  /**
   * The series position offset (in pixels) to apply to all series label
   * positions.
   *
   * @default 0
   */
  labelOffset: number;
  /**
   * Whether to position the series labels inside or outside of the series
   * shape.
   *
   * @default "center"
   */
  labelPosition: LabelPosition;
  /**
   * The minimum position percentage (0 - 1) above the base value for which
   * series labels should be shown (use null for none).
   *
   * @default "auto"
   */
  labelAboveBaseMinPositionPercent: number | Auto;
  /**
   * The maximum position percentage (0 - 1) from the domain maximum for which
   * series labels should be shown (use null for none).
   *
   * @default "auto"
   */
  labelAboveBaseMaxPositionPercent: number | Auto;
  /**
   * The minimum position percentage (0 - 1) from the domain minimum for which
   * series labels should be shown (use null for none).
   *
   * @default "auto"
   */
  labelBelowBaseMinPositionPercent: number | Auto;
  /**
   * The maximum position percentage (0 - 1) below the base value for which
   * series labels should be shown (use null for none).
   *
   * @default "auto"
   */
  labelBelowBaseMaxPositionPercent: number | Auto;
  /**
   * The series position offset (in pixels) to apply to all series label
   * positions that are above the base value (use "auto" to derive from the
   * labelOffset).
   *
   * @default "auto"
   */
  labelAboveBaseOffset: number | Auto;
  /**
   * The series position offset (in pixels) to apply to all series label
   * positions that are below the base value (use "auto" to derive from the
   * labelOffset).
   *
   * @default "auto"
   */
  labelBelowBaseOffset: number | Auto;
  /**
   * Whether to position the series labels inside or outside of the series shape
   * for series shapes that are above the base value.
   *
   * @default "auto"
   */
  labelAboveBasePosition: LabelPosition | Auto;
  /**
   * Whether to position the series labels inside or outside of the series shape
   * for series shapes that are below the base value.
   *
   * @default "auto"
   */
  labelBelowBasePosition: LabelPosition | Auto;
  /**
   * The stroke width (in pixels) for the series label text.
   *
   * @default 1
   */
  labelStrokeWidth: number;
  /**
   * The focused stroke width (in pixels) for the series label text.
   *
   * @default 1
   */
  labelFocusedStrokeWidth: number;
  /**
   * The defocused stroke width (in pixels) for the series label text.
   *
   * @default 1
   */
  labelDefocusedStrokeWidth: number;
  /**
   * The stroke opacity (0 - 1) for the series label text.
   *
   * @default 0.8
   */
  labelStrokeOpacity: number;
  /**
   * The fill opacity (0 - 1) for the series label text.
   *
   * @default 0.8
   */
  labelFillOpacity: number;
  /**
   * The focused stroke opacity (0 - 1) for the series label text.
   *
   * @default 1
   */
  labelFocusedStrokeOpacity: number;
  /**
   * The focused fill opacity (0 - 1) for the series label text.
   *
   * @default 1
   */
  labelFocusedFillOpacity: number;
  /**
   * The defocused stroke opacity (0 - 1) for the series label text.
   *
   * @default 1
   */
  labelDefocusedStrokeOpacity: number;
  /**
   * The defocused fill opacity (0 - 1) for the series label text.
   *
   * @default 1
   */
  labelDefocusedFillOpacity: number;
  /**
   * The stroke color to use for the series shape (use "seriesIndex" to apply
   * the colorPaletteConfig series strokeColor for the series index, use
   * "groupIndex" to apply the colorPaletteConfig series strokeColor for the
   * group index).
   *
   * @default "seriesIndex"
   */
  strokeColor: SeriesColor;
  /**
   * The focused stroke color to use for the series shape (use "same" to reuse
   * the strokeColor, use "seriesIndex" to apply the colorPaletteConfig
   * seriesFocused strokeColor for the series index, use "groupIndex" to apply
   * the colorPaletteConfig seriesFocused strokeColor for the group index).
   *
   * @default "same"
   */
  focusedStrokeColor: SeriesColor;
  /**
   * The defocused stroke color to use for the series shape (use "same" to reuse
   * the strokeColor, use "seriesIndex" to apply the colorPaletteConfig
   * seriesDefocused strokeColor for the series index, use "groupIndex" to apply
   * the colorPaletteConfig seriesDefocused strokeColor for the group index).
   *
   * @default "same"
   */
  defocusedStrokeColor: SeriesColor;
  /**
   * The fill color to use for the series shape (use "seriesIndex" to apply the
   * colorPaletteConfig series fillColor for the series index, use "groupIndex"
   * to apply the colorPaletteConfig series fillColor for the group index).
   *
   * @default "seriesIndex"
   */
  fillColor: SeriesColor;
  /**
   * The focused fill color to use for the series shape (use "same" to reuse the
   * fillColor, use "seriesIndex" to apply the colorPaletteConfig seriesFocused
   * fillColor for the series index, use "groupIndex" to apply the
   * colorPaletteConfig seriesFocused fillColor for the group index).
   *
   * @default "same"
   */
  focusedFillColor: SeriesColor;
  /**
   * The defocused fill color to use for the series shape (use "same" to reuse
   * the fillColor, use "seriesIndex" to apply the colorPaletteConfig
   * seriesDefocused fillColor for the series index, use "groupIndex" to apply
   * the colorPaletteConfig seriesDefocused fillColor for the group index).
   *
   * @default "same"
   */
  defocusedFillColor: SeriesColor;
  /**
   * The stroke opacity (0 - 1) of the series shape.
   *
   * Default:
   * - `0.8` — when renderer is bar
   * - `0.9` — when renderer is line
   * - `0.8` — when renderer is area
   * - `0.9` — when renderer is none
   */
  strokeOpacity: number;
  /**
   * The fill opacity (0 - 1) of the series shape.
   *
   * Default:
   * - `0.8` — when renderer is bar
   * - `0.9` — when renderer is line
   * - `0.8` — when renderer is area
   * - `0.9` — when renderer is none
   */
  fillOpacity: number;
  /**
   * The focused stroke opacity (0 - 1) of the series shape.
   *
   * Default:
   * - `1` — when renderer is bar
   * - `1` — when renderer is line
   * - `1` — when renderer is area
   * - `1` — when renderer is none
   */
  focusedStrokeOpacity: number;
  /**
   * The focused fill opacity (0 - 1) of the series shape.
   *
   * Default:
   * - `1` — when renderer is bar
   * - `1` — when renderer is line
   * - `1` — when renderer is area
   * - `1` — when renderer is none
   */
  focusedFillOpacity: number;
  /**
   * The defocused stroke opacity (0 - 1) of the series shape.
   *
   * Default:
   * - `0.5` — when renderer is bar
   * - `0.8` — when renderer is line
   * - `0.5` — when renderer is area
   * - `0.8` — when renderer is none
   */
  defocusedStrokeOpacity: number;
  /**
   * The defocused fill opacity (0 - 1) of the series shape.
   *
   * Default:
   * - `0.5` — when renderer is bar
   * - `0.8` — when renderer is line
   * - `0.5` — when renderer is area
   * - `0.8` — when renderer is none
   */
  defocusedFillOpacity: number;
  /**
   * The stroke width (in pixels) of the series shape.
   *
   * Default:
   * - `0` — when renderer is bar
   * - `3` — when renderer is line
   * - `0` — when renderer is area
   * - `0` — when renderer is none
   */
  strokeWidth: number;
  /**
   * The focused stroke width (in pixels) of the series shape.
   *
   * Default:
   * - `1` — when renderer is bar
   * - `4` — when renderer is line
   * - `1` — when renderer is area
   * - `0` — when renderer is none
   */
  focusedStrokeWidth: number;
  /**
   * The defocused stroke width (in pixels) of the series shape.
   *
   * Default:
   * - `0` — when renderer is bar
   * - `2` — when renderer is line
   * - `0` — when renderer is area
   * - `0` — when renderer is none
   */
  defocusedStrokeWidth: number;
  /**
   * The type of d3 color interpolation to apply when using a color property
   * (rgb, hsl, lab, hcl) (use null for none).
   *
   * Default:
   * - `null` — when colorProperty is null
   * - `"hcl"` — when colorProperty is not null
   */
  colorInterpolation: ColorInterpolation | null;
  /**
   * The minimum color to use when interpolating the series shape color with a
   * colorProperty (use null for none).
   *
   * Default:
   * - `null` — when colorProperty is null
   * - `'#8f8fff'` — when colorProperty is not null and colorBase is null
   * - `null` — when colorProperty is not null and colorBase is not null
   */
  colorMin: string | null;
  /**
   * The maximum color to use when interpolating the series shape color with a
   * colorProperty (use null for none).
   *
   * Default:
   * - `null` — when colorProperty is null
   * - `'#0000ff'` — when colorProperty is not null and colorBase is null
   * - `null` — when colorProperty is not null and colorBase is not null
   */
  colorMax: string | null;
  /**
   * The minimum color to use when interpolating the series shape color with a
   * colorProperty value that is above the colorBase (use null for none).
   *
   * Default:
   * - `null` — when colorProperty is null
   * - `null` — when colorProperty is not null and colorBase is null
   * - `'#8f8fff'` — when colorProperty is not null and colorBase is not null
   */
  colorBaseAboveMin: string | null;
  /**
   * The maximum color to use when interpolating the series shape color with a
   * colorProperty value that is above the colorBase (use null for none).
   *
   * Default:
   * - `null` — when colorProperty is null
   * - `null` — when colorProperty is not null and colorBase is null
   * - `'#0000ff'` — when colorProperty is not null and colorBase is not null
   */
  colorBaseAboveMax: string | null;
  /**
   * The base value to use for color interpolation, allowing 2 distinct sets of
   * min & max colors for interpolation (use null for none).
   *
   * @default null
   */
  colorBase: number | null;
  /**
   * The minimum color to use when interpolating the series shape color with a
   * colorProperty value that is below the colorBase (use null for none).
   *
   * Default:
   * - `null` — when colorProperty is null
   * - `null` — when colorProperty is not null and colorBase is null
   * - `'#ff8f8f'` — when colorProperty is not null and colorBase is not null
   */
  colorBaseBelowMin: string | null;
  /**
   * The maximum color to use when interpolating the series shape color with a
   * colorProperty value that is below the colorBase (use null for none).
   *
   * Default:
   * - `null` — when colorProperty is null
   * - `null` — when colorProperty is not null and colorBase is null
   * - `'#ff0000'` — when colorProperty is not null and colorBase is not null
   */
  colorBaseBelowMax: string | null;
  /**
   * The minimum marker size (in pixels) to use when interpolating the marker
   * size based on a marker property value.
   *
   * @default 1
   */
  minMarkerSize: number;
  /**
   * Whether to show the marker when the value is missing (can be used in
   * conjunction with showMissingAtBase).
   *
   * @default false
   */
  markerShowMissing: boolean;
  /**
   * The maximum marker size (in pixels) to use when interpolating the marker
   * size based on a marker property value, or the marker size when no marker
   * property is used.
   *
   * @default 6
   */
  markerSize: number;
  /**
   * The shape to use when drawing the series marker (circle, cross, diamond,
   * square, star, triangle, wye) (use null for none).
   *
   * Default:
   * - `null` — when renderer is bar
   * - `"circle"` — when renderer is line
   * - `"circle"` — when renderer is area
   * - `"circle"` — when renderer is none
   */
  markerShape: MarkerShape | null;
  /**
   * The stroke color to use for the series marker (use "series" to reuse the
   * strokeColor, use "seriesIndex" to apply the colorPaletteConfig marker
   * strokeColor for the series index, use "groupIndex" to apply the
   * colorPaletteConfig marker strokeColor for the group index).
   *
   * @default "series"
   */
  markerStrokeColor: SeriesColor;
  /**
   * The focused stroke color to use for the series marker (use "series" to
   * reuse the focusedStrokeColor, use "same" to reuse the markerStrokeColor,
   * use "seriesIndex" to apply the colorPaletteConfig markerFocused strokeColor
   * for the series index, use "groupIndex" to apply the colorPaletteConfig
   * markerFocused strokeColor for the group index).
   *
   * @default "same"
   */
  markerFocusedStrokeColor: SeriesColor;
  /**
   * The defocused stroke color to use for the series marker (use "series" to
   * reuse the defocusedStrokeColor, use "same" to reuse the markerStrokeColor,
   * use "seriesIndex" to apply the colorPaletteConfig markerDefocused
   * strokeColor for the series index, use "groupIndex" to apply the
   * colorPaletteConfig markerDefocused strokeColor for the group index).
   *
   * @default "same"
   */
  markerDefocusedStrokeColor: SeriesColor;
  /**
   * The fill color to use for the series marker (use "series" to reuse the
   * fillColor, use "seriesIndex" to apply the colorPaletteConfig marker
   * fillColor for the series index, use "groupIndex" to apply the
   * colorPaletteConfig marker fillColor for the group index).
   *
   * @default "series"
   */
  markerFillColor: SeriesColor;
  /**
   * The focused fill color to use for the series marker (use "series" to reuse
   * the focusedFillColor, use "same" to reuse the markerFillColor, use
   * "seriesIndex" to apply the colorPaletteConfig markerFocused fillColor for
   * the series index, use "groupIndex" to apply the colorPaletteConfig
   * markerFocused fillColor for the group index).
   *
   * @default "same"
   */
  markerFocusedFillColor: SeriesColor;
  /**
   * The defocused fill color to use for the series marker (use "series" to
   * reuse the defocusedFillColor, use "same" to reuse the markerFillColor, use
   * "seriesIndex" to apply the colorPaletteConfig markerDefocused fillColor for
   * the series index, use "groupIndex" to apply the colorPaletteConfig
   * markerDefocused fillColor for the group index).
   *
   * @default "same"
   */
  markerDefocusedFillColor: SeriesColor;
  /**
   * The stroke width (in pixels) for the series marker shape.
   *
   * @default 1
   */
  markerStrokeWidth: number;
  /**
   * The focused stroke width (in pixels) for the series marker shape.
   *
   * @default 3
   */
  markerFocusedStrokeWidth: number;
  /**
   * The defocused stroke width (in pixels) for the series marker shape.
   *
   * @default 1
   */
  markerDefocusedStrokeWidth: number;
  /**
   * The stroke opacity (0 -1) for the series marker shape.
   *
   * @default 0.9
   */
  markerStrokeOpacity: number;
  /**
   * The fill opacity (0 -1) for the series marker shape.
   *
   * @default 0.9
   */
  markerFillOpacity: number;
  /**
   * The focused stroke opacity (0 -1) for the series marker shape.
   *
   * @default 1
   */
  markerFocusedStrokeOpacity: number;
  /**
   * The focused fill opacity (0 -1) for the series marker shape.
   *
   * @default 1
   */
  markerFocusedFillOpacity: number;
  /**
   * The defocused stroke opacity (0 -1) for the series marker shape.
   *
   * @default 0.8
   */
  markerDefocusedStrokeOpacity: number;
  /**
   * The defocused fill opacity (0 -1) for the series marker shape.
   *
   * @default 0.8
   */
  markerDefocusedFillOpacity: number;
  /**
   * Whether to show the series in the legend.
   *
   * @default true
   */
  showInLegend: boolean;
  /**
   * Whether to show the series in the tooltip.
   *
   * @default true
   */
  showInTooltip: boolean;
  /**
   * Whether to show the series color as an icon next to the series title in the
   * legend.
   *
   * Default:
   * - `false` — when color is groupIndex
   * - `true` — when color is not groupIndex
   */
  showColorInLegend: boolean;
  /**
   * Whether to show the series color as an icon next to the series title in the
   * tooltip.
   *
   * Default:
   * - `false` — when color is groupIndex
   * - `true` — when color is not groupIndex
   */
  showColorInTooltip: boolean;
  /**
   * Whether or not the series can be suppressed from being shown in the chart.
   *
   * @default true
   */
  suppressible: boolean;
  /**
   * The unique identifier of another series whose legend filtering and focus
   * this series follows (use null for none).
   *
   * When the referenced series is toggled out of (or back into) the chart via
   * the legend, this series follows it, and it shares the referenced series’
   * focus state both ways: focusing the leader highlights this series too, and
   * focus interactions on this series target the leader. For companion series
   * hidden from the legend (`showInLegend: false`) that visually belong to a
   * legend series — e.g. a candlestick wick following its body — so filtering
   * or focusing treats the whole mark as one.
   *
   * @default null
   */
  followSeries: string | null;
  /**
   * Whether the series should be focused whenever the user mouses over a part
   * of it in the chart.
   *
   * @default false
   */
  focusOnMouseOver: boolean;
  /**
   * Whether the series should be focused whenever the user clicks/taps a part
   * of it in the chart.
   *
   * @default false
   */
  focusOnClick: boolean;
  /**
   * Whether the group should be focused whenever the user mouses over a group
   * of the series in the chart.
   *
   * @default false
   */
  focusGroupOnMouseOver: boolean;
  /**
   * Whether the group should be focused whenever the user clicks/taps a group
   * of the series in the chart.
   *
   * @default false
   */
  focusGroupOnClick: boolean;
  /**
   * Whether to show the series as focused when the series axis it belongs to is
   * focused.
   *
   * @default true
   */
  useAxisFocus: boolean;
  /** Back-references assigned by buildMochartConfig. */
  seriesAxisConfig: SeriesAxisConfig;
  seriesStackConfig?: SeriesStackConfig;
  seriesGroupConfig?: SeriesGroupConfig;
  linearGradientConfig?: LinearGradientConfig;
  radialGradientConfig?: RadialGradientConfig;
}

export interface SeriesStackConfig {
  /**
   * The unique identifier for the series stack so it can be referenced by
   * series that belong to it.
   *
   * Referenced by `seriesConfigs.stack` to place series in this stack. Stacked
   * series draw on top of one another and animate as a single gapless unit —
   * each segment’s baseline follows the tweened top of the segment below it
   * throughout a transition.
   *
   * Default:
   * - `SS${index}` — series stack index
   */
  id: string;
  order?: number;
  /**
   * The unique identifier of the series axis that the series stack belongs to.
   *
   * Default:
   * - `first axis id` — series axis
   */
  axis?: string;
  /**
   * The size of the cap (in pixels) for series that are an outer series of the
   * stack.
   *
   * @default 5
   */
  outerCapSize: number;
  /**
   * The type (point, curve, round, use null for none) of cap for series that
   * are an outer series of the stack.
   *
   * Caps only the outer end of the whole stack rather than every segment; pairs
   * with `seriesConfigs.capOnlyStackOuter`.
   *
   * @default null
   */
  outerCapType: CapType | null;
  /**
   * Whether to expand the base of caps for series that are an outer series of
   * the stack when the size of the cap is greater than the extent of the bar.
   *
   * @default true
   */
  outerCapExpand: boolean;
  /** Back-references assigned by buildMochartConfig. */
  seriesAxisConfig?: SeriesAxisConfig;
  seriesConfigs?: SeriesConfig[];
  seriesConfigIndicesById?: Record<string, number>;
}

export interface SeriesGroupConfig {
  /**
   * The unique identifier for the series group so it can be referenced by
   * series that belong to it.
   *
   * Default:
   * - `SG${index}` — series group index
   */
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
  /**
   * The unique identifier for the gradient so that it can be referenced for
   * use.
   *
   * Default:
   * - `LG${index}` — linear gradient index
   */
  id: string;
  /**
   * The x1 property of the svg linear gradient.
   *
   * @default 0
   */
  x1: number;
  /**
   * The x2 property of the svg linear gradient.
   *
   * @default 1
   */
  x2: number;
  /**
   * The x3 property of the svg linear gradient.
   *
   * @default 0
   */
  y1: number;
  /**
   * The x4 property of the svg linear gradient.
   *
   * @default 1
   */
  y2: number;
  /**
   * The rotation property (in degrees) of the svg linear gradient.
   *
   * @default 0
   */
  rotation: number;
  /** The list of svg gradient stops, with offet, color and opacity properties. */
  stops?: GradientStop[];
}

export interface RadialGradientConfig {
  /**
   * The unique identifier for the gradient so that it can be referenced for
   * use.
   *
   * Default:
   * - `RG${index}` — radial gradient index
   */
  id: string;
  /**
   * The cx property of the svg radial gradient.
   *
   * @default 0.5
   */
  cx: number;
  /**
   * The cy property of the svg radial gradient.
   *
   * @default 0.5
   */
  cy: number;
  /**
   * The fx property of the svg radial gradient.
   *
   * @default 0.5
   */
  fx: number;
  /**
   * The fy property of the svg radial gradient.
   *
   * @default 0.5
   */
  fy: number;
  /**
   * The r property of the svg radial gradient.
   *
   * @default 0.5
   */
  r: number;
  /**
   * The rotation property (in degrees) of the svg radial gradient.
   *
   * @default 0
   */
  rotation: number;
  /** The list of svg gradient stops, with offet, color and opacity properties. */
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
  pieConfig: PieConfig;
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
  pieConfig?: Partial<PieConfig>;
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
