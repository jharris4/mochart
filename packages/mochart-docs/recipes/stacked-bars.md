# Stacked bars

Series stack when they share a stack id from
[`seriesStackConfigs`](/reference/seriesStackConfigs). With exactly one stack
configured, every series joins it automatically — declaring the stack is the
only wiring needed.

<script setup>
import * as stackedBars from '../examples/stackedBars'
</script>

<LiveChart :config="stackedBars.config" :data="stackedBars.data" :alt-data="stackedBars.altData" />

Animate the data and watch the stack move as one unit: each segment's
baseline follows the tweened top of the segment below it, so the stack never
shows gaps mid-transition (see
[staged animation](/guide/staged-animation#gapless-stacked-animation)).

<<< @/examples/stackedBars.ts

## Variations

- Opt a series out of the stack with
  [`stack: null`](/reference/seriesConfigs#seriesConfigs.stack) — handy for
  overlaying a line on stacked bars.
- Cap only the top of the whole stack with
  [`outerCapType`](/reference/seriesStackConfigs#seriesStackConfigs.outerCapType)
  plus [`capOnlyStackOuter`](/reference/seriesConfigs#seriesConfigs.capOnlyStackOuter).
- Side-by-side (grouped) bars instead of stacked: declare a
  [`seriesGroupConfigs`](/reference/seriesGroupConfigs) entry rather than a
  stack — series default into a sole group the same way.
