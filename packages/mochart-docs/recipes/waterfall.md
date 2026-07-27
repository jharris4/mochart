# Waterfall

The `createWaterfall` helper accumulates a list of signed steps into
floating bars: increases and decreases ride the running total, and **total**
steps drop a full bar back to the base.

<script setup>
import * as waterfall from '../examples/waterfall'
</script>

<LiveChart :config="waterfall.config" :data="waterfall.data" />

<<< @/examples/waterfall.ts

## How it works

- Each item is `{ label, value }` for a delta step, or
  `{ label, total: true }` for a total bar showing the running total so far
  (give a total a `value` to reset the running total, e.g. an audited
  closing balance).
- The floating bars are three ordinary `bar` series — increase, decrease,
  total — all spanning from the shared `start` property via
  [`rangeProperty`](/reference/seriesConfigs#seriesConfigs.rangeProperty).
  Every row carries a value for exactly one of them, and
  [`skipMissing`](/reference/seriesConfigs#seriesConfigs.skipMissing) keeps
  the other two from rendering, so each slot shows one full-width bar while
  the legend still names the three directions.
- The default direction colors are aqua/red/blue rather than the
  conventional green/red: green↔red is the classic red-green-blindness
  collision, while this triple keeps every pair distinguishable on light
  and dark surfaces. Override per direction with `colors`, and rename the
  series with `seriesTitles`.
- `base` sets the value the running total starts from and total bars span
  from (default 0). When it's not 0, also set the series axis
  [`base`](/reference/seriesAxisConfigs#seriesAxisConfigs.base) so delta
  bars near it read correctly.
- Each row also carries `delta`, `cumulative` and `direction`, and the
  computed steps come back under `steps` — or call
  `computeWaterfallSteps(items, base)` alone for the math without the
  chart fragments.
