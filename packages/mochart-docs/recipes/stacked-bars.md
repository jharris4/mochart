# Stacked bars

Series stack when they share a stack id from
[`seriesStackConfigs`](/reference/seriesStacks). With exactly one stack
configured, every series joins it automatically — declaring the stack is the
only wiring needed.

<script setup>
import * as stackedBars from '../examples/stackedBars'
</script>

<LiveChart :config="stackedBars.config" :data="stackedBars.data" :alt-data="stackedBars.altData" demo="stacked" />

Animate the data and watch the stack move as one unit: each segment's
baseline follows the tweened top of the segment below it, so the stack never
shows gaps mid-transition (see
[staged animation](/guide/staged-animation#gapless-stacked-animation)).

<<< @/examples/stackedBars.ts

## Variations

- Opt a series out of the stack with
  [`stack: null`](/reference/series#series.stack) — handy for
  overlaying a line on stacked bars.
- Cap only the top of the whole stack with
  [`outerCapType`](/reference/seriesStacks#seriesStacks.outerCapType)
  plus [`capOnlyStackOuter`](/reference/series#series.capOnlyStackOuter).
- Side-by-side (grouped) bars instead of stacked: declare a
  [`seriesGroupConfigs`](/reference/seriesGroups) entry rather than a
  stack — series default into a sole category the same way.
