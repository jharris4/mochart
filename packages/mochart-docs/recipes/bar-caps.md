# Bar caps

[`capType`](/reference/series#series.capType) draws a decorative
cap on the value end of every bar in a series — the quickest way to the
popular rounded-bar look, with two more shapes beside it.

<script setup>
import * as barCaps from '../examples/barCaps'
import * as barCapsStacked from '../examples/barCapsStacked'
</script>

<LiveChart :config="barCaps.config" :data="barCaps.data" demo="capped" />

<<< @/examples/barCaps.ts

## How it works

- `capType` picks the shape: `round` rounds the bar's end corners, `curve`
  bulges a quadratic dome, `point` rises to a triangular peak; `null` (the
  default) leaves the end flat.
  [`capSize`](/reference/series#series.capSize) sets the cap's
  extent in pixels.
- The cap is part of the bar's shape, drawn at the value end and pointing the
  bar's way — negative bars cap downward, and on an
  [inverted chart](/recipes/horizontal-bars) the caps sit on the
  bars' side ends. Fills, [gradients](/recipes/gradients) and
  [per-row colors](/recipes/color-by-value) apply to the cap like
  the rest of the bar.
- When a bar is shorter than its cap,
  [`capExpand`](/reference/series#series.capExpand) decides what
  gives: `true` (the default) keeps the cap at full size, `false` shrinks the
  cap to fit the bar. The Capped demo in the gallery draws every shape
  both ways on an axis pinned well past the data, so the difference is easy
  to compare.

## Capping a stack

On stacked bars, capping every segment looks broken — usually only the
stack's outer end should be capped. Declare the cap on the stack instead of
the series:

<LiveChart :config="barCapsStacked.config" :data="barCapsStacked.data" demo="stacked" />

<<< @/examples/barCapsStacked.ts

- [`outerCapType`](/reference/seriesStacks#seriesStacks.outerCapType)
  (with
  [`outerCapSize`](/reference/seriesStacks#seriesStacks.outerCapSize) and
  [`outerCapExpand`](/reference/seriesStacks#seriesStacks.outerCapExpand))
  caps whichever series is the stack's outer segment at each category — no
  per-series cap config needed. Filter the top series in the legend and the
  cap moves to the segment that becomes outermost.
- A stack mixing positive and negative values gets an outer cap on each end:
  the topmost positive segment and the bottommost negative one.
- A series that sets its *own* `capType` keeps it even in a stack; add
  [`capOnlyStackOuter`](/reference/series#series.capOnlyStackOuter)
  to draw that cap only where the series is the outer segment — for a cap
  that should differ from the stack-level one.

Grouped bars need no special handling — each series caps its own bars, as in
the first example.
