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
config) focuses it: the focused series gets its `focused*` styling and every
other series its `defocused*` styling, animated over
[`focusDuration`](/reference/animationConfig#animationConfig.focusDuration).
The legend can drive the same focus via
[`legendConfig.focusOnMouseOver`](/reference/legendConfig#legendConfig.focusOnMouseOver).

## Legend filtering

With [`legendConfig.filterOnClick`](/reference/legendConfig#legendConfig.filterOnClick)
enabled, clicking a legend item toggles its series out of (and back into) the
chart. The item stays in the legend so the series can be restored, and the
removal/return animates as a series transition.

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
- `onSeriesLayoutInfoChange(bounds)` — the plot area was re-laid-out
