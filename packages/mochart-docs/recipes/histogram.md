# Histogram

The `createHistogram` helper bins a plain array of numbers and returns
chart-ready rows plus the config fragments that make the bars read as a
histogram — contiguous, one bar per bin.

<script setup>
import * as histogram from '../examples/histogram'
</script>

<LiveChart :config="histogram.config" :data="histogram.data" demo="histogram" />

<<< @/examples/histogram.ts

## How it works

- `createHistogram(values, options)` picks the bins for you: roughly
  Sturges' count by default, with edges rounded to 1/2/5-style numbers.
  Override with `binCount` (approximate), `binWidth` (exact, wins over
  `binCount`), or `domain` to bin over a fixed range; `nice: false` divides
  the domain exactly instead of rounding.
- The returned `categoryAxisConfig` fragment uses an ordinal axis with
  [`categoryPaddingFraction`](/reference/categoryAxis#categoryAxis.categoryPaddingFraction)
  zeroed so the bars touch, which is what visually separates a histogram
  from a bar chart. (Bins are contiguous and equal width, so an ordinal
  axis positions them identically to a linear one — and on a linear category
  axis a bar always spans a single category *value*, which would leave
  multi-unit-wide bins as slivers.)
- `normalize` switches each bin's value from the raw `'count'` to
  `'probability'` (sums to 1) or `'density'` (integrates to 1), and
  `cumulative: true` accumulates the bins left to right. The default series
  title follows the mode; set `seriesTitle` to override it.
- Each data row also carries `binStart`, `binEnd`, `binCenter` and `count`,
  and the raw bin descriptions come back under `bins` — useful for custom
  tick labels via `binLabel` or annotations built alongside the chart.
- The lower-level `binValues(values, options)` returns just the bins with
  no chart fragments, for when you want the binning without the charting.
