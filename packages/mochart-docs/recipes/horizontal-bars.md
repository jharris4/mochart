# Horizontal charts

Set [`plotConfig.inverted`](/reference/plotConfig#plotConfig.inverted) and
the chart swaps orientation: groups run down the side and values extend
horizontally. Everything else — stacking, grouping, thresholds, animation —
works unchanged.

<script setup>
import * as horizontal from '../examples/horizontal'
</script>

<LiveChart :config="horizontal.config" :data="horizontal.data" :alt-data="horizontal.altData" />

<<< @/examples/horizontal.ts

## How it works

- Axis positions follow the inversion:
  [`before`](/reference/seriesAxisConfigs#seriesAxisConfigs.before) means
  top/left, so the group axis lands on the left and the value axis on the
  bottom by default.
- Long group labels usually fit better on a horizontal chart — combine with
  the group axis
  [`tickLabelTruncationEnabled`](/reference/groupAxisConfig#groupAxisConfig.tickLabelTruncationEnabled)
  settings when they still overflow.
- The staged animation phases are orientation-aware; axis expansion grows
  the value domain to the right instead of upward.
