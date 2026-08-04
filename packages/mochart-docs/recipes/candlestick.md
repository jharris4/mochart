# Candlestick

The `createCandlestick` helper turns OHLC (open/high/low/close) items into
candles: a direction-colored body spanning open→close, painted over a thin
wick spanning low→high.

<script setup>
import * as candlestick from '../examples/candlestick'
import * as candlestickHollow from '../examples/candlestickHollow'
import * as candlestickVolume from '../examples/candlestickVolume'
</script>

<LiveChart :config="candlestick.config" :data="candlestick.data" demo="candlestick" />

<<< @/examples/candlestick.ts

## How it works

- Each item is `{ label, open, high, low, close }`. A candle is **up** when
  the close is at or above the open, **down** otherwise.
- The candles are four ordinary `bar` series — an up and a down body
  spanning from `open` via
  [`rangeProperty`](/reference/seriesConfigs#seriesConfigs.rangeProperty),
  and an up and a down wick spanning `low`→`high`, narrowed to a sliver of
  the slot with
  [`barWidthFraction`](/reference/seriesConfigs#seriesConfigs.barWidthFraction)
  and listed first so the bodies paint over them. Every row carries values
  for exactly one direction, and
  [`skipMissing`](/reference/seriesConfigs#seriesConfigs.skipMissing) with
  [`skipPartialRange`](/reference/seriesConfigs#seriesConfigs.skipPartialRange)
  keeps the other direction's series from rendering — the same trick as the
  [Waterfall](/recipes/waterfall).
- The group axis is ordinal, so non-trading days (weekends, holidays)
  simply don't exist on the axis instead of leaving gaps — note `Jun 05`
  sits next to `Jun 08` above.
- The default direction colors are aqua/red rather than the conventional
  green/red: green↔red is the classic red-green-blindness collision, while
  this pair stays distinguishable on light and dark surfaces. Override per
  direction with `colors`, rename the legend entries with `seriesTitles`,
  and tune the widths with `wickWidthFraction` / `bodyWidthFraction`.
- The tooltip shows two rows per candle: the body's `open – close` span
  under its direction title, and the wick's `low – high` span under
  `rangeTitle` (default "Range"). The wicks stay out of the legend but
  follow their body's legend filtering and focus via
  [`followSeries`](/reference/seriesConfigs#seriesConfigs.followSeries),
  so toggling a direction removes whole candles and focusing a direction
  highlights whole candles.
- Each row also carries the raw `open`/`high`/`low`/`close` plus `change`
  and `direction`, and the computed candles come back under `candles` — or
  call `computeCandlesticks(items)` alone for the math without the chart
  fragments.
- For the tick-bar style of the same data — a thin low/high line with open
  and close ticks instead of a body — see [OHLC Bars](/recipes/ohlc).

## Hollow candles

Pass `hollow: true` to draw up candles as outlines — the classic
hollow-candle style where a filled body means down:

<LiveChart :config="candlestickHollow.config" :data="candlestickHollow.data" demo="candlestick-hollow" />

<<< @/examples/candlestickHollow.ts{20}

In hollow mode the low→high wick can't be painted behind the body (it would
show through the hollow interior), so the helper splits it into segments
that stop at the body edges, and the original wick series turns shapeless —
it keeps the tooltip's single `low – high` range row and its focus/filter
wiring, but draws nothing. The up body outlines itself through
[`shapeStyle`](/reference/seriesConfigs#seriesConfigs.shapeStyle) — a stroke
color and width against `fillOpacity: 0`, pinned to 0 in the focused and
defocused states too so hovering thickens the outline rather than filling it
— and its legend and tooltip icons pick up the stroke color automatically.
`colors`, `seriesTitles` and the width options apply as in filled mode.

## Volume pane

Give the items a `volume` and pass `volume: true` (works with `hollow` too,
and with [OHLC Bars](/recipes/ohlc)) to add the classic pane of
direction-colored volume bars along the bottom of the plot:

<LiveChart :config="candlestickVolume.config" :data="candlestickVolume.data" demo="candlestick" />

<<< @/examples/candlestickVolume.ts{21}

The pane is pure domain-margin geometry on a second value axis, so it adapts
to every data update: the result gains a `seriesAxisConfigs` fragment with a
`price` axis whose enlarged
[`minMarginFraction`](/reference/seriesAxisConfigs#seriesAxisConfigs.minMarginFraction)
lifts the candles into the upper plot, and a hidden `volume` axis pinned at
0 whose
[`maxMarginFraction`](/reference/seriesAxisConfigs#seriesAxisConfigs.maxMarginFraction)
confines the bars to the bottom band (margins above 1 are allowed for
exactly this banding). Tune the split with `volume: { heightFraction,
gapFraction }` (defaults 0.2 and 0.05), relabel the tooltip rows with
`valueLabel` (default "Volume"), or set `visible: true` on the volume axis
fragment to show its scale. The volume bars follow their direction series —
toggling or focusing Up takes its volume bars along — and stay out of the
legend, with one volume row per day in the tooltip.
