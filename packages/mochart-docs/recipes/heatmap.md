# Heatmap

The `createHeatmap` helper turns a grid of values into heatmap pieces: rows
become full-width bar series stacked on a row-labelled axis, and each cell's
value colors it from a shared sequential ramp.

<script setup>
import * as heatmap from '../examples/heatmap'
</script>

<LiveChart :config="heatmap.config" :data="heatmap.data" demo="heatmap" />

<<< @/examples/heatmap.ts

## How it works

- Each row is a `bar` series floating on a fixed one-unit band of the
  series axis via
  [`rangeProperty`](/reference/series#series.rangeProperty)
  (`rows[0]` on top). The returned `valueAxisConfig` pins the axis to
  exactly the stacked bands and labels each band's center with the row name
  through explicit
  [`ticks`](/reference/valueAxes#valueAxes.ticks) (auto
  numeric ticks would land on the band edges and mislabel the rows). The
  row series stay out of the legend
  ([`showInLegend: false`](/reference/series#series.showInLegend))
  — hiding a row from a legend would read as missing data, and a color-ramp
  strip built from `colorScale` makes the better legend.
- Cell colors come from
  [`colorProperty`](/reference/series#series.colorProperty):
  each cell's value drives its fill. The core color scale spans each
  series' *own* extent, so the helper sets every row's
  [`colorScale.min`](/reference/series#series.colorScale.min)/[`colorScale.max`](/reference/series#series.colorScale.max)
  to the global ramp sampled at that row's min/max — keeping cell colors
  comparable across rows. The default ramp is a light-to-dark sequential
  blue; override it with the helper's `colorMin`, `colorMax` and
  `colorInterpolation` options (which land in each row's `colorScale`), or
  fix the scale across datasets with `domain`.
- Each series sets
  [`tooltipProperty`](/reference/series#series.tooltipProperty)
  to the cell value, so the tooltip shows the value driving the color
  rather than the cell's band coordinates —
  [`valueFormat`](/reference/series#series.valueFormat)
  formats it as usual.
- `null`/`undefined` cells leave a gap in the grid:
  [`missingValues: 'connect'`](/reference/series#series.missingValues) skips
  them without disturbing their neighbours. `cellPadding` sets the gap
  between cells (0 for a contiguous grid), and `columnLabels` names the
  columns (defaults to 1-based numbers).
- The returned `colorScale` maps any value to its hex color and `domain`
  is the scaled extent — the pieces you need to render a color-ramp legend
  next to the chart. `createHeatmapColorScale(domain, options)` builds the
  same scale standalone.
