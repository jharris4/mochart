# Interaction

Charts respond to hover, click, and legend interaction out of the box, and
report everything through optional callback props. Every interaction on this
page also works from the keyboard — see [Accessibility](/guide/accessibility).

<script setup>
import * as interaction from '../examples/interaction'
</script>

Hover a legend entry to focus its series, click the plot to pin the tooltip
and crosshair, and click legend entries to filter series in and out —
filtering plays the staged series transition:

<LiveChart :config="interaction.config" :data="interaction.data" />

## Focus

Hovering or clicking a series (per its `focusOnMouseOver` / `focusOnClick`
config) focuses it: the focused series is styled from the `focused` state of
its [styles](/guide/config-model#styles-and-focus-states) and every other
series from their `defocused` state, animated over
[`focusDuration`](/reference/animation#animation.focusDuration).
By default those states change only opacity and width — their colors are
`'same'`, meaning "keep the normal state's color". The legend can drive the
same focus via
[`legend.focusOnMouseOver`](/reference/legend#legend.focusOnMouseOver).

Category focus has knobs of its own: the series'
[`focusCategoryOnMouseOver`](/reference/series#series.focusCategoryOnMouseOver)
and [`focusCategoryOnClick`](/reference/series#series.focusCategoryOnClick)
focus the category the pointer is on, and a series with
[`useAxisFocus`](/reference/series#series.useAxisFocus) shows as focused
whenever the value axis it belongs to is.

## Legend filtering

With [`legend.filterOnClick`](/reference/legend#legend.filterOnClick)
enabled, clicking a legend item toggles its series out of (and back into) the
chart. The item stays in the legend so the series can be restored, and the
removal/return animates as a series transition. Its color icon goes hollow to
mark it filtered; set
[`legend.showFilteringOnLabels`](/reference/legend#legend.showFilteringOnLabels)
to strike through the item text as well, and
[`tooltip.showFilteringOnLabels`](/reference/tooltip#tooltip.showFilteringOnLabels)
to do the same to the series' tooltip label. Both default to `false`.
Set [`filterable: false`](/reference/series#series.filterable) on a series
to exempt it from legend (and tooltip) filtering entirely, and
[`showColorInLegend: false`](/reference/series#series.showColorInLegend) to
drop the color icon from its legend item.

## Tooltip and crosshair

[`tooltip`](/reference/tooltip) and
[`crosshair`](/reference/crosshair) style the tooltip and
crosshair shown for the focused category. Per-series formatting of tooltip
values — label, prefix/suffix, d3-format string — lives on the series
([`valueLabel`](/reference/series#series.valueLabel),
[`valueFormat`](/reference/series#series.valueFormat), and
friends).

The tooltip can drive focus too:
[`tooltip.focusCategoryOnMouseOver`](/reference/tooltip#tooltip.focusCategoryOnMouseOver)
and [`tooltip.focusCategoryOnClick`](/reference/tooltip#tooltip.focusCategoryOnClick)
focus the category value the pointer is on inside the tooltip. Each series
can also drop its color icon from the tooltip rows with
[`showColorInTooltip: false`](/reference/series#series.showColorInTooltip).

### Tooltip controls

[`tooltip.showControls`](/reference/tooltip#tooltip.showControls) adds a
control strip above the tooltip's lines: ‹ and › buttons step the shown
category, and a mode button toggles what clicking a tooltip row does. In
filter mode (the initial mode) clicking a series row toggles its series out
of the chart, exactly like a legend click — respecting
[`filterable`](/reference/series#series.filterable) — and hovering a row
focuses its series the way hovering its legend item does; in focus mode
clicking a row pins focus on its series — or, on the category line, on the
category. The mode
button shows the active mode via
[`tooltip.filterModeText`](/reference/tooltip#tooltip.filterModeText) /
[`tooltip.focusModeText`](/reference/tooltip#tooltip.focusModeText)
(`'Filter'` / `'Focus'` by default), and the step buttons take their
accessible labels from
[`accessibility.tooltipPreviousLabel`](/reference/accessibility#accessibility.tooltipPreviousLabel)
and
[`accessibility.tooltipNextLabel`](/reference/accessibility#accessibility.tooltipNextLabel).
The buttons and rows all work from the keyboard — see the
[keyboard map](/guide/accessibility#keyboard-map).

## Callbacks

All callbacks are optional props on either entry point:

```js
createDefaultChart(container, {
  config, data, width, height,
  onFocus: ({ focusedSeriesId, focusedCategoryIndex }) => { /* focus changed */ },
  onSeriesFilter: ({ filteredSeriesIds }) => { /* legend filtering changed */ },
  onChartClick: ({ categoryIndex, chartX, chartY }) => { /* plot area clicked */ },
  onSliceClick: ({ seriesId }) => { /* pie slice clicked */ },
  onSeriesClick: ({ seriesId, categoryIndex }) => { /* bar/point/line clicked */ },
  onTitleClick: () => {}
});
```

- `onFocus(focus)` — the focused series/category/axis changed (mouse over/out
  or click, per the series' `focusOnMouseOver`/`focusOnClick` config)
- `onSeriesFilter(filter)` — a legend click toggled a series in or out of
  the filtered set
- `onChartClick` / `onChartMouseEnter` / `onChartMouseMove` /
  `onChartMouseLeave` — plot-area pointer events with chart coordinates and
  the nearest category index
- `onSliceClick(payload)` — a slice of a [pie or donut](/recipes/pie) chart
  was clicked
- `onSeriesClick(payload)` — a cartesian series shape (bar, marker, label, or
  line/area path) was clicked; reports the series id, the shape's category
  index (`-1` for a whole-series path), and the category index nearest the
  pointer. Fires whether or not the series' `focusOnClick` config is set, and
  only on click — the cartesian counterpart of `onSliceClick`
- `onTitleClick()` — the chart title was clicked (see
  [`title.link`](/reference/title#title.link) and
  `linkDisabled`)
- `onSeriesLayoutBoundsChange(bounds)` — the plot area was re-laid-out

The four pointer callbacks share one payload
([`ChartEventPayload`](/reference/callbacks#chartEventPayload): pointer
coordinates in three frames, plus the nearest category index).
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

- [`focusedCategoryIndex`](/reference/props#props.focusedCategoryIndex) (`-1` =
  none), [`focusedSeriesId`](/reference/props#props.focusedSeriesId) and
  [`focusedValueAxisId`](/reference/props#props.focusedValueAxisId)
  (`null` = none) — the controlled form of `onFocus`
- [`filteredSeriesIds`](/reference/props#props.filteredSeriesIds) — the
  controlled form of `onSeriesFilter`

```js
chart.update({
  focusedCategoryIndex: focus.focusedCategoryIndex,
  focusedSeriesId: focus.focusedSeriesId
});
```

Leave a prop `undefined` to let the chart keep managing that piece itself.
