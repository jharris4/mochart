# Candlestick

The `createCandlestick` helper turns OHLC (open/high/low/close) items into
candles: a direction-colored body spanning open→close, painted over a thin
wick spanning low→high.

<script setup>
import * as candlestick from '../examples/candlestick'
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
  `rangeTitle` (default "Range"). The wicks stay out of the legend.
- Each row also carries the raw `open`/`high`/`low`/`close` plus `change`
  and `direction`, and the computed candles come back under `candles` — or
  call `computeCandlesticks(items)` alone for the math without the chart
  fragments.
- For hollow candles (up candles drawn as outlines), override the up body
  after spreading: `{ ...upBody, fillOpacity: 0, strokeColor: '#1baf7a',
  strokeWidth: 2 }`.
