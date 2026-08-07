# Positive and negative values

Values below zero need one thing decided: where bars grow from. Pin
[`base`](/reference/valueAxes#valueAxes.base) to `0` and
everything else — bar direction, label placement, caps, stacking — follows
the sign on its own.

<script setup>
import * as posNeg from '../examples/posNeg'
import * as posNegStacked from '../examples/posNegStacked'
</script>

<LiveChart :config="posNeg.config" :data="posNeg.data" demo="picket-pos-neg" />

<<< @/examples/posNeg.ts

## How it works

- Without stacks, [`base`](/reference/valueAxes#valueAxes.base)
  defaults to `null` — the axis domain minimum — so mixed-sign bars would all
  grow upward from the most negative value. `base: 0` makes bars grow out of
  zero in both directions, and the divide is marked by the default base line
  ([`showBaseLine`](/reference/valueAxes#valueAxes.showBaseLine),
  styled with
  [`baseLineStyle`](/reference/valueAxes#valueAxes.baseLineStyle)).
- The domain fits the data on both sides. When the values might sit all on
  one side, [`softMin`](/reference/valueAxes#valueAxes.softMin) /
  [`softMax`](/reference/valueAxes#valueAxes.softMax) `0` hold
  zero in view without ever clipping data — unlike
  [`min`](/reference/valueAxes#valueAxes.min)/[`max`](/reference/valueAxes#valueAxes.max),
  which clamp hard.
- Labels flip with the sign: an `outside`
  [`labelPosition`](/reference/series#series.labelPosition) sits
  above positive bars and below negative ones automatically. Each side can be
  tuned separately with the `labelAboveBase*` / `labelBelowBase*` family —
  [position](/reference/series#series.labelAboveBasePosition),
  [offset](/reference/series#series.labelAboveBaseOffset), and
  [min](/reference/series#series.labelAboveBaseMinPositionFraction)/[max](/reference/series#series.labelAboveBaseMaxPositionFraction)
  position bounds — whose `auto` defaults inherit the shared knobs.
- The sign carries through the other bar features:
  [caps](/recipes/bar-caps) point downward on negative bars, and
  [`colorScale.base.value: 0`](/recipes/color-by-value#diverging-around-a-base)
  colors gains and losses from two different ramps.

## Stacking mixed signs

<LiveChart :config="posNegStacked.config" :data="posNegStacked.data" demo="stacked" />

<<< @/examples/posNegStacked.ts

- Each sign accumulates separately from the shared base: a category's
  positive segments stack upward while its negative segments stack downward,
  so inflows and outflows read as two piles growing out of zero. An axis with
  stacks defaults its `base` to `0` — no pinning needed.
- Filtering a series in the legend re-stacks its own side and leaves the
  other untouched.
- The stack's [outer caps](/recipes/bar-caps#capping-a-stack)
  apply per sign — the topmost positive segment and the bottommost negative
  one each get one.
- To show the net total across both piles, overlay a line series opted out of
  the stack with
  [`stack: null`](/reference/series#series.stack) (see
  [stacked bars](/recipes/stacked-bars)); for a running total
  that crosses zero step by step, that's the
  [waterfall](/recipes/waterfall).
