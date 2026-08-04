# OHLC Bars

The `createOhlc` helper turns OHLC (open/high/low/close) items into tick
bars: a thin direction-colored line spanning low→high, with a tick on the
left marking the open and a tick on the right marking the close.

<script setup>
import * as ohlc from '../examples/ohlc'
</script>

<LiveChart :config="ohlc.config" :data="ohlc.data" demo="ohlc" />

<<< @/examples/ohlc.ts

## How it works

- Each item is `{ label, open, high, low, close }`. A bar is **up** when the
  close is at or above the open, **down** otherwise — the same math as the
  [Candlestick](/recipes/candlestick), which shares its input shape.
- The bars are six ordinary `bar` series — an up and a down low→high line
  narrowed to a sliver of the slot with
  [`barWidthFraction`](/reference/seriesConfigs#seriesConfigs.barWidthFraction),
  plus per direction an open and a close tick. Every row carries values for
  exactly one direction, and
  [`skipMissing`](/reference/seriesConfigs#seriesConfigs.skipMissing) with
  [`skipPartialRange`](/reference/seriesConfigs#seriesConfigs.skipPartialRange)
  keeps the other direction's series from rendering.
- The ticks are ranged bars whose `property` and
  [`rangeProperty`](/reference/seriesConfigs#seriesConfigs.rangeProperty)
  read the same value, so they'd have zero extent —
  [`barMinExtent`](/reference/seriesConfigs#seriesConfigs.barMinExtent)
  expands them into visible marks (`tickExtent`, default 2px). Each tick is a
  half-width bar pushed to one side of the slot with
  [`barAlignFraction`](/reference/seriesConfigs#seriesConfigs.barAlignFraction):
  the open tick spans slot-start→center and the close tick center→slot-end,
  meeting at the line.
- The group axis is ordinal, so non-trading days (weekends, holidays) simply
  don't exist on the axis instead of leaving gaps — note `Jun 05` sits next
  to `Jun 08` above.
- The default direction colors are aqua/red rather than the conventional
  green/red: green↔red is the classic red-green-blindness collision, while
  this pair stays distinguishable on light and dark surfaces. Override per
  direction with `colors`, rename the legend entries with `seriesTitles`,
  and tune the geometry with `lineWidthFraction` / `tickWidthFraction` /
  `tickExtent`.
- The tooltip shows three rows per bar: the line's `low – high` span under
  `rangeTitle` (default "Range") and single-value rows for the ticks under
  `openTitle` / `closeTitle` (defaults "Open" / "Close"). The ticks stay out
  of the legend but follow their line's legend filtering and focus via
  [`followSeries`](/reference/seriesConfigs#seriesConfigs.followSeries), so
  toggling a direction removes whole bars and focusing a direction
  highlights whole bars.
- Each row also carries the raw `open`/`high`/`low`/`close` plus `change`
  and `direction`, and the computed bars come back under `candles` — the
  helper reuses `computeCandlesticks(items)` for the math.
- Items with a `volume` can add the classic volume pane via `volume: true`,
  exactly as in the [Candlestick](/recipes/candlestick#volume-pane) recipe.
