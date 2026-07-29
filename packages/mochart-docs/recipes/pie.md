# Pie and donut

Setting [`chartConfig.type`](/reference/chartConfig#chartConfig.type) to
`'pie'` renders the series as pie slices instead of an x/y plot. The
`createPie` helper builds the pieces from labelled values: every slice is its
own series, so the legend, focus and suppression behave exactly like the
other chart types.

<script setup>
import * as pie from '../examples/pie'
import * as donut from '../examples/donut'
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
- Clicking the chart opens the tooltip with one row per slice. In pie mode
  [`tooltipConfig.snapToGroup`](/reference/tooltipConfig#tooltipConfig.snapToGroup)
  defaults to `false`, so the tooltip anchors at the click point.
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
  content (`'value'`, `'percent'` or `'title'`) and
  [`labelFormat`](/reference/pieConfig#pieConfig.labelFormat) formats it
  (percent labels format the fraction, so specifiers like `'.1%'` apply).
  Slices thinner than
  [`labelMinAnglePercent`](/reference/pieConfig#pieConfig.labelMinAnglePercent)
  hide their labels. Label colors reuse the per-series `label*` config keys.
- With `tooltipValues: 'percent'` the helper precomputes each slice's share
  into the data row and points
  [`tooltipProperty`](/reference/seriesConfigs#seriesConfigs.tooltipProperty)
  at it, so the tooltip shows percentages. The percents reflect the values
  passed to the helper — not any later suppression.
- Geometry knobs: [`startAngle`](/reference/pieConfig#pieConfig.startAngle)
  rotates the first slice's starting edge,
  [`padAngle`](/reference/pieConfig#pieConfig.padAngle) opens a gap between
  slices, and [`cornerRadius`](/reference/pieConfig#pieConfig.cornerRadius)
  rounds the slice corners.
