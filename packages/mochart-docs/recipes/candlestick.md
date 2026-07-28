# Candlestick

The `createCandlestick` helper turns OHLC (open/high/low/close) items into
candles: a direction-colored body spanning open→close, painted over a thin
wick spanning low→high.

<script setup>
import * as candlestick from '../examples/candlestick'
import * as candlestickHollow from '../examples/candlestickHollow'
</script>

<LiveChart :config="candlestick.config" :data="candlestick.data" />

<<< @/examples/candlestick.ts

## How it works

- Each item is `{ label, open, high, low, close }`. A candle is **up** when
  the close is at or above the open, **down** otherwise.
- The candles are four ordinary `bar` series — an up and a down body
  spanning from `open` via
  [`rangeProperty`](/reference/seriesConfigs#seriesConfigs.rangeProperty),
  and an up and a down wick spanning `low`→`high`, narrowed to a sliver of
  the slot with
  [`barWidthPercent`](/reference/seriesConfigs#seriesConfigs.barWidthPercent)
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
  and tune the widths with `wickWidthPercent` / `bodyWidthPercent`.
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

<LiveChart :config="candlestickHollow.config" :data="candlestickHollow.data" />

<<< @/examples/candlestickHollow.ts{20}

In hollow mode the low→high wick can't be painted behind the body (it would
show through the hollow interior), so the helper splits it into segments
that stop at the body edges, and the original wick series turns shapeless —
it keeps the tooltip's single `low – high` range row and its focus/filter
wiring, but draws nothing. The up body outlines itself via `strokeColor` /
`strokeWidth` with a transparent fill, and its legend and tooltip icons pick
up the stroke color automatically. `colors`, `seriesTitles` and the width
options apply as in filled mode.
