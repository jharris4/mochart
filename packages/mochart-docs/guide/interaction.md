# Interaction

Charts respond to hover, click, and legend interaction out of the box, and
report everything through optional callback props.

<script setup>
import * as interaction from '../examples/interaction'
</script>

Hover the bars to focus a series, click the plot to pin the tooltip and
crosshair, and click legend items to filter series in and out — filtering
plays the staged series transition:

<LiveChart :config="interaction.config" :data="interaction.data" />

## Focus

Hovering or clicking a series (per its `focusOnMouseOver` / `focusOnClick`
config) focuses it: the focused series is painted from the `focused` state of
its [styles](/guide/config-model#styles-and-focus-states) and every other
series from their `defocused` state, animated over
[`focusDuration`](/reference/animationConfig#animationConfig.focusDuration).
By default those states change only opacity and width — their colors are
`'same'`, meaning "keep the normal state's color". The legend can drive the
same focus via
[`legendConfig.focusOnMouseOver`](/reference/legendConfig#legendConfig.focusOnMouseOver).

## Legend filtering

With [`legendConfig.filterOnClick`](/reference/legendConfig#legendConfig.filterOnClick)
enabled, clicking a legend item toggles its series out of (and back into) the
chart. The item stays in the legend so the series can be restored, and the
removal/return animates as a series transition. Its color icon goes hollow to
mark it suppressed; set
[`legendConfig.showSuppressionOnLabels`](/reference/legendConfig#legendConfig.showSuppressionOnLabels)
to strike through the item text as well, and
[`tooltipConfig.showSuppressionOnLabels`](/reference/tooltipConfig#tooltipConfig.showSuppressionOnLabels)
to do the same to the series' tooltip label. Both default to `false`.

## Tooltip and crosshair

[`tooltipConfig`](/reference/tooltipConfig) and
[`crosshairConfig`](/reference/crosshairConfig) style the tooltip and
crosshair shown for the focused group. Per-series formatting of tooltip
values — label, prefix/suffix, d3-format string — lives on the series
([`valueLabel`](/reference/seriesConfigs#seriesConfigs.valueLabel),
[`valueFormat`](/reference/seriesConfigs#seriesConfigs.valueFormat), and
friends).

## Callbacks

All callbacks are optional props on either entry point:

```js
createDefaultChart(container, {
  config, data, width, height,
  onFocus: ({ focusedSeriesId, focusedGroupIndex }) => { /* focus changed */ },
  onSeriesFilter: ({ filteredSeriesIds }) => { /* legend filtering changed */ },
  onChartClick: ({ groupIndex, chartX, chartY }) => { /* plot area clicked */ },
  onSliceClick: ({ seriesId }) => { /* pie slice clicked */ },
  onTitleClick: () => {}
});
```

- `onFocus(focus)` — the focused series/group/axis changed (mouse over/out
  or click, per the series' `focusOnMouseOver`/`focusOnClick` config)
- `onSeriesFilter(filter)` — a legend click toggled a series in or out of
  the filtered set
- `onChartClick` / `onChartMouseEnter` / `onChartMouseMove` /
  `onChartMouseLeave` — plot-area pointer events with chart coordinates and
  the nearest group index
- `onSliceClick(payload)` — a slice of a [pie or donut](/recipes/pie) chart
  was clicked
- `onTitleClick()` — the chart title was clicked (see
  [`titleConfig.link`](/reference/titleConfig#titleConfig.link) and
  `linkDisabled`)
- `onSeriesLayoutInfoChange(bounds)` — the plot area was re-laid-out

The four pointer callbacks share one payload
([`ChartEventPayload`](/reference/callbacks#chartEventPayload): pointer
coordinates in three frames, plus the nearest group index).
[`onFocus`](/reference/callbacks#callbacks.onFocus) and
[`onSeriesFilter`](/reference/callbacks#callbacks.onSeriesFilter) each
receive the whole state rather than only what changed. Every callback and
every payload field is listed in
[Callbacks and payloads](/reference/callbacks).

## Controlled focus and filtering

Focus and legend filtering are managed by the chart internally, but each
piece of that state has a matching input prop that takes over when it is set
(not `undefined`), overriding the internal state on every update. Pass back
what the callbacks report to keep several charts in sync:

- [`focusedGroupIndex`](/reference/props#props.focusedGroupIndex) (`-1` =
  none), [`focusedSeriesId`](/reference/props#props.focusedSeriesId) and
  [`focusedSeriesAxisId`](/reference/props#props.focusedSeriesAxisId)
  (`null` = none) — the controlled form of `onFocus`
- [`filteredSeriesIds`](/reference/props#props.filteredSeriesIds) — the
  controlled form of `onSeriesFilter`

```js
chart.update({
  focusedGroupIndex: focus.focusedGroupIndex,
  focusedSeriesId: focus.focusedSeriesId
});
```

Leave a prop `undefined` to let the chart keep managing that piece itself.
