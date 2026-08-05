# Thresholds and ranges

Two ways to show reference context around your values: a **threshold line**
drawn at a fixed value on an axis, and a **range series** that fills the band
between two data properties.

<script setup>
import * as thresholdRange from '../examples/thresholdRange'
</script>

<LiveChart :config="thresholdRange.config" :data="thresholdRange.data" />

<<< @/examples/thresholdRange.ts

## How it works

- [`thresholds`](/reference/valueAxes#valueAxes.thresholds) on
  a value axis draws reference lines: one entry per line, each with a `value`,
  an optional `title` label beside it, and a `style` styling the line —
  colors, width and dash array, each in its `normal`, `focused` and
  `defocused` states. The entry's `titleSide`, `titleTextStyle` and the other
  `title*` members cover the label's placement and styling, and several
  entries draw several lines. The category axis supports the same `thresholds`
  property for vertical reference lines (with a linear scale).
- The band is an ordinary `area` series with
  [`rangeProperty`](/reference/series#series.rangeProperty):
  the shape spans from the `rangeProperty` value (here `p5`) to the
  `property` value (`p95`) instead of starting at the axis base. Dropping
  [`shapeStyle.normal.strokeOpacity`](/reference/series#series.shapeStyle.normal.strokeOpacity)
  to 0 and
  [`fillOpacity`](/reference/series#series.shapeStyle.normal.fillOpacity)
  low keeps it as background context — the shape's colors and its focused and
  defocused states are left at their defaults.
- The axis grows to fit the threshold if the data alone wouldn't reach it —
  use [`softMax`](/reference/valueAxes#valueAxes.softMax) to
  guarantee headroom above it.
