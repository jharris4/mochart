# Date axis

Time-series data uses a group axis with
[`type: 'date'`](/reference/groupAxisConfig#groupAxisConfig.type). Combined
with [`scale: 'linear'`](/reference/groupAxisConfig#groupAxisConfig.scale),
each point is positioned by its actual date — note the uneven horizontal
spacing below matching the gaps in the data.

<script setup>
import * as dateAxis from '../examples/dateAxis'
</script>

<LiveChart :config="dateAxis.config" :data="dateAxis.data" />

<<< @/examples/dateAxis.ts

## How it works

- Date values in the data can be ISO strings (as here) or `Date` objects;
  [`dateUTC`](/reference/groupAxisConfig#groupAxisConfig.dateUTC) controls
  whether they're interpreted as UTC or local time.
- [`tickLabelFormat`](/reference/groupAxisConfig#groupAxisConfig.tickLabelFormat)
  takes a d3 time-format string for date axes (`'%b %d'` → "Jun 01").
- With `scale: 'ordinal'` instead, dates are spaced evenly in data order —
  useful when the gaps are noise (e.g. trading days).
- The `area` renderer fills to the series axis base; swap in `line` or `bar`
  per series via
  [`renderer`](/reference/seriesConfigs#seriesConfigs.renderer).
