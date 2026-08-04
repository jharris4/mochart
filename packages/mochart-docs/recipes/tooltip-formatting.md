# Tooltip formatting

How a value appears in the tooltip is per-series config: a d3-format string
plus optional label, prefix, and suffix. Click or hover the chart to compare
the two series' formatting.

<script setup>
import * as tooltipFormat from '../examples/tooltipFormat'
</script>

<LiveChart :config="tooltipFormat.config" :data="tooltipFormat.data" />

<<< @/examples/tooltipFormat.ts

## How it works

- [`valueFormat`](/reference/series#series.valueFormat) is a
  d3-format string (`,.1f`, `.1%`, …); `"auto"` derives one from the data,
  preferring the axis `tickLabelFormat`.
  [`valuePrefix`](/reference/series#series.valuePrefix) and
  [`valueSuffix`](/reference/series#series.valueSuffix) wrap
  the formatted value (`$41.2k` above).
- The label before the value defaults to the series title (via
  [`useTitleForValueLabel`](/reference/series#series.useTitleForValueLabel));
  set [`valueLabel`](/reference/series#series.valueLabel) to
  override it, or `null` for none.
- Chart-wide behavior lives in [`tooltip`](/reference/tooltip):
  [`rightAlignValues`](/reference/tooltip#tooltip.rightAlignValues) lines
  the values up in a column,
  [`showMissingValues`](/reference/tooltip#tooltip.showMissingValues)
  / [`missingValueText`](/reference/tooltip#tooltip.missingValueText)
  control gaps, and `followPointer` vs `closeOnClick` decide when the tooltip
  opens and closes.
- Exclude a series from the tooltip entirely with
  [`showInTooltip: false`](/reference/series#series.showInTooltip).
