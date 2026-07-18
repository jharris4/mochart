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

- [`threshold`](/reference/seriesAxisConfigs#seriesAxisConfigs.threshold) on
  a value axis draws a line at that value;
  [`thresholdTitle`](/reference/seriesAxisConfigs#seriesAxisConfigs.thresholdTitle)
  labels it, and the `threshold*` properties style the line, title, and
  their focused/defocused variants. The group axis supports the same
  threshold properties for a vertical reference line.
- The band is an ordinary `area` series with
  [`rangeProperty`](/reference/seriesConfigs#seriesConfigs.rangeProperty):
  the shape spans from the `rangeProperty` value (here `p5`) to the
  `property` value (`p95`) instead of starting at the axis base. Dropping
  `strokeOpacity` to 0 and `fillOpacity` low keeps it as background context.
- The axis grows to fit the threshold if the data alone wouldn't reach it —
  use [`softMax`](/reference/seriesAxisConfigs#seriesAxisConfigs.softMax) to
  guarantee headroom above it.
