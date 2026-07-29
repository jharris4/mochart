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

### Payloads

The four pointer callbacks all receive the same payload:

```ts
interface ChartEventPayload {
  chartX: number;            // pointer x relative to the chart container, in px
  chartY: number;            // pointer y relative to the chart container, in px
  groupPosition: number;     // pointer position along the group axis, in plot px
  seriesPosition: number;    // pointer position along the series axis, in plot px
  groupPercentage: number;   // the same, as a 0–1 fraction of the plot
  seriesPercentage: number;  // the same, as a 0–1 fraction of the plot
  groupIndex: number;        // index of the nearest group, -1 when none
}
```

`onFocus` receives the whole focus state, and `onSeriesFilter` the whole
filter map — not just what changed:

```ts
interface ChartFocus {
  focusedSeriesAxisId: string | null;  // null when no axis is focused
  focusedSeriesId: string | null;      // null when no series is focused
  focusedGroupIndex: number;           // -1 when no group is focused
}

interface ChartSeriesFilter {
  filteredSeriesIds: Record<string, boolean>;  // series id → true = filtered out
}
```

`onSliceClick` receives `{ seriesId }` — the id of the clicked slice's
series (the leader, for follower series). Unlike `onFocus`, which pointer
hover also drives, it fires only on click, so it can anchor a selection.

## Controlled focus and filtering

Focus and legend filtering are managed by the chart internally, but each
piece of that state has a matching input prop that takes over when it is set
(not `undefined`), overriding the internal state on every update. Pass back
what the callbacks report to keep several charts in sync:

- `focusedGroupIndex` (`-1` = none), `focusedSeriesId` and
  `focusedSeriesAxisId` (`null` = none) — the controlled form of `onFocus`
- `filteredSeriesIds` — the controlled form of `onSeriesFilter`

```js
chart.update({
  focusedGroupIndex: focus.focusedGroupIndex,
  focusedSeriesId: focus.focusedSeriesId
});
```

Leave a prop `undefined` to let the chart keep managing that piece itself.
