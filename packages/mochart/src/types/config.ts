import type {
  Auto, Align, AxisSide, MissingValues, VerticalAlign, Anchor, Position, Scale, DataType, RendererType, ThresholdTitleSide,
  CurveType, CapType, LabelPosition, ColorMode, ColorInterpolation, MarkerShape, MarkerSizeScale,
  ChartType, PieLabelType, PieTooltipLabelType
} from '../config/core/constants';
import type { MarginPadding, InnerOuter } from './geometry';

/**
 * A CSS color string, or one of the palette color modes
 * ('series' | 'same' | 'seriesIndex' | 'categoryIndex').
 * The `string & {}` keeps ColorMode literals in autocomplete while still
 * accepting arbitrary color strings.
 */
export type SeriesColor = ColorMode | (string & {});

/**
 * The stroke half of a style: everything needed to draw an outline (or a bare
 * line, which has no fill). `S` widens the geometry members (width, dash) in
 * the focused/defocused states, where `'same'` means "inherit the normal
 * state's value"; it is `never` for a plain single-state style.
 */
export interface StrokeStyle<C = string, S = never> {
  /**
   * The color of the stroke (outline): use null to leave the svg stroke
   * attribute unset so that css can supply it, "none" to switch the stroke off,
   * or "currentColor" to follow the host page's css color.
   */
  strokeColor: C | null;
  /**
   * The opacity (0 - 1) of the stroke, or null to leave the svg stroke-opacity
   * attribute unset.
   */
  strokeOpacity: number | null;
  /**
   * The width (in pixels) of the stroke, or null to leave the svg stroke-width
   * attribute unset.
   */
  strokeWidth: number | null | S;
  /**
   * The dash array pattern of the stroke (e.g. "5, 5"), or null for a solid
   * stroke.
   */
  strokeDashArray?: string | null | S;
}

/**
 * A full style: a stroke plus a fill, for shapes that have an interior
 * (backgrounds, bars, markers, text).
 */
export interface Style<C = string, S = never> extends StrokeStyle<C, S> {
  /**
   * The color of the fill: use null to leave the svg fill attribute unset so
   * that css can supply it, "none" to switch the fill off, or "currentColor" to
   * follow the host page's css color.
   */
  fillColor: C | null;
  /**
   * The opacity (0 - 1) of the fill, or null to leave the svg fill-opacity
   * attribute unset.
   */
  fillOpacity: number | null;
}

/**
 * One focus state of a stroke style. Unlike a plain `StrokeStyle`, a style
 * state always writes its color and opacity attributes — so a host-css stroke
 * cannot bleed onto chart chrome and focus animation can interpolate — which
 * is why the colors and opacities are never null. Width and dash array stay
 * nullable.
 */
export interface StrokeStyleState<C = string, S = never> {
  /**
   * The color of the stroke (outline): use "none" to switch the stroke off, or
   * "currentColor" to follow the host page's css color.
   */
  strokeColor: C;
  /** The opacity (0 - 1) of the stroke. */
  strokeOpacity: number;
  /**
   * The width (in pixels) of the stroke, or null to leave the svg stroke-width
   * attribute unset.
   */
  strokeWidth: number | null | S;
  /**
   * The dash array pattern of the stroke (e.g. "5, 5"), or null for a solid
   * stroke.
   */
  strokeDashArray?: string | null | S;
}

/**
 * One focus state of a full style: a stroke plus a fill, for shapes that have
 * an interior (bars, markers, text). Like the stroke half, the fill color and
 * opacity are never null.
 */
export interface StyleState<C = string, S = never> extends StrokeStyleState<C, S> {
  /**
   * The color of the fill: use "none" to switch the fill off, or "currentColor"
   * to follow the host page's css color.
   */
  fillColor: C;
  /** The opacity (0 - 1) of the fill. */
  fillOpacity: number;
}

/**
 * A line style in each of its three focus states. `'same'` in the focused /
 * defocused states means "inherit the normal state's value" — for the colors
 * and also for the stroke width and dash array.
 */
export interface StrokeStyleStates<C = string> {
  normal: StrokeStyleState<C>;
  focused: StrokeStyleState<C | 'same', 'same'>;
  defocused: StrokeStyleState<C | 'same', 'same'>;
}

/**
 * A full style in each of its three focus states. `'same'` in the focused /
 * defocused states means "inherit the normal state's value" — for the colors
 * and also for the stroke width and dash array.
 */
export interface StyleStates<C = string> {
  normal: StyleState<C>;
  focused: StyleState<C | 'same', 'same'>;
  defocused: StyleState<C | 'same', 'same'>;
}

export interface AccessibilityConfig {
  /**
   * Whether the chart exposes keyboard navigation and screen-reader semantics.
   *
   * When `true`, the chart is keyboard- and screen-reader-accessible: the plot
   * area is a tab stop that opens and steps the tooltip (with the values spoken
   * through a hidden live region), legend items and interactive pie slices are
   * roving tab stops, and the svg carries roles, labels and `aria-hidden`
   * markers for assistive tech. Set to `false` to render the chart without any
   * of these attributes or key handlers — for example when the host page
   * provides its own accessible alternative. `respectReducedMotion` is not
   * gated by this switch.
   *
   * @default true
   */
  enabled: boolean;
  /**
   * Whether the chart is hidden from assistive tech and keyboard navigation,
   * for purely decorative charts.
   *
   * Set to `true` for a purely decorative chart — for example a sparkline that
   * repeats a value already shown as text. The chart’s container is marked
   * `aria-hidden` so screen readers skip it entirely, and every keyboard tab
   * stop (plot area, legend items, pie slices, tooltip rows and controls) is
   * removed, so keyboard users cannot land on content assistive tech cannot
   * see. Overrides `enabled`; `respectReducedMotion` is not gated by this
   * switch.
   *
   * @default false
   */
  hidden: boolean;
  /**
   * Whether to respect the user’s reduced-motion system preference.
   *
   * When `true` and the user’s system requests reduced motion (the
   * `prefers-reduced-motion: reduce` accessibility setting, for users sensitive
   * to movement), the chart behaves as if `animation.animate` were `false`:
   * config, data, and focus changes apply instantly. The preference is watched
   * live, so changing the system setting takes effect without re-creating the
   * chart. Set to `false` to animate regardless of the preference. Independent
   * of `enabled`.
   *
   * @default true
   */
  respectReducedMotion: boolean;
  /**
   * The screen-reader name for the chart when the title has no text.
   *
   * The accessible name of the chart svg when `title.text` is unset; a set
   * title always wins. Replace to localize the announced name.
   *
   * @default "Chart"
   */
  chartLabel: string;
  /**
   * The role description screen readers announce for the chart.
   *
   * Announced by screen readers in place of the generic "group" role, e.g.
   * "Monthly sales, chart". Replace to localize it, as required for
   * `aria-roledescription` values.
   *
   * @default "chart"
   */
  chartRoleDescription: string;
  /**
   * The screen-reader label for the keyboard-focusable plot area.
   *
   * The accessible name of the plot-area tab stop that keyboard users activate
   * to open and step the tooltip. Replace to localize it.
   *
   * @default "Chart values"
   */
  plotLabel: string;
  /**
   * The screen-reader label for the legend.
   *
   * The accessible name of the legend group that contains the
   * keyboard-reachable legend items. Replace to localize it.
   *
   * @default "Legend"
   */
  legendLabel: string;
  /**
   * The label for the tooltip controls’ previous-category button (aria-label
   * and hover title).
   *
   * The accessible name and hover title of the ‹ button shown when
   * `tooltip.showControls` is on; the button itself shows only the glyph.
   * Replace to localize it.
   *
   * @default "Previous category"
   */
  tooltipPreviousLabel: string;
  /**
   * The label for the tooltip controls’ next-category button (aria-label and
   * hover title).
   *
   * The accessible name and hover title of the › button shown when
   * `tooltip.showControls` is on; the button itself shows only the glyph.
   * Replace to localize it.
   *
   * @default "Next category"
   */
  tooltipNextLabel: string;
}

export interface AnimationConfig {
  /**
   * Whether all animation should be enabled or disabled.
   *
   * The master switch for staged animation. When `false`, config and data
   * changes apply instantly. When `true`, each update plays up to three
   * sequential phases — axis expansion, value change, axis contraction —
   * skipping phases it does not need, and each phase’s duration scales with the
   * size of its change (small updates play faster than the configured maximum).
   * Width/height changes re-layout the chart instantly either way. The user’s
   * reduced-motion preference can also disable animation — see
   * `accessibility.respectReducedMotion`.
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
   * when an update needs larger axis domains (new categories or larger values)
   * so incoming data has room to land.
   *
   * @default 1000
   */
  expansionDuration: number;
  /**
   * The maximum duration for the value change animation phase when data in the
   * chart changes.
   *
   * Duration (in milliseconds) of the value change phase, which tweens values
   * to their new positions and also plays category transitions (categories
   * added/removed/reordered) and series transitions (series added, removed, or
   * filtered via the legend).
   *
   * @default 1000
   */
  valueChangeDuration: number;
  /**
   * The maximum duration for the axis contraction animation phase when new data
   * is removed from the chart.
   *
   * Duration (in milliseconds) of the axis contraction phase, which plays last
   * when the settled data needs smaller axis domains.
   *
   * @default 1000
   */
  contractionDuration: number;
  /**
   * The duration of animation showing the transition between focus on a
   * specific series or category value.
   *
   * Duration (in milliseconds) of focus transitions — the emphasis change
   * between focused/defocused styling when a series or category gains or loses
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
   * The styles to apply to the chart background (strokeColor, strokeOpacity,
   * strokeWidth, fillColor, fillOpacity (use null for none)).
   *
   * @default { strokeColor: "currentColor", strokeOpacity: 0, strokeWidth: null, strokeDashArray: null, fillColor: null, fillOpacity: 0 }
   */
  backgroundStyle: Style;
}

export interface PlotConfig {
  /**
   * Whether the category axis should be left to right (false) or top to bottom
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
   * The styles to apply to the plot background (strokeColor, strokeOpacity,
   * strokeWidth, fillColor, fillOpacity (use null for none)).
   *
   * @default { strokeColor: "currentColor", strokeOpacity: 0, strokeWidth: null, strokeDashArray: null, fillColor: null, fillOpacity: 0 }
   */
  backgroundStyle: Style;
}

export interface PieConfig {
  /**
   * The inner radius of the slices as a fraction (0 to 1) of the outer radius
   * (use a value greater than 0 for a donut chart).
   *
   * @default 0
   */
  innerRadiusFraction: number;
  /**
   * The outer radius of the slices as a fraction (0 to 1) of the largest radius
   * that fits within the plot.
   *
   * @default 1
   */
  outerRadiusFraction: number;
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
  focusOffsetFraction: number;
  /**
   * Whether labels should be shown on the slices.
   *
   * @default false
   */
  showLabels: boolean;
  /**
   * The content of the slice labels: the slice value (value), the slice
   * percentage of the total (percent), the series title (title), or a
   * combination of two of them (valuePercent for "value (percent)",
   * percentValue for "percent (value)", titleValue for "title: value",
   * titlePercent for "title: percent").
   *
   * @default "percent"
   */
  labelType: PieLabelType;
  /**
   * The d3 format specifier used to format the value part of the slice labels
   * (use auto to derive a format).
   *
   * @default "auto"
   */
  labelValueFormat: string | Auto;
  /**
   * The d3 format specifier used to format the percent part of the slice labels
   * (use auto to derive a format).
   *
   * @default "auto"
   */
  labelPercentFormat: string | Auto;
  /**
   * The radial position of the slice labels as a fraction (0 to 1) between the
   * inner radius and the outer radius.
   *
   * @default 0.5
   */
  labelRadiusFraction: number;
  /**
   * Hide the label of any slice whose value is smaller than this fraction (0 to
   * 1) of the slice total.
   *
   * @default 0.05
   */
  labelMinFraction: number;
  /**
   * Whether percent slice labels (and the labelMinFraction threshold)
   * renormalize against the unfiltered slices (true) or always use every
   * slice's share of the full total (false).
   *
   * @default true
   */
  adjustLabelsForFiltering: boolean;
  /**
   * The content of the tooltip value for each slice: the slice value (value),
   * the slice percentage of the total (percent) or a combination of both
   * (valuePercent for "value (percent)", percentValue for "percent (value)");
   * the value part is formatted by the series valueFormat, valuePrefix and
   * valueSuffix, and the percent part renormalizes against the unfiltered
   * slices unless tooltip.adjustForFiltering is false.
   *
   * @default "value"
   */
  tooltipValues: PieTooltipLabelType;
  /**
   * The d3 format specifier used to format the percent part of the tooltip
   * values (use auto to derive a format).
   *
   * @default "auto"
   */
  tooltipPercentFormat: string | Auto;
  /**
   * A text label shown at the center of the pie (use null for none; most useful
   * for donut and gauge charts).
   *
   * @default null
   */
  centerLabel: string | null;
  /**
   * The styles to apply to the center label text (strokeColor, strokeOpacity,
   * strokeWidth, fillColor, fillOpacity (use null for none), use "currentColor"
   * to follow the host page's css color and theme).
   *
   * @default { strokeColor: null, strokeOpacity: null, strokeWidth: null, strokeDashArray: null, fillColor: "currentColor", fillOpacity: null }
   */
  centerLabelTextStyle: Style;
  /**
   * Whether the total of the slice values should be shown at the center of the
   * pie.
   *
   * @default false
   */
  showCenterTotal: boolean;
  /**
   * The styles to apply to the center total text (strokeColor, strokeOpacity,
   * strokeWidth, fillColor, fillOpacity (use null for none), use "currentColor"
   * to follow the host page's css color and theme).
   *
   * @default { strokeColor: null, strokeOpacity: null, strokeWidth: null, strokeDashArray: null, fillColor: "currentColor", fillOpacity: null }
   */
  centerTotalTextStyle: Style;
  /**
   * The d3 format specifier used to format the center total (use auto to derive
   * a format).
   *
   * @default "auto"
   */
  centerTotalFormat: string | Auto;
  /**
   * Whether the center total counts only the unfiltered slices (true) or always
   * shows the full total (false).
   *
   * @default true
   */
  adjustCenterTotalForFiltering: boolean;
  /**
   * Offset the center label and total horizontally by this fraction (-1 to 1)
   * of the outer radius (positive moves right).
   *
   * @default 0
   */
  centerOffsetXFraction: number;
  /**
   * Offset the center label and total vertically by this fraction (-1 to 1) of
   * the outer radius (positive moves down; e.g. use a negative value to lift
   * them into a gauge's hole).
   *
   * @default 0
   */
  centerOffsetYFraction: number;
}

export interface ColorPalette {
  /**
   * The colors to use for strokes, taken by series or category index and
   * wrapping around when there are more series than colors.
   */
  strokeColors: string[];
  /**
   * The colors to use for fills, taken by series or category index and wrapping
   * around when there are more series than colors.
   */
  fillColors: string[];
}

/**
 * A color palette in each of the three focus states. Unlike a style, a palette
 * entry is never `'same'`: the states hold whole arrays, so each one names its
 * own colors.
 */
export interface ColorPaletteStates {
  /** The palette to use while nothing has focus. */
  normal: ColorPalette;
  /** The palette to use for the focused shapes. */
  focused: ColorPalette;
  /** The palette to use for the defocused shapes. */
  defocused: ColorPalette;
}

export interface ColorPaletteConfig {
  /**
   * The color palettes to use for series shapes that are colored by series or
   * category index.
   *
   * The fallback coloring for series that do not set explicit colors: each
   * series takes the palette entry for its series index (or its category index,
   * for series configured to color by category index). The focused/defocused
   * variants apply while another element has focus.
   *
   * @default { normal: { … }, focused: { … }, defocused: { … } }
   */
  series: ColorPaletteStates;
  /**
   * The color palettes to use for series markers that are colored by series or
   * category index.
   *
   * @default { normal: { … }, focused: { … }, defocused: { … } }
   */
  marker: ColorPaletteStates;
  /**
   * The color palettes to use for series labels that are colored by series or
   * category index.
   *
   * @default { normal: { … }, focused: { … }, defocused: { … } }
   */
  label: ColorPaletteStates;
  /**
   * The color palettes to use for series error bars that are colored by series
   * or category index.
   *
   * @default { normal: { … }, focused: { … }, defocused: { … } }
   */
  errorBar: ColorPaletteStates;
}

export interface CrosshairConfig {
  /**
   * Whether or not crosshairs should be shown when a category or series is
   * focused.
   *
   * @default true
   */
  visible: boolean;
  /**
   * Whether to change the focused category as the crosshairs are shown or
   * hidden, and as the pointer moves when the tooltip's followPointer is on.
   *
   * @default true
   */
  applyFocus: boolean;
  /**
   * Whether or not crosshair lines for focused categories should be shown.
   *
   * @default true
   */
  showCategory: boolean;
  /**
   * Whether or not crosshair lines for focused series should be shown.
   *
   * @default true
   */
  showSeries: boolean;
  /**
   * The style of the crosshair lines shown for the focused category.
   *
   * @default { strokeColor: "currentColor", strokeOpacity: 0.3, strokeWidth: 3, strokeDashArray: "10, 5" }
   */
  categoryLineStyle: StrokeStyle;
  /**
   * The style of the crosshair lines shown for the focused series.
   *
   * @default { strokeColor: "currentColor", strokeOpacity: 0.3, strokeWidth: 3, strokeDashArray: "10, 5" }
   */
  seriesLineStyle: StrokeStyle;
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
  text: string | null;
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
  prefix: string | null;
  /**
   * The text to display at the end of the title at the top of the chart (use
   * null for none).
   *
   * @default null
   */
  suffix: string | null;
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
   * The styles to apply to the title background (strokeColor, strokeOpacity,
   * strokeWidth, fillColor, fillOpacity (use null for none)).
   *
   * @default { strokeColor: "currentColor", strokeOpacity: 0, strokeWidth: null, strokeDashArray: null, fillColor: null, fillOpacity: 0 }
   */
  backgroundStyle: Style;
  /**
   * The styles to apply to the title text background (strokeColor,
   * strokeOpacity, strokeWidth, fillColor, fillOpacity (use null for none)).
   *
   * @default { strokeColor: "currentColor", strokeOpacity: 0, strokeWidth: null, strokeDashArray: null, fillColor: null, fillOpacity: 0 }
   */
  textBackgroundStyle: Style;
  /**
   * The styles to apply to the title text (strokeColor, strokeOpacity,
   * strokeWidth, fillColor, fillOpacity (use null for none), use "currentColor"
   * to follow the host page's css color and theme).
   *
   * @default { strokeColor: "none", strokeOpacity: null, strokeWidth: 0, strokeDashArray: null, fillColor: "currentColor", fillOpacity: null }
   */
  textStyle: Style;
  /**
   * The styles to apply to the title prefix background (strokeColor,
   * strokeOpacity, strokeWidth, fillColor, fillOpacity (use null for none)).
   *
   * @default { strokeColor: "currentColor", strokeOpacity: 0, strokeWidth: null, strokeDashArray: null, fillColor: null, fillOpacity: 0 }
   */
  prefixBackgroundStyle: Style;
  /**
   * The styles to apply to the title prefix text (strokeColor, strokeOpacity,
   * strokeWidth, fillColor, fillOpacity (use null for none), use "currentColor"
   * to follow the host page's css color and theme).
   *
   * @default { strokeColor: "none", strokeOpacity: null, strokeWidth: 0, strokeDashArray: null, fillColor: "currentColor", fillOpacity: null }
   */
  prefixTextStyle: Style;
  /**
   * The styles to apply to the title suffix background (strokeColor,
   * strokeOpacity, strokeWidth, fillColor, fillOpacity (use null for none)).
   *
   * @default { strokeColor: "currentColor", strokeOpacity: 0, strokeWidth: null, strokeDashArray: null, fillColor: null, fillOpacity: 0 }
   */
  suffixBackgroundStyle: Style;
  /**
   * The styles to apply to the title suffix text (strokeColor, strokeOpacity,
   * strokeWidth, fillColor, fillOpacity (use null for none), use "currentColor"
   * to follow the host page's css color and theme).
   *
   * @default { strokeColor: "none", strokeOpacity: null, strokeWidth: 0, strokeDashArray: null, fillColor: "currentColor", fillOpacity: null }
   */
  suffixTextStyle: Style;
}

/**
 * The series icons shown beside series titles, configured identically by the
 * legend and by the tooltip.
 *
 * Both sections show the same icons and take the same values for them, so the
 * properties are declared once here and extended by each: the two surfaces
 * cannot drift apart. Only the prose differs between them (a legend icon sizes
 * itself against the measured legend text, a tooltip icon against the
 * inherited font size), so each section keeps its own descriptions.
 */
export interface SeriesIconConfig {
  /**
   * Whether to show series colors next to series titles in the legend.
   *
   * In tooltip: whether to show series colors next to series titles in the
   * tooltip.
   *
   * @default true
   */
  showIconColors: boolean;
  /**
   * Whether to show series marker shape next to series titles in the legend.
   *
   * In tooltip: whether to show series marker shape next to series titles in
   * the tooltip.
   *
   * @default true
   */
  showIconShapes: boolean;
  /**
   * Whether to show placeholder icons next to the series titles in the legend.
   *
   * In tooltip: whether to show placeholder icons next to the series titles in
   * the tooltip.
   *
   * @default true
   */
  showIconPlaceholders: boolean;
  /**
   * The width and height (in pixels) of the series icons, or "auto" to match
   * the legend text font size.
   *
   * In tooltip: the width and height (in pixels) of the series icons, or "auto"
   * to match the inherited font size.
   *
   * @default "auto"
   */
  iconSize: number | Auto;
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
   * @default "currentColor"
   */
  iconBorderColor: string;
  /**
   * The opacity (0 - 1) of the border drawn around series icons.
   *
   * @default 0.65
   */
  iconBorderOpacity: number;
  /**
   * The color to use for the series icon when the corresponding series is
   * filtered.
   *
   * @default 'rgba(255,255,255,0)'
   */
  iconFilteredColor: string;
  /**
   * The color to use for the placeholder series icons when the corresponding
   * series is not filtered.
   *
   * @default 'rgba(0,0,0,0.5)'
   */
  iconUnfilteredColor: string;
}

export interface LegendConfig extends SeriesIconConfig {
  /**
   * Whether the legend should be visible.
   *
   * Default:
   * - `true` — when series.length is > 1
   * - `false` — when series.length is <= 1
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
   * The styles to apply to the legend background (strokeColor, strokeOpacity,
   * strokeWidth, fillColor, fillOpacity (use null for none)).
   *
   * @default { strokeColor: "currentColor", strokeOpacity: 0, strokeWidth: null, strokeDashArray: null, fillColor: null, fillOpacity: 0 }
   */
  backgroundStyle: Style;
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
   * The styles to apply to the legend item backgrounds (strokeColor,
   * strokeOpacity, strokeWidth, fillColor, fillOpacity (use null for none)).
   *
   * @default { strokeColor: "currentColor", strokeOpacity: 0, strokeWidth: null, strokeDashArray: null, fillColor: null, fillOpacity: 0 }
   */
  itemBackgroundStyle: Style;
  /**
   * The styles to apply to the legend item text (strokeColor, strokeOpacity,
   * strokeWidth, fillColor, fillOpacity (use null for none), use "currentColor"
   * to follow the host page's css color and theme).
   *
   * @default { strokeColor: "none", strokeOpacity: null, strokeWidth: 0, strokeDashArray: null, fillColor: "currentColor", fillOpacity: null }
   */
  itemTextStyle: Style;
  /**
   * Whether to strike through the item text of filtered series.
   *
   * When `true`, the item text of a series that has been filtered out of the
   * chart is drawn with a line through it, so the legend shows at a glance
   * which series are filtered. The strike-through covers the item text only,
   * never its color icon — the icon already says the same thing by going
   * hollow.
   *
   * @default false
   */
  showFilteringOnLabels: boolean;
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
   * Whether to filter a series when the series icon or title is clicked.
   *
   * When `true`, clicking a legend item toggles its series out of (and back
   * into) the chart, playing the staged series transition; the item stays in
   * the legend so it can be restored. `onSeriesFilter` reports every change.
   *
   * @default true
   */
  filterOnClick: boolean;
}

export interface TooltipConfig extends SeriesIconConfig {
  /**
   * Whether or not to show the tooltip.
   *
   * @default true
   */
  visible: boolean;
  /**
   * Whether to change the focused category as the tooltip is shown or hidden,
   * and as it tracks the pointer when followPointer is on.
   *
   * @default true
   */
  applyFocus: boolean;
  /**
   * Whether the tooltip should be centered at the closest category value (true)
   * or at the click/tap position (false).
   *
   * Default:
   * - `false` — when chart.type is pie
   * - `true` — when chart.type is xy
   */
  snapToCategory: boolean;
  /**
   * Whether the tooltip should track the mouse position in the chart drawing
   * area.
   *
   * @default false
   */
  followPointer: boolean;
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
  filterSeriesOnClick: boolean;
  /**
   * Whether category values should be focused when the user clicks/taps on them
   * in the tooltip.
   *
   * @default false
   */
  focusCategoryOnClick: boolean;
  /**
   * Whether series should be focused when the user clicks/taps on them in the
   * tooltip.
   *
   * @default false
   */
  focusSeriesOnClick: boolean;
  /**
   * Whether category values should be focused when the user mouses over them in
   * the tooltip.
   *
   * @default false
   */
  focusCategoryOnMouseOver: boolean;
  /**
   * Whether series should be focused when the user mouses over them in the
   * tooltip.
   *
   * Ignored while `showControls` is on — there the controls’ mode decides: a
   * row’s series focuses on hover while filter mode is active.
   *
   * @default false
   */
  focusSeriesOnMouseOver: boolean;
  /**
   * Whether the category value should be shown as the first line of the
   * tooltip.
   *
   * Default:
   * - `false` — when chart.type is pie
   * - `true` — when chart.type is xy
   */
  showCategory: boolean;
  /**
   * Whether the focus/filter controls should be shown at the top of the
   * tooltip.
   *
   * When `true`, a control strip renders above the tooltip lines: ‹ and ›
   * buttons step the shown category, and a mode button toggles what clicking a
   * tooltip row does. In filter mode (the initial mode) a series row toggles
   * its series out of the chart like a legend click (`filterable` permitting),
   * and hovering a series row focuses its series like hovering its legend item;
   * in focus mode a row click pins focus on its series or category. With the
   * controls shown, the mode decides click and series-hover behavior — the
   * `focus…OnClick` / `filterSeriesOnClick` / `focusSeriesOnMouseOver` settings
   * are not consulted (`focusCategoryOnMouseOver` still is). The mode button
   * shows the active mode via `filterModeText` / `focusModeText`, and the step
   * buttons are labeled for assistive tech by
   * `accessibility.tooltipPreviousLabel` / `tooltipNextLabel`.
   *
   * @default false
   */
  showControls: boolean;
  /**
   * The text shown on the tooltip controls’ mode button while filter mode is
   * active.
   *
   * The visible text of the mode button while clicking a series row filters its
   * series. Replace to localize it.
   *
   * @default "Filter"
   */
  filterModeText: string;
  /**
   * The text shown on the tooltip controls’ mode button while focus mode is
   * active.
   *
   * The visible text of the mode button while clicking a row focuses its series
   * or category. Replace to localize it.
   *
   * @default "Focus"
   */
  focusModeText: string;
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
   * The padding (in pixels) for the top, right, bottom and left sides of the
   * tooltip.
   *
   * @default { top: 2, right: 2, bottom: 2, left: 2 }
   */
  padding: MarginPadding;
  /**
   * The padding (in pixels) between each line of the tooltip.
   *
   * @default 3
   */
  linePadding: number;
  /**
   * Whether to right-align the values shown in the tooltip.
   *
   * @default true
   */
  rightAlignValues: boolean;
  /**
   * The styles to apply to the tooltip box (strokeColor, strokeOpacity,
   * strokeWidth, fillColor, fillOpacity (use null for none)).
   *
   * @default { strokeColor: "rgba(0,0,0,0.3)", strokeOpacity: null, strokeWidth: 2, fillColor: "rgba(255,255,255,0.9)", fillOpacity: null }
   */
  backgroundStyle: Style;
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
   * Whether to strike through the label text of filtered series.
   *
   * When `true`, the label of a series that has been filtered out of the chart
   * is drawn with a line through it. The strike-through covers the label only,
   * so the value beside it stays legible — except when `rightAlignValues` is
   * `false`, where the label and the value are one piece of text and both are
   * struck.
   *
   * @default false
   */
  showFilteringOnLabels: boolean;
  /**
   * Whether to adjust the series values when series filtering changes.
   *
   * @default true
   */
  adjustForFiltering: boolean;
  /**
   * Whether to adjust the width of the tooltip when the series values change
   * due to filtering changes.
   *
   * @default false
   */
  adjustSizeForFiltering: boolean;
  /**
   * Whether to hide series that have been filtered from the tooltip.
   *
   * @default false
   */
  hideFiltered: boolean;
  /**
   * Whether to show series that do not have defined values in the tooltip.
   *
   * @default true
   */
  showMissingValues: boolean;
  /**
   * The text to show for series that have been filtered (use null for none).
   *
   * @default null
   */
  filteredValueText: string | null;
  /**
   * The character to show in place of each digit of a series value that has
   * been filtered (use null for none).
   *
   * @default "-"
   */
  filteredValueCharacter: string;
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
  rangeValueSeparator: string;
}

/**
 * One threshold line on an axis: a reference value drawn as a line across the
 * plot, with an optional title label beside it. Entries are whole objects (the
 * `thresholds` array replaces its default wholesale); members left out fall
 * back to the documented defaults.
 */
export interface ThresholdConfig {
  /** The axis value to draw the threshold line at; on a date category axis, an iso date string or millisecond timestamp. Thresholds never extend the axis domain, and a value outside it is not drawn. */
  value: number | string;
  /** Whether the line is drawn in front of (true) or behind (false) the series shapes. Defaults to true. */
  front?: boolean;
  /** The style of the threshold line per focus state ('same' inherits the normal state). */
  style?: DeepPartial<StrokeStyleStates>;
  /** The title text shown beside the line (null for none). Defaults to null. */
  title?: string | null;
  /** Which value side of the line the title sits on: 'low' (smaller values) or 'high'. Defaults to 'high'. */
  titleSide?: ThresholdTitleSide;
  /** Whether the title flips to the other side when it has no room. Defaults to true. */
  titleSnapToValue?: boolean;
  /** The margin (in pixels) around the title, relative to its orientation. */
  titleMargin?: MarginPadding;
  /** The padding (in pixels) around the title, relative to its orientation. */
  titlePadding?: MarginPadding;
  /** The style of the title text per focus state. */
  titleTextStyle?: DeepPartial<StyleStates>;
  /** The style of the title background. */
  titleBackgroundStyle?: Partial<Style>;
}

/** Shared properties of the category axis and value axes (config/defaults/axisConfig.ts). */
export interface AxisConfigBase {
  /**
   * Whether to show a line along the length of the axis.
   *
   * @default true
   */
  showAxisLine: boolean;
  /**
   * Whether the axis line should be shown in front (true) or behind (false) the
   * series shapes.
   *
   * @default false
   */
  axisLineFront: boolean;
  /**
   * The margin (in pixels) between the line shown along the axis and the inner
   * boundary of the axis.
   *
   * @default 0
   */
  axisLineMargin: number;
  /**
   * The style of the line shown along the axis.
   *
   * @default { normal: { … }, focused: { … }, defocused: { … } }
   */
  axisLineStyle: StrokeStyleStates;

  /**
   * The styles to apply to the axis background (strokeColor, strokeOpacity,
   * strokeWidth, fillColor, fillOpacity (use null for none)).
   *
   * @default { strokeColor: "currentColor", strokeOpacity: 0, strokeWidth: null, strokeDashArray: null, fillColor: null, fillOpacity: 0 }
   */
  backgroundStyle: Style;
  /**
   * Whether the axis background should be shown in front (true) or behind
   * (false) the series shapes.
   *
   * @default false
   */
  backgroundFront: boolean;

  /**
   * Whether the axis is placed at the start (top/left) or end (bottom/right) of
   * the chart.
   *
   * Category axis defaults:
   * - `"start"` — when plot.inverted is true
   * - `"end"` — when plot.inverted is false
   * Value axis default: `"start"`.
   */
  side: AxisSide;
  /**
   * Whether the axis runs in the opposite direction, so its minimum is drawn
   * where its maximum normally would be (an ordinal category axis reverses its
   * category order).
   *
   * @default false
   */
  reversed: boolean;

  /**
   * Whether the axis should consume space in the layout (false) or not (true).
   *
   * @default false
   */
  collapsed: boolean;

  /**
   * Whether to show the focus range on the axis when it has a focused series
   * domain or category value.
   *
   * Category axis default: `false`.
   * Value axis default: `true`.
   */
  showFocusRange: boolean;
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
   * The style of the focus range.
   *
   * @default { strokeColor: "currentColor", strokeOpacity: 0.2, strokeWidth: 1, strokeDashArray: null, fillColor: "currentColor", fillOpacity: 0.12 }
   */
  focusRangeStyle: StyleState;

  /**
   * Whether to show lines perpendicular to the axis showing the focused series
   * domain or category value.
   *
   * Category axis default: `true`.
   * Value axis default: `false`.
   */
  showFocusTickMarks: boolean;
  /**
   * Whether the focus tick marks should be shown in front (true) or behind
   * (false) the series shapes.
   *
   * @default false
   */
  focusTickMarkFront: boolean;
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
   * The style of the focus tick mark line(s).
   *
   * @default { strokeColor: "currentColor", strokeOpacity: 1, strokeWidth: 3, strokeDashArray: null }
   */
  focusTickMarkStyle: StrokeStyleState;

  /**
   * Whether to show grid lines perpendicular to each tick on the axis.
   *
   * @default false
   */
  showGridLines: boolean;
  /**
   * Whether the axis grid lines should be shown in front (true) or behind
   * (false) the series shapes.
   *
   * @default false
   */
  gridLineFront: boolean;
  /**
   * The style of the axis grid lines.
   *
   * @default { normal: { … }, focused: { … }, defocused: { … } }
   */
  gridLineStyle: StrokeStyleStates;

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
   * the values); must be >= min unless either is "auto" (set reversed to run
   * the axis backwards).
   *
   * With `"auto"` the maximum is computed from the data (including stacking) on
   * every update, and changes animate through the staged axis
   * expansion/contraction phases. Set a number to pin the bound instead. Must
   * be >= `min` unless either is `"auto"` (set
   * [`reversed`](#valueAxes.reversed) to run the axis backwards). Values
   * outside of the defined range are clipped rather than allowed to overflow
   * the plot area of the chart.
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
   * Category axis defaults:
   * - `10` — when scale is linear
   * - `0` — when scale is ordinal
   * Value axis default: `10`.
   */
  maxTickCount: number;

  /**
   * The forced minimum numeric value for the axis (use "auto" to compute from
   * the values); must be <= max unless either is "auto" (set reversed to run
   * the axis backwards).
   *
   * With `"auto"` the minimum is computed from the data (including stacking) on
   * every update, and changes animate through the staged axis
   * expansion/contraction phases. Set a number to pin the bound instead. Must
   * be <= `max` unless either is `"auto"` (set
   * [`reversed`](#valueAxes.reversed) to run the axis backwards). Values
   * outside of the defined range are clipped rather than allowed to overflow
   * the plot area of the chart.
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
   * The minimum space (in pixels) to allow between the bounds of any tick label
   * text.
   *
   * Category axis defaults:
   * - `12` — when scale is linear
   * - `4` — when scale is ordinal
   * Value axis default: `12`.
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
   * The threshold lines to draw on the axis, each an object drawing a reference
   * line across the plot at an axis value (the array replaces the default
   * wholesale).
   *
   * @default []
   */
  thresholds: ThresholdConfig[];

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
   * The styles to apply to the axis tick label background (strokeColor,
   * strokeOpacity, strokeWidth, fillColor, fillOpacity (use null for none)).
   *
   * @default { strokeColor: "currentColor", strokeOpacity: 0, strokeWidth: null, strokeDashArray: null, fillColor: null, fillOpacity: 0 }
   */
  tickLabelBackgroundStyle: Style;
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
   * The d3 format string to be applied to the category values when displayed in
   * axis tick labels (use null for none, use "auto" to derive from data).
   *
   * @default "auto"
   */
  tickLabelFormat: string | Auto | null;
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
   * The style of the axis tick label text.
   *
   * @default { normal: { … }, focused: { … }, defocused: { … } }
   */
  tickLabelTextStyle: StyleStates;

  /**
   * Whether to show lines perpendicular to each tick value along the axis.
   *
   * @default true
   */
  showTickMarks: boolean;
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
   * The style of the axis tick mark lines.
   *
   * @default { normal: { … }, focused: { … }, defocused: { … } }
   */
  tickMarkStyle: StrokeStyleStates;

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
   * The styles to apply to the axis title background (strokeColor,
   * strokeOpacity, strokeWidth, fillColor, fillOpacity (use null for none)).
   *
   * @default { strokeColor: "currentColor", strokeOpacity: 0, strokeWidth: null, strokeDashArray: null, fillColor: null, fillOpacity: 0 }
   */
  titleBackgroundStyle: Style;
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
   * The style of the axis title text.
   *
   * @default { normal: { … }, focused: { … }, defocused: { … } }
   */
  titleTextStyle: StyleStates;
  /**
   * Whether the axis should be visible.
   *
   * Category axis defaults:
   * - `false` — when chart.type is pie
   * - `true` — when chart.type is xy
   * Value axis defaults:
   * - `false` — when chart.type is pie
   * - `true` — when chart.type is xy
   */
  visible: boolean;
}

export interface CategoryAxisConfig extends AxisConfigBase {
  /**
   * The property to retrieve from the data provider for the category values.
   *
   * The chart reads this property from each entry of the data provider to get
   * the category value. It is required — the only category axis property
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
   * The property to retrieve from the data provider for the category display
   * values (use null for none).
   *
   * When set, this property’s value is used wherever the category value is
   * displayed (tick labels, tooltip), while `property` still drives positioning
   * — useful for pre-formatted or friendly labels.
   *
   * @default null
   */
  displayProperty: string | null;
  /**
   * The padding fractions (0 - 1) of the category extent for all category
   * values (outer) and grouped series (inner).
   *
   * @default { inner: 0.1, outer: 0.1 }
   */
  categoryPaddingFraction: InnerOuter;
  /**
   * The extra count to be added to the category value count when dividing the
   * category extent for displaying category values.
   *
   * @default 1
   */
  categoryCountPadding: number;
  /**
   * The minimum extent (in pixels) of each category slot; for a non-inverted
   * bar chart this is a minimum bar width.
   *
   * @default 1
   */
  minCategoryValueExtent: number;
  /**
   * The scale to use for the displayed category values (ordinal, linear).
   *
   * `ordinal` places the categories at evenly spaced positions in data order
   * regardless of their values; `linear` positions `number`/`date` category
   * values proportionally along the axis, so uneven spacing in the data shows
   * as uneven spacing in the chart.
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
   * fraction setting is used.
   *
   * @default 0
   */
  tickLabelTruncationMinLength: number;
  /**
   * The maximum fraction (0 - 1) of the chart bounds to allow any tick label
   * text to occupy when they are perpendicular to the axis.
   *
   * @default 0.2
   */
  tickLabelTruncationMaxFraction: number;
  /**
   * The type of the displayed category values (number, date, string).
   *
   * How category values are interpreted: `string` for labels, `number` for
   * numeric values, and `date` for date values (`dateUTC` controls their
   * timezone handling). The type drives parsing, tick label formatting, and
   * which `scale` options make sense.
   *
   * @default "string"
   */
  type: DataType;
  /**
   * The d3 format string to be applied to the category value when displayed in
   * the tooltip (use null for none, use "auto" to derive from data).
   *
   * @default "auto"
   */
  valueFormat: string | Auto | null;
  /**
   * The label to show before a category value in the tooltip (use null for
   * none).
   *
   * @default null
   */
  valueLabel: string | null;
  /**
   * The text to prefix category values with when showing them in the tooltip
   * (use null for none).
   *
   * @default null
   */
  valuePrefix: string | null;
  /**
   * The text to append category values with when showing them in the tooltip
   * (use null for none).
   *
   * @default null
   */
  valueSuffix: string | null;
}

export interface ValueAxisTick {
  /** The axis value to place the tick at. */
  value: number;
  /** The tick label text; when omitted the value is formatted with `tickLabelFormat`. */
  label?: string;
}

export interface ValueAxisConfig extends AxisConfigBase {
  /**
   * The unique identifier for the value axis so it can be referenced by series
   * that belong to it.
   *
   * Referenced by `series[].axis` (and `seriesStacks[].axis`) to assign series
   * to this axis. With a single axis the ids can be omitted everywhere.
   *
   * Default:
   * - `VA${index}` — value axis index
   */
  id: string;
  /**
   * The unique integer order of the value axis controlling its order of
   * appearance.
   *
   * Default:
   * - `${index}` — value axis index
   */
  order: number;
  /**
   * Whether to adjust the domain of the axis as series belonging to it are
   * filtered.
   *
   * @default false
   */
  adjustForFiltering: boolean;
  /**
   * Whether to adjust the size of the axis tick label bounds as series
   * belonging to it are filtered.
   *
   * @default false
   */
  adjustTickLabelSizeForFiltering: boolean;
  /**
   * Whether the axis should be visible when all series belonging to it are
   * filtered.
   *
   * @default true
   */
  visibleWhenAllFiltered: boolean;
  /**
   * The numeric base value of the axis, used for animation and relative
   * positioning for shapes (use null for none).
   *
   * The value that bars and areas grow from, and the resting position shapes
   * animate from/to when series enter or leave. With mixed positive/negative
   * data the base separates the two directions.
   *
   * Default:
   * - `0` — when chart.type is pie
   * - `0` — value axis has stacks
   * - `null` — value axis has no stacks
   */
  base: number | null;
  /**
   * Whether to show a line along the base of the axis.
   *
   * @default true
   */
  showBaseLine: boolean;
  /**
   * Whether the base line should be shown in front (true) or behind (false) the
   * series shapes.
   *
   * @default false
   */
  baseLineFront: boolean;
  /**
   * The style of the line shown along the base of the axis.
   *
   * @default { normal: { … }, focused: { … }, defocused: { … } }
   */
  baseLineStyle: StrokeStyleStates;
  /**
   * Whether the value axis should be focused whenever the user mouses over a
   * part of it in the chart.
   *
   * @default true
   */
  focusOnMouseOver: boolean;
  /**
   * Whether the value axis should be focused whenever the user clicks/taps a
   * part of it in the chart.
   *
   * @default false
   */
  focusOnClick: boolean;
  /**
   * The margin, as a fraction (0 or greater) of the domain of the axis, to use
   * at the maximum extent of the axis (only applied if max is "auto" and max
   * value is not equal base).
   *
   * The margin is relative to the pre-margin domain, so values above 1 are
   * allowed and confine the data to a band of the plot: a margin of 4 leaves
   * the data in the bottom fifth — how the candlestick/OHLC volume pane
   * reserves the upper plot for the price axis.
   *
   * @default 0.05
   */
  maxMarginFraction: number;
  /**
   * The margin, as a fraction (0 or greater) of the domain of the axis, to use
   * at the minimum extent of the axis (only applied if min is "auto" and min
   * value is not equal base).
   *
   * The margin is relative to the pre-margin domain, so values above 1 are
   * allowed and confine the data to a band of the plot: a price axis with
   * margin 1/3 keeps its data in the top three quarters, leaving the bottom for
   * a volume pane.
   *
   * @default 0.05
   */
  minMarginFraction: number;
  /**
   * The scale of the value axis, must be linear.
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
  ticks: ValueAxisTick[] | null;
  /**
   * The type of the value axis, must be number.
   *
   * @default "number"
   */
  type: DataType;
  /**
   * Whether to show the axis as focused when any series belonging to it is
   * focused.
   *
   * @default true
   */
  useSeriesFocus: boolean;
}

export interface SeriesCurve {
  /** The d3-shape curve to interpolate the series shape with. */
  type: CurveType;
  /**
   * The tension/alpha value passed to the curve types that take one, or
   * undefined to use the curve's own default.
   */
  param?: number;
}

/**
 * The two-sided half of a series color scale: a data threshold plus the color
 * ramps either side of it. `value` is a data value, not a color, which is why
 * it lives here rather than as a `colorBase` colour alongside `min` / `max`.
 */
export interface SeriesColorScaleBase {
  /**
   * The base value to use for color interpolation, allowing 2 distinct sets of
   * min & max colors for interpolation (use null for none).
   */
  value: number | null;
  /**
   * The minimum color to use when interpolating the series shape color with a
   * color property value that is above the base value (use null for none).
   */
  aboveMin: string | null;
  /**
   * The maximum color to use when interpolating the series shape color with a
   * color property value that is above the base value (use null for none).
   */
  aboveMax: string | null;
  /**
   * The minimum color to use when interpolating the series shape color with a
   * color property value that is below the base value (use null for none).
   */
  belowMin: string | null;
  /**
   * The maximum color to use when interpolating the series shape color with a
   * color property value that is below the base value (use null for none).
   */
  belowMax: string | null;
}

/**
 * The color ramp a series' `colorProperty` values are mapped through: the color
 * space to interpolate in, and either a single `min`/`max` ramp or, when
 * `base.value` is set, a ramp either side of that threshold.
 *
 * These colors are handed to d3 scale ranges, so unlike a style's colors they
 * must be real colors — `'currentColor'` would interpolate to `NaN`.
 */
export interface SeriesColorScale {
  /**
   * The type of d3 color interpolation to apply when using a color property
   * (rgb, hsl, lab, hcl) (use null for none).
   */
  interpolation: ColorInterpolation | null;
  /**
   * The minimum color to use when interpolating the series shape color with a
   * color property (use null for none).
   */
  min: string | null;
  /**
   * The maximum color to use when interpolating the series shape color with a
   * color property (use null for none).
   */
  max: string | null;
  /**
   * The color drawn for a value whose color property value is missing (use null
   * to fall back to the series style colors).
   */
  missing: string | null;
  /**
   * The data threshold that splits the color ramp in two, and the two ramps
   * either side of it.
   */
  base: SeriesColorScaleBase;
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
   * The unique integer order of the series controlling its order of appearance.
   *
   * Default:
   * - `${index}` — series index
   */
  order: number;
  /**
   * The property to retrieve from the data provider for the series values.
   *
   * The chart reads this property from each category of the data provider to
   * get the series value — it is the only series property without a default, so
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
   * bars, a banded (low/high) area, or a pair of lines with the `line`
   * renderer.
   *
   * @default null
   */
  rangeProperty: string | null;
  /**
   * The property to retrieve from the data provider for the absolute lower
   * error bound values used to draw error bars (use null for none).
   *
   * The bounds are absolute values in value axis units, not deltas from the
   * series value, and they join the value axis domain so the whiskers never
   * clip. Either bound can be used alone for a one-sided error bar; a category
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
   * The property to retrieve from the data provider for the series color values
   * (use null for none, to color by style instead).
   *
   * @default null
   */
  colorProperty: string | null;
  /**
   * The color ramp the series color values are mapped through.
   *
   * @default { interpolation: null, min: null, max: null, missing: null, base: { … } }
   */
  colorScale: SeriesColorScale;
  /**
   * The unique identifier of the axis that the series belongs to.
   *
   * Assigns the series to the value axis in `valueAxes` whose `id` matches.
   * With a single configured axis this can be omitted — it defaults to that
   * axis id.
   *
   * Default:
   * - `sole axis id` — value axis
   */
  axis?: string;
  /**
   * The unique identifier of the series stack that the series belongs to (use
   * null for none).
   *
   * Series sharing the same stack id (an `id` from `seriesStacks`) are drawn
   * stacked on one another and animate as a single unit, so the stack stays
   * gapless mid-transition. Defaults to the sole stack id when exactly one
   * stack is configured; use `null` to opt a series out.
   *
   * Default:
   * - `sole stack id` — series stack
   */
  stack: string | null;
  /**
   * The unique identifier of the series group that the series belongs to (use
   * null for none).
   *
   * Series sharing the same group id (an `id` from `seriesGroups`) are laid out
   * side by side within each category slot — grouped/clustered bars. Defaults
   * to the sole group id when exactly one series group is configured; use
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
   * `bar` draws a rectangle per category value, `line` connects the values with
   * a path, `area` fills between the value line and the value axis base, and
   * `none` draws no shape. Different series in the same chart can use different
   * renderers, e.g. bars with a line overlay.
   *
   * @default "line"
   */
  renderer: RendererType;
  /**
   * Whether to treat a value as missing when either of property or
   * rangeProperty is undefined, instead of collapsing to the defined one.
   *
   * Only affects series with a `rangeProperty` (stacked series are unaffected).
   * By default a category with just one of `property`/`rangeProperty` undefined
   * keeps a zero-extent span collapsed at the defined value, so ranged areas
   * stay connected through it. When `true` such categories count as missing
   * instead, following the configured `missingValues` treatment.
   *
   * @default false
   */
  partialRangeIsMissing: boolean;
  /**
   * What to draw at a category whose value is missing: break the shape at the
   * gap (break), connect the neighbouring defined values (connect), or draw the
   * point at the value axis base value (base).
   *
   * With `"connect"`, lines and areas bridge missing categories directly
   * between the neighbouring defined values; with `"base"` the point is drawn
   * at the value axis base value; the default `"break"` leaves a gap in the
   * shape. For a series with a `rangeProperty`, a category counts as missing
   * only when both properties are undefined — see `partialRangeIsMissing`.
   *
   * @default "break"
   */
  missingValues: MissingValues;
  /**
   * Whether to still show a marker at missing values (most useful with
   * missingValues "base", which gives the marker a position).
   *
   * @default false
   */
  missingValueMarkers: boolean;

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
   * (the full category slot, or the series’ sub-slot when grouped), so a narrow
   * bar can overlay a full-width one from another series — e.g. a candlestick
   * wick behind its body, or a bullet-chart measure over its backing range. The
   * narrowed bar is centered by default; `barAlignFraction` moves it within the
   * slot.
   *
   * @default 1
   */
  barWidthFraction: number;
  /**
   * The fraction (0 - 1) of the slot width freed by barWidthFraction placed
   * before each bar in the series (0 aligns with the slot start, 0.5 centers, 1
   * aligns with the slot end).
   *
   * Only affects the `bar` renderer, and only when `barWidthFraction` is less
   * than 1. Lets narrowed bars from different series share one slot side by
   * side — e.g. the left open tick and right close tick of an OHLC bar.
   *
   * @default 0.5
   */
  barAlignFraction: number;
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
   * see `capOnlyStackOuter` and `seriesStacks[].outerCapType`.
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
   * The style of the series error bars.
   *
   * @default { normal: { … }, focused: { … }, defocused: { … } }
   */
  errorBarStyle: StrokeStyleStates<SeriesColor>;
  /**
   * The label to show before a series value in the tooltip (null falls back to
   * useTitleForValueLabel, it does not mean no label).
   *
   * @default null
   */
  valueLabel: string | null;
  /**
   * The d3 format string to be applied to the series value when displayed in
   * the tooltip (use null for none, use "auto" to derive from data ("auto" will
   * use the value axis tick label format if it is set)).
   *
   * A d3-format specifier applied to the value shown in the tooltip, e.g.
   * `".1f"` or `",.0f"`. `"auto"` derives a format from the data, preferring
   * the value axis `tickLabelFormat` when that is set.
   *
   * @default "auto"
   */
  valueFormat: string | Auto | null;
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
  labelFormat: string | Auto | null;
  /**
   * The text to prefix series label values with when drawing them on the plot
   * (use null for none).
   *
   * @default null
   */
  labelPrefix: string | null;
  /**
   * The text to append series label values with when drawing them on the plot
   * (use null for none).
   *
   * @default null
   */
  labelSuffix: string | null;
  /**
   * The style of the series label values.
   *
   * @default { normal: { … }, focused: { … }, defocused: { … } }
   */
  labelTextStyle: StyleStates<SeriesColor>;
  /**
   * The minimum position fraction (0 - 1) from the domain minimum for which
   * series labels should be shown (use null for none).
   *
   * @default null
   */
  labelMinPositionFraction: number | null;
  /**
   * The maximum position fraction (0 - 1) from the domain maximum for which
   * series labels should be shown (use null for none).
   *
   * @default null
   */
  labelMaxPositionFraction: number | null;
  /**
   * The minimum position fraction (0 - 1) between two series values for which
   * series labels should be shown (use null for none).
   *
   * @default null
   */
  labelMinRangeFraction: number | null;
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
   * The labelMinPositionFraction bound applied only to series values above the
   * base value (use "auto" to inherit labelMinPositionFraction, null for none).
   *
   * @default "auto"
   */
  labelAboveBaseMinPositionFraction: number | Auto | null;
  /**
   * The labelMaxPositionFraction bound applied only to series values above the
   * base value (use "auto" to inherit labelMaxPositionFraction, null for none).
   *
   * @default "auto"
   */
  labelAboveBaseMaxPositionFraction: number | Auto | null;
  /**
   * The labelMinPositionFraction bound applied only to series values below the
   * base value (use "auto" to inherit labelMinPositionFraction, null for none).
   *
   * @default "auto"
   */
  labelBelowBaseMinPositionFraction: number | Auto | null;
  /**
   * The labelMaxPositionFraction bound applied only to series values below the
   * base value (use "auto" to inherit labelMaxPositionFraction, null for none).
   *
   * @default "auto"
   */
  labelBelowBaseMaxPositionFraction: number | Auto | null;
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
   * The style of the series shape.
   *
   * @default { normal: { … }, focused: { … }, defocused: { … } }
   */
  shapeStyle: StyleStates<SeriesColor>;
  /**
   * The minimum marker size (in pixels) to use when interpolating the marker
   * size based on a marker property value.
   *
   * @default 1
   */
  markerMinSize: number;
  /**
   * The maximum marker size (in pixels) to use when interpolating the marker
   * size based on a marker property value, or the marker size when no marker
   * property is used.
   *
   * @default 6
   */
  markerSize: number;
  /**
   * The scale used to interpolate marker sizes from marker property values
   * ("sqrt" scales the marker area with the value, "linear" scales its
   * diameter).
   *
   * @default "sqrt"
   */
  markerSizeScale: MarkerSizeScale;
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
   * The style of the series marker.
   *
   * @default { normal: { … }, focused: { … }, defocused: { … } }
   */
  markerStyle: StyleStates<SeriesColor>;
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
   * - `false` — when shapeStyle.normal.strokeColor or
   *   shapeStyle.normal.fillColor is categoryIndex
   * - `true` — when neither shapeStyle.normal.strokeColor nor
   *   shapeStyle.normal.fillColor is categoryIndex
   */
  showColorInLegend: boolean;
  /**
   * Whether to show the series color as an icon next to the series title in the
   * tooltip.
   *
   * Default:
   * - `false` — when shapeStyle.normal.strokeColor or
   *   shapeStyle.normal.fillColor is categoryIndex
   * - `true` — when neither shapeStyle.normal.strokeColor nor
   *   shapeStyle.normal.fillColor is categoryIndex
   */
  showColorInTooltip: boolean;
  /**
   * Whether or not the series can be filtered out of the chart via the legend
   * or tooltip.
   *
   * @default true
   */
  filterable: boolean;
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
   * Whether the category should be focused whenever the user mouses over a
   * category of the series in the chart.
   *
   * @default false
   */
  focusCategoryOnMouseOver: boolean;
  /**
   * Whether the category should be focused whenever the user clicks/taps a
   * category of the series in the chart.
   *
   * @default false
   */
  focusCategoryOnClick: boolean;
  /**
   * Whether to show the pointer cursor when the user mouses over the series
   * shapes in the chart.
   *
   * Sets `cursor: pointer` on the series’ shapes (bars, markers, labels and
   * line/area paths — or its pie slices), advertising that clicking does
   * something. Typically paired with the `onSeriesClick`/`onSliceClick`
   * callbacks or `focusOnClick`, which make the shapes clickable but leave the
   * cursor unchanged by default.
   *
   * @default false
   */
  showPointer: boolean;
  /**
   * Whether to show the series as focused when the value axis it belongs to is
   * focused.
   *
   * @default true
   */
  useAxisFocus: boolean;
}

export interface SeriesStackConfig {
  /**
   * The unique identifier for the series stack so it can be referenced by
   * series that belong to it.
   *
   * Referenced by `series[].stack` to place series in this stack. Stacked
   * series draw on top of one another and animate as a single gapless unit —
   * each segment’s baseline follows the tweened top of the segment below it
   * throughout a transition.
   *
   * Default:
   * - `SS${index}` — series stack index
   */
  id: string;
  /**
   * The unique identifier of the value axis that the series stack belongs to.
   *
   * Default:
   * - `sole axis id` — value axis
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
   * with `series[].capOnlyStackOuter`.
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
   * The y1 property of the svg linear gradient.
   *
   * @default 0
   */
  y1: number;
  /**
   * The y2 property of the svg linear gradient.
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
  /** The list of svg gradient stops, with offset, color and opacity properties. */
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
  /** The list of svg gradient stops, with offset, color and opacity properties. */
  stops?: GradientStop[];
}

export interface ConfigValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export type ConfigDiagnosticSeverity = 'error' | 'warning';

export interface ConfigDiagnostic {
  path: (string | number)[];
  severity: ConfigDiagnosticSeverity;
  message: string;
  /** The offending key names (capped) when the message reports invalid properties. */
  invalidProperties?: string[];
  source: 'mochart';
}

export interface DetailedConfigValidation extends ConfigValidation {
  diagnostics: ConfigDiagnostic[];
}

/** The fully built config returned by buildMochartConfig (all defaults applied). */
export interface MochartConfig {
  id?: unknown;
  accessibility: AccessibilityConfig;
  animation: AnimationConfig;
  chart: ChartConfig;
  colorPalette: ColorPaletteConfig;
  crosshair: CrosshairConfig;
  categoryAxis: CategoryAxisConfig;
  legend: LegendConfig;
  linearGradients: LinearGradientConfig[];
  pie: PieConfig;
  plot: PlotConfig;
  radialGradients: RadialGradientConfig[];
  valueAxes: ValueAxisConfig[];
  series: SeriesConfig[];
  seriesGroups: SeriesGroupConfig[];
  seriesStacks: SeriesStackConfig[];
  title: TitleConfig;
  tooltip: TooltipConfig;
  validation: ConfigValidation;
}

type OneOrMany<T> = T | T[];

/** Everything a config value can be that is a value rather than a structure. */
type ConfigLeaf = string | number | boolean | bigint | symbol | null | undefined;

/**
 * `Partial`, applied all the way down: a nested config object may be given with
 * only the members that differ from the default, because the config machinery
 * deep-merges each layer.
 *
 * Arrays are left alone rather than becoming arrays of partials — a `stops` or
 * `ticks` array replaces the default wholesale, so its entries are whole
 * entries. Primitives are left alone too, which is what keeps `SeriesColor`'s
 * `ColorMode | (string & {})` from being mangled into `{}`.
 */
export type DeepPartial<T> =
  T extends ConfigLeaf ? T :
  T extends (...args: any[]) => any ? T :
  T extends readonly any[] ? T :
  T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } :
  T;

/** The user-facing config accepted by buildMochartConfig, before defaults are applied. */
export interface MochartInputConfig {
  id?: unknown;
  /**
   * The config format version. Optional: when omitted the config is read as
   * the current format. Include it in configs you store or share, so future
   * releases can migrate them deterministically.
   */
  version?: string;
  accessibility?: DeepPartial<AccessibilityConfig>;
  animation?: DeepPartial<AnimationConfig>;
  chart?: DeepPartial<ChartConfig>;
  colorPalette?: DeepPartial<ColorPaletteConfig>;
  crosshair?: DeepPartial<CrosshairConfig>;
  categoryAxis?: DeepPartial<CategoryAxisConfig>;
  legend?: DeepPartial<LegendConfig>;
  pie?: DeepPartial<PieConfig>;
  plot?: DeepPartial<PlotConfig>;
  title?: DeepPartial<TitleConfig>;
  tooltip?: DeepPartial<TooltipConfig>;
  linearGradients?: OneOrMany<DeepPartial<LinearGradientConfig>>;
  linearGradientDefaults?: DeepPartial<LinearGradientConfig>;
  radialGradients?: OneOrMany<DeepPartial<RadialGradientConfig>>;
  radialGradientDefaults?: DeepPartial<RadialGradientConfig>;
  valueAxes?: OneOrMany<DeepPartial<ValueAxisConfig>>;
  valueAxisDefaults?: DeepPartial<ValueAxisConfig>;
  series?: OneOrMany<DeepPartial<SeriesConfig>>;
  seriesDefaults?: DeepPartial<SeriesConfig>;
  seriesGroups?: OneOrMany<DeepPartial<SeriesGroupConfig>>;
  seriesGroupDefaults?: DeepPartial<SeriesGroupConfig>;
  seriesStacks?: OneOrMany<DeepPartial<SeriesStackConfig>>;
  seriesStackDefaults?: DeepPartial<SeriesStackConfig>;
}
