# Tooltip formatting

How a value appears in the tooltip is per-series config: a d3-format string
plus optional label, prefix and suffix. Click the chart to compare the two
series' formatting.

<script setup>
import * as tooltipFormat from '../examples/tooltipFormat'
</script>

<LiveChart :config="tooltipFormat.config" :data="tooltipFormat.data" demo="currency-pos-neg" />

<<< @/examples/tooltipFormat.ts

## How it works

- [`valueFormat`](/reference/series#series.valueFormat) is a d3-format
  string (`,.1f`, `.1%`, …); `"auto"` derives one from the data, preferring
  the value axis `tickLabel.format` when that is set.
  [`valuePrefix`](/reference/series#series.valuePrefix) and
  [`valueSuffix`](/reference/series#series.valueSuffix) wrap the formatted
  value (`$41.2k` above).
- The label before the value defaults to the series title (via
  [`useTitleForValueLabel`](/reference/series#series.useTitleForValueLabel));
  set [`valueLabel`](/reference/series#series.valueLabel) to override it, or
  `useTitleForValueLabel: false` for no label at all — `valueLabel: null` is
  the default and falls back to the title.
- [`tooltipProperty`](/reference/series#series.tooltipProperty) shows another
  data property in place of the series value — the [heatmap](/recipes/heatmap)
  uses it to show cell values instead of band coordinates. A series with a
  [`rangeProperty`](/reference/series#series.rangeProperty) shows both ends
  joined by the tooltip's
  [`rangeValueSeparator`](/reference/tooltip#tooltip.rangeValueSeparator)
  (default `" - "`), and a
  [`markerProperty`](/reference/series#series.markerProperty) value follows
  the series value in parentheses.
- Chart-wide behavior lives in [`tooltip`](/reference/tooltip):
  [`rightAlignValues`](/reference/tooltip#tooltip.rightAlignValues) (on by
  default) lines the values up in a column,
  [`showMissingValues`](/reference/tooltip#tooltip.showMissingValues) /
  [`missingValueText`](/reference/tooltip#tooltip.missingValueText) control
  gaps, [`showCategory`](/reference/tooltip#tooltip.showCategory) heads the
  tooltip with the category value, and
  [`followPointer`](/reference/tooltip#tooltip.followPointer) makes the
  tooltip track the pointer instead of toggling on click. See
  [Interaction](/guide/interaction#tooltip-and-crosshair) for the rest.
- Exclude a series from the tooltip entirely with
  [`showInTooltip: false`](/reference/series#series.showInTooltip).
