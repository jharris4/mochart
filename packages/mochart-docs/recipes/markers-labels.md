# Markers and labels

Markers draw a shape at each value of a series; labels render a data value
next to each shape. Both are per-series config.

<script setup>
import * as markersLabels from '../examples/markersLabels'
import * as scatterBubble from '../examples/scatterBubble'
</script>

<LiveChart :config="markersLabels.config" :data="markersLabels.data" demo="label-property-stacked" />

<<< @/examples/markersLabels.ts

## How it works

- [`markerShape`](/reference/series#series.markerShape) picks from `circle`,
  `cross`, `diamond`, `square`, `star`, `triangle` and `wye`; `line`, `area`
  and `none` series default to `circle`, bars to `null` (no marker).
  [`markerSize`](/reference/series#series.markerSize) sets the size (default
  6px) and [`markerStyle`](/reference/series#series.markerStyle) styles it —
  stroke and fill colors, opacities and widths per `normal`/`focused`/
  `defocused` state. Point
  [`markerProperty`](/reference/series#series.markerProperty) at a data
  property to scale marker size per value — see
  [bubbles](#scatter-and-bubble-charts) below.
- Labels come from [`labelProperty`](/reference/series#series.labelProperty)
  — point it at the series' own `property` (as above) for value labels, or
  at any other data property.
  [`labelFormat`](/reference/series#series.labelFormat) formats the value
  (`"auto"` derives a format from the data), and
  [`labelPrefix`](/reference/series#series.labelPrefix) /
  [`labelSuffix`](/reference/series#series.labelSuffix) wrap it with text a
  d3 format can't express, such as a unit. They are separate from the
  tooltip's [`valuePrefix`](/reference/series#series.valuePrefix) /
  [`valueSuffix`](/reference/series#series.valueSuffix) because a label may
  show a different property than the series value.
- [`labelPosition`](/reference/series#series.labelPosition) places labels
  `inside`, `center` (the default) or `outside` the shape, and
  [`labelOffset`](/reference/series#series.labelOffset) nudges every label by
  a fixed pixel amount along the value axis.
- Three fraction guards hide labels that wouldn't fit:
  [`labelMinRangeFraction`](/reference/series#series.labelMinRangeFraction)
  (used above — it hides labels on bars shorter than 5% of the axis extent),
  and
  [`labelMinPositionFraction`](/reference/series#series.labelMinPositionFraction) /
  [`labelMaxPositionFraction`](/reference/series#series.labelMaxPositionFraction),
  which hide labels whose values sit too close to the domain's minimum or
  maximum.
- `labelPosition`, `labelOffset` and the two position-fraction guards each
  have `labelAboveBase*` / `labelBelowBase*` variants
  ([`labelAboveBasePosition`](/reference/series#series.labelAboveBasePosition),
  [`labelBelowBaseOffset`](/reference/series#series.labelBelowBaseOffset), …)
  that apply only to values above or below the value axis
  [`base`](/reference/valueAxes#valueAxes.base) — handy for labeling positive
  and negative bars differently. Their default `'auto'` inherits the plain
  setting (the below-base offset mirrors it, so labels move away from the
  base on both sides).
- [`labelTextStyle`](/reference/series#series.labelTextStyle) styles the
  label text, again per focus state. Its colors accept the palette modes
  (`series`, `seriesIndex`, `categoryIndex`) as well as literal colors — see
  [`colorPalette`](/reference/colorPalette). The example above sets only
  [`labelTextStyle.normal`](/reference/series#series.labelTextStyle.normal)`.strokeColor`
  and `.fillColor`; every other member, including both other states, keeps
  its default.

## Scatter and bubble charts

Markers on their own make a scatter chart: set
[`renderer`](/reference/series#series.renderer) to `none` so a series draws
no shape, and only its markers remain.

<LiveChart :config="scatterBubble.config" :data="scatterBubble.data" demo="scatter" />

<<< @/examples/scatterBubble.ts

- Use a `linear` category axis
  [`scale`](/reference/categoryAxis#categoryAxis.scale) (with `number` or
  `date` [`type`](/reference/categoryAxis#categoryAxis.type)) so points are
  positioned by their measured x values rather than evenly spaced category
  slots.
- For bubbles, point
  [`markerProperty`](/reference/series#series.markerProperty) at a data
  property; marker sizes scale between
  [`markerMinSize`](/reference/series#series.markerMinSize) (default 1px) and
  [`markerSize`](/reference/series#series.markerSize) with the property's
  value.
- [`markerSizeScale`](/reference/series#series.markerSizeScale) picks how
  they scale: the default `sqrt` scales each marker's **area** with its value
  — the way readers judge bubble magnitude — while `linear` scales its
  diameter, which visually exaggerates differences. The `markerMinSize` floor
  keeps the smallest bubble visible (and hoverable); for exactly
  value-proportional areas, set it to `0` on data whose minimum is `0`.
- Every series reads its x from the row's category value, so series share x
  positions. For series with points at different x values, give each x its
  own row and leave the other series' properties out — a row draws a marker
  only for the series that have a value there.
