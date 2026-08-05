# Pie and donut

Setting [`chart.type`](/reference/chart#chart.type) to
`'pie'` renders the series as pie slices instead of an x/y plot. The
`createPie` helper builds the pieces from labelled values: every slice is its
own series, so the legend, focus and filtering behave exactly like the
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
  helpers): a `chart` fragment setting the type, a `categoryAxis`
  naming the single category column, and one series per slice. The data is a
  single row — `{ category: 'all', slice0: 420, slice1: 210, ... }`.
- **Slices are series.** Hovering a slice or its legend entry focuses it,
  and clicking a legend entry filters it — the remaining slices grow to
  fill the circle, animated with the usual
  [`animation`](/reference/animation) timing. Slice colors come
  from the [`colorPalette`](/reference/colorPalette) by series
  index, or from an explicit per-item `color`.
- On first load the pie sweeps in clockwise from the start angle over
  [`animation.initialDuration`](/reference/animation#animation.initialDuration)
  (slice labels appear once the sweep settles). Setting
  [`focusOffsetFraction`](/reference/pie#pie.focusOffsetFraction)
  "explodes" the focused slice away from the center, animated by the focus
  tween — try hovering the legend on the donut below.
- Clicking the chart opens the tooltip with one row per slice. In pie mode
  [`tooltip.snapToCategory`](/reference/tooltip#tooltip.snapToCategory)
  defaults to `false`, so the tooltip anchors at the click point, and
  [`tooltip.showCategory`](/reference/tooltip#tooltip.showCategory)
  defaults to `false` — a pie has a single category, so its value (`createPie`
  writes `'all'`) would head every tooltip. Set `showCategory: true` with a
  meaningful `categoryValue` if you want that line back.
- The category and value axes still exist structurally (the category column and
  value domains feed the data model and animations) but default to
  [`visible: false`](/reference/categoryAxis#categoryAxis.visible) in
  pie mode. The crosshair does not apply.
- Values must be non-negative: `createPie` clamps negatives to 0, and a
  zero-value slice simply doesn't render. Only the first data row is
  rendered.

## Donut and slice labels

An inner radius via
[`pie.innerRadiusFraction`](/reference/pie#pie.innerRadiusFraction)
(or the helper's `donut` shorthand) turns the pie into a donut, and
[`pie.showLabels`](/reference/pie#pie.showLabels) puts
value, percent or title labels at the slice centroids.

<LiveChart :config="donut.config" :data="donut.data" demo="donut" />

<<< @/examples/donut.ts

- [`labelType`](/reference/pie#pie.labelType) picks the label
  content: a single part (`'value'`, `'percent'` or `'title'`) or a
  combination — `'valuePercent'` for `420 (45%)`, `'percentValue'` for
  `45% (420)`, `'titleValue'` for `Subscriptions: 420` and `'titlePercent'`
  for `Subscriptions: 45%`.
  [`labelValueFormat`](/reference/pie#pie.labelValueFormat) and
  [`labelPercentFormat`](/reference/pie#pie.labelPercentFormat)
  format the two numeric parts independently (percent parts format the
  fraction, so specifiers like `'.1%'` apply). Slices thinner than
  [`labelMinFraction`](/reference/pie#pie.labelMinFraction)
  hide their labels. Label colors reuse the per-series
  [`labelTextStyle`](/reference/series#series.labelTextStyle)
  style — each slice is a series, so a slice's label is painted by its own
  series entry.
  When slices are filtered via the legend, percent labels renormalize
  against the remaining slices — set
  [`adjustLabelsForFiltering`](/reference/pie#pie.adjustLabelsForFiltering)
  to `false` to keep every slice's share of the full total instead.
- [`tooltipValues`](/reference/pie#pie.tooltipValues) does the
  same for the tooltip rows: `'value'` (the default), `'percent'`, or the
  `'valuePercent'` / `'percentValue'` combinations. The value part keeps its
  per-series formatting
  ([`valueFormat`](/reference/series#series.valueFormat),
  `valuePrefix`, `valueSuffix`); the percent part is formatted by
  [`tooltipPercentFormat`](/reference/pie#pie.tooltipPercentFormat).
  The helper's `tooltipValues` option forwards straight to it.
- Tooltip percentages are computed from the same slice shares as the labels,
  so they renormalize as slices are filtered — set
  [`tooltip.adjustForFiltering`](/reference/tooltip#tooltip.adjustForFiltering)
  to `false` to keep every slice's share of the full total (the tooltip
  equivalent of `adjustLabelsForFiltering`). A filtered slice's own row
  shows the usual
  [`filteredValueCharacter`](/reference/tooltip#tooltip.filteredValueCharacter)
  placeholder in place of both parts.
- Geometry knobs: [`startAngle`](/reference/pie#pie.startAngle)
  rotates the first slice's starting edge,
  [`padAngle`](/reference/pie#pie.padAngle) opens a gap between
  slices, and [`cornerRadius`](/reference/pie#pie.cornerRadius)
  rounds the slice corners.

## Half pies and gauges

[`endAngle`](/reference/pie#pie.endAngle) defaults to
`startAngle + 360` (a full circle, so rotating with `startAngle` alone never
truncates the pie); setting it explicitly confines the slices to a partial
span. With `startAngle: -90` and `endAngle: 90` the pie becomes a half-donut
gauge — an `endAngle` *smaller* than `startAngle` runs counterclockwise.

<LiveChart :config="gauge.config" :data="gauge.data" demo="gauge" />

<<< @/examples/gauge.ts

- [`centerLabel`](/reference/pie#pie.centerLabel) puts a text
  line at the circle center, and
  [`showCenterTotal`](/reference/pie#pie.showCenterTotal) adds
  the live total of the unfiltered slice values, formatted by
  [`centerTotalFormat`](/reference/pie#pie.centerTotalFormat) —
  it counts along with value tweens and filtering (click a legend entry).
  Set
  [`adjustCenterTotalForFiltering`](/reference/pie#pie.adjustCenterTotalForFiltering)
  to `false` to keep the full total while slices are filtered.
- The center content sits at the circle center (the gauge pivot);
  [`centerOffsetXFraction`](/reference/pie#pie.centerOffsetXFraction)
  and
  [`centerOffsetYFraction`](/reference/pie#pie.centerOffsetYFraction)
  nudge it by fractions of the outer radius — the example's `-0.25` lifts it
  into the hole.
- The center text is styled by
  [`centerLabelTextStyle`](/reference/pie#pie.centerLabelTextStyle)
  and
  [`centerTotalTextStyle`](/reference/pie#pie.centerTotalTextStyle),
  both defaulting to `fillColor: 'currentColor'` so the text follows the host
  page's CSS `color`. It can also be restyled directly: CSS wins over the
  presentation attribute, so targeting `.mochart-pie-center text` works (the
  demo dark theme does exactly this).
- The layout fits the *configured span's* bounding box into the plot, so a
  half pie uses the space its missing half would waste (and the radius
  grows accordingly) instead of staying centered in an empty square. The
  span comes from the config, so the fit holds still while values animate.
