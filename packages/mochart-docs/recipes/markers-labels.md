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

- [`markerShape`](/reference/seriesConfigs#seriesConfigs.markerShape) picks
  from `circle`, `cross`, `diamond`, `square`, `star`, `triangle`, `wye`;
  [`markerSize`](/reference/seriesConfigs#seriesConfigs.markerSize) sets its
  size and the `marker*` color/opacity properties style it. Point
  [`markerProperty`](/reference/seriesConfigs#seriesConfigs.markerProperty)
  at a data property to scale marker size per value — bubble charts.
- Labels come from
  [`labelProperty`](/reference/seriesConfigs#seriesConfigs.labelProperty) —
  point it at the series' own `property` (as above) for value labels, or at
  any other data property.
  [`labelFormat`](/reference/seriesConfigs#seriesConfigs.labelFormat)
  formats the value (`"auto"` derives from the data).
- [`labelPosition`](/reference/seriesConfigs#seriesConfigs.labelPosition)
  places labels `inside`, `center`, or `outside` the shape, and the
  `labelMin*Percent` guards hide labels that wouldn't fit (the
  `labelMinRangePercent` above hides labels on bars shorter than 5% of the
  axis).
- Label colors accept the palette modes (`series`, `seriesIndex`,
  `groupIndex`) as well as literal colors — see
  [`colorPaletteConfig`](/reference/colorPaletteConfig).

## Scatter and bubble charts

Markers on their own make a scatter chart: set
[`renderer`](/reference/seriesConfigs#seriesConfigs.renderer) to `none` so a
series draws no shape, and only its markers remain.

<LiveChart :config="scatterBubble.config" :data="scatterBubble.data" demo="scatter" />

<<< @/examples/scatterBubble.ts

- Use a `linear` group axis
  [`scale`](/reference/groupAxisConfig#groupAxisConfig.scale) (with `number`
  or `date` [`type`](/reference/groupAxisConfig#groupAxisConfig.type)) so
  points are positioned by their measured x values rather than evenly spaced
  category slots.
- For bubbles, point
  [`markerProperty`](/reference/seriesConfigs#seriesConfigs.markerProperty)
  at a data property; marker sizes scale between
  [`minMarkerSize`](/reference/seriesConfigs#seriesConfigs.minMarkerSize) and
  [`markerSize`](/reference/seriesConfigs#seriesConfigs.markerSize) with the
  property's value.
- Every series reads its x from the row's group value, so series share x
  positions. For series with points at different x values, give each x its
  own row and leave the other series' properties out — a row draws a marker
  only for the series that have a value there.
