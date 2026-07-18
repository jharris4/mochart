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

- [`valueFormat`](/reference/seriesConfigs#seriesConfigs.valueFormat) is a
  d3-format string (`,.1f`, `.1%`, …); `"auto"` derives one from the data,
  preferring the axis `tickLabelFormat`.
  [`valuePrefix`](/reference/seriesConfigs#seriesConfigs.valuePrefix) and
  [`valueSuffix`](/reference/seriesConfigs#seriesConfigs.valueSuffix) wrap
  the formatted value (`$41.2k` above).
- The label before the value defaults to the series title (via
  [`useTitleForValueLabel`](/reference/seriesConfigs#seriesConfigs.useTitleForValueLabel));
  set [`valueLabel`](/reference/seriesConfigs#seriesConfigs.valueLabel) to
  override it, or `null` for none.
- Chart-wide behavior lives in [`tooltipConfig`](/reference/tooltipConfig):
  [`alignValues`](/reference/tooltipConfig#tooltipConfig.alignValues) lines
  the values up in a column,
  [`showMissingValues`](/reference/tooltipConfig#tooltipConfig.showMissingValues)
  / [`missingValueText`](/reference/tooltipConfig#tooltipConfig.missingValueText)
  control gaps, and `mouseOver` vs `closeOnClick` decide when the tooltip
  opens and closes.
- Exclude a series from the tooltip entirely with
  [`showInTooltip: false`](/reference/seriesConfigs#seriesConfigs.showInTooltip).
