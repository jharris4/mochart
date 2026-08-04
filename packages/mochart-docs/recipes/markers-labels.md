# Markers and labels

Markers draw a shape at each value of a series; labels render a data value
next to each shape. Both are per-series config.

<script setup>
import * as markersLabels from '../examples/markersLabels'
import * as scatterBubble from '../examples/scatterBubble'
</script>

<LiveChart :config="markersLabels.config" :data="markersLabels.data" />

<<< @/examples/markersLabels.ts

## How it works

- [`markerShape`](/reference/series#series.markerShape) picks
  from `circle`, `cross`, `diamond`, `square`, `star`, `triangle`, `wye`;
  [`markerSize`](/reference/series#series.markerSize) sets its
  size and
  [`markerStyle`](/reference/series#series.markerStyle) paints
  it — a `normal`/`focused`/`defocused` set of stroke and fill colors,
  opacities and widths. Point
  [`markerProperty`](/reference/series#series.markerProperty)
  at a data property to scale marker size per value — bubble charts.
- Labels come from
  [`labelProperty`](/reference/series#series.labelProperty) —
  point it at the series' own `property` (as above) for value labels, or at
  any other data property.
  [`labelFormat`](/reference/series#series.labelFormat)
  formats the value (`"auto"` derives from the data).
- [`labelPosition`](/reference/series#series.labelPosition)
  places labels `inside`, `center`, or `outside` the shape, and the
  `labelMin*Fraction` guards hide labels that wouldn't fit (the
  `labelMinRangeFraction` above hides labels on bars shorter than 5% of the
  axis).
- [`labelTextStyle`](/reference/series#series.labelTextStyle)
  paints the label text, again per focus state. Its colors accept the palette
  modes (`series`, `seriesIndex`, `categoryIndex`) as well as literal colors —
  see [`colorPalette`](/reference/colorPalette). The example above
  sets only
  [`labelTextStyle.normal`](/reference/series#series.labelTextStyle.normal)`.strokeColor`
  and `.fillColor`; every other member, including both other states, keeps its
  default.

## Scatter and bubble charts

Markers on their own make a scatter chart: set
[`renderer`](/reference/series#series.renderer) to `none` so a
series draws no shape, and only its markers remain.

<LiveChart :config="scatterBubble.config" :data="scatterBubble.data" demo="scatter" />

<<< @/examples/scatterBubble.ts

- Use a `linear` category axis
  [`scale`](/reference/categoryAxis#categoryAxis.scale) (with `number`
  or `date` [`type`](/reference/categoryAxis#categoryAxis.type)) so
  points are positioned by their measured x values rather than evenly spaced
  category slots.
- For bubbles, point
  [`markerProperty`](/reference/series#series.markerProperty)
  at a data property; marker sizes scale between
  [`markerMinSize`](/reference/series#series.markerMinSize) and
  [`markerSize`](/reference/series#series.markerSize) with the
  property's value.
- Every series reads its x from the row's category value, so series share x
  positions. For series with points at different x values, give each x its
  own row and leave the other series' properties out — a row draws a marker
  only for the series that have a value there.
