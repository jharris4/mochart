# Pie and donut

Setting [`chartConfig.type`](/reference/chartConfig#chartConfig.type) to
`'pie'` renders the series as pie slices instead of an x/y plot. The
`createPie` helper builds the pieces from labelled values: every slice is its
own series, so the legend, focus and suppression behave exactly like the
other chart types.

<script setup>
import * as pie from '../examples/pie'
import * as donut from '../examples/donut'
import * as gauge from '../examples/gauge'
</script>

<LiveChart :config="pie.config" :data="pie.data" demo="pie" />

<<< @/examples/pie.ts

## How it works

- `createPie` returns config *fragments* (like the other chart-type
  helpers): a `chartConfig` fragment setting the type, a `groupAxisConfig`
  naming the single group column, and one series per slice. The data is a
  single row — `{ group: 'all', slice0: 420, slice1: 210, ... }`.
- **Slices are series.** Hovering a slice or its legend entry focuses it,
  and clicking a legend entry suppresses it — the remaining slices grow to
  fill the circle, animated with the usual
  [`animationConfig`](/reference/animationConfig) timing. Slice colors come
  from the [`colorPaletteConfig`](/reference/colorPaletteConfig) by series
  index, or from an explicit per-item `color`.
- On first load the pie sweeps in clockwise from the start angle over
  [`animationConfig.initialDuration`](/reference/animationConfig#animationConfig.initialDuration)
  (slice labels appear once the sweep settles). Setting
  [`focusOffsetPercent`](/reference/pieConfig#pieConfig.focusOffsetPercent)
  "explodes" the focused slice away from the center, animated by the focus
  tween — try hovering the legend on the donut below.
- Clicking the chart opens the tooltip with one row per slice. In pie mode
  [`tooltipConfig.snapToGroup`](/reference/tooltipConfig#tooltipConfig.snapToGroup)
  defaults to `false`, so the tooltip anchors at the click point, and
  [`tooltipConfig.showGroup`](/reference/tooltipConfig#tooltipConfig.showGroup)
  defaults to `false` — a pie has a single group, so its value (`createPie`
  writes `'all'`) would head every tooltip. Set `showGroup: true` with a
  meaningful `groupValue` if you want that line back.
- The group and series axes still exist structurally (the group column and
  value domains feed the data model and animations) but default to
  [`visible: false`](/reference/groupAxisConfig#groupAxisConfig.visible) in
  pie mode. The crosshair does not apply.
- Values must be non-negative: `createPie` clamps negatives to 0, and a
  zero-value slice simply doesn't render. Only the first data row is
  rendered.

## Donut and slice labels

An inner radius via
[`pieConfig.innerRadiusPercent`](/reference/pieConfig#pieConfig.innerRadiusPercent)
(or the helper's `donut` shorthand) turns the pie into a donut, and
[`pieConfig.showLabels`](/reference/pieConfig#pieConfig.showLabels) puts
value, percent or title labels at the slice centroids.

<LiveChart :config="donut.config" :data="donut.data" demo="donut" />

<<< @/examples/donut.ts

- [`labelType`](/reference/pieConfig#pieConfig.labelType) picks the label
  content: a single part (`'value'`, `'percent'` or `'title'`) or a
  combination — `'valuePercent'` for `420 (49%)`, `'percentValue'` for
  `49% (420)`, `'titleValue'` for `Subscriptions: 420` and `'titlePercent'`
  for `Subscriptions: 49%`.
  [`labelValueFormat`](/reference/pieConfig#pieConfig.labelValueFormat) and
  [`labelPercentFormat`](/reference/pieConfig#pieConfig.labelPercentFormat)
  format the two numeric parts independently (percent parts format the
  fraction, so specifiers like `'.1%'` apply). Slices thinner than
  [`labelMinAnglePercent`](/reference/pieConfig#pieConfig.labelMinAnglePercent)
  hide their labels. Label colors reuse the per-series `label*` config keys.
  When slices are suppressed via the legend, percent labels renormalize
  against the remaining slices — set
  [`adjustLabelsForSuppression`](/reference/pieConfig#pieConfig.adjustLabelsForSuppression)
  to `false` to keep every slice's share of the full total instead.
- [`tooltipValues`](/reference/pieConfig#pieConfig.tooltipValues) does the
  same for the tooltip rows: `'value'` (the default), `'percent'`, or the
  `'valuePercent'` / `'percentValue'` combinations. The value part keeps its
  per-series formatting
  ([`valueFormat`](/reference/seriesConfigs#seriesConfigs.valueFormat),
  `valuePrefix`, `valueSuffix`); the percent part is formatted by
  [`tooltipPercentFormat`](/reference/pieConfig#pieConfig.tooltipPercentFormat).
  The helper's `tooltipValues` option forwards straight to it.
- Tooltip percentages are computed from the same slice shares as the labels,
  so they renormalize as slices are suppressed — set
  [`tooltipConfig.adjustForSuppression`](/reference/tooltipConfig#tooltipConfig.adjustForSuppression)
  to `false` to keep every slice's share of the full total (the tooltip
  equivalent of `adjustLabelsForSuppression`). A suppressed slice's own row
  shows the usual
  [`suppressedValueCharacter`](/reference/tooltipConfig#tooltipConfig.suppressedValueCharacter)
  placeholder in place of both parts.
- Geometry knobs: [`startAngle`](/reference/pieConfig#pieConfig.startAngle)
  rotates the first slice's starting edge,
  [`padAngle`](/reference/pieConfig#pieConfig.padAngle) opens a gap between
  slices, and [`cornerRadius`](/reference/pieConfig#pieConfig.cornerRadius)
  rounds the slice corners.

## Half pies and gauges

[`endAngle`](/reference/pieConfig#pieConfig.endAngle) defaults to
`startAngle + 360` (a full circle, so rotating with `startAngle` alone never
truncates the pie); setting it explicitly confines the slices to a partial
span. With `startAngle: -90` and `endAngle: 90` the pie becomes a half-donut
gauge — an `endAngle` *smaller* than `startAngle` runs counterclockwise.

<LiveChart :config="gauge.config" :data="gauge.data" demo="gauge" />

<<< @/examples/gauge.ts

- [`centerLabel`](/reference/pieConfig#pieConfig.centerLabel) puts a text
  line at the circle center, and
  [`showCenterTotal`](/reference/pieConfig#pieConfig.showCenterTotal) adds
  the live total of the unsuppressed slice values, formatted by
  [`centerTotalFormat`](/reference/pieConfig#pieConfig.centerTotalFormat) —
  it counts along with value tweens and suppression (click a legend entry).
  Set
  [`adjustCenterTotalForSuppression`](/reference/pieConfig#pieConfig.adjustCenterTotalForSuppression)
  to `false` to keep the full total while slices are suppressed.
- The center content sits at the circle center (the gauge pivot);
  [`centerOffsetXPercent`](/reference/pieConfig#pieConfig.centerOffsetXPercent)
  and
  [`centerOffsetYPercent`](/reference/pieConfig#pieConfig.centerOffsetYPercent)
  nudge it by fractions of the outer radius — the example's `-0.25` lifts it
  into the hole.
- The center text carries no fill attribute, so it styles via CSS: target
  `.mochart-pie-center text` (the demo dark theme does exactly this).
- The layout fits the *configured span's* bounding box into the plot, so a
  half pie uses the space its missing half would waste (and the radius
  grows accordingly) instead of staying centered in an empty square. The
  span comes from the config, so the fit holds still while values animate.
