# Grouped series

Series lay out side by side within each category slot when they share a group id
from [`seriesGroups`](/reference/seriesGroups) — clustered bars.
As with [stacks](/recipes/stacked-bars), a sole configured group is joined
automatically, so declaring it is the only wiring needed.

<script setup>
import * as groupedSeries from '../examples/groupedSeries'
</script>

<LiveChart :config="groupedSeries.config" :data="groupedSeries.data" :alt-data="groupedSeries.altData" demo="grouped" />

<<< @/examples/groupedSeries.ts

## Variations

- Opt a series out of the cluster with
  [`group: null`](/reference/series#series.group) — e.g. to
  overlay a line across the grouped bars.
- Tune the spacing between and around clusters with
  [`categoryPaddingFraction`](/reference/categoryAxis#categoryAxis.categoryPaddingFraction)
  on the category axis: `inner` is the gap between the bars of a cluster,
  `outer` the gap between neighbouring categories.
- Grouping and [stacking](/recipes/stacked-bars) can coexist: series in the
  same stack occupy one slot of the cluster, so two stacks side by side make
  paired stacked bars. Put every series of both stacks in one group — the
  Stacked & Grouped demo in the gallery shows the result. A stack cannot span
  groups: its series must all share one `group`, which validation enforces.
- To overlay a narrower bar on a full-width one instead (a measure over its
  backing range), leave the series ungrouped and shrink the overlay with
  [`barWidthFraction`](/reference/series#series.barWidthFraction);
  [`barAlignFraction`](/reference/series#series.barAlignFraction) then places
  it within the slot (`0.5` centers). Both also apply inside a group sub-slot
  — the [OHLC recipe](/recipes/ohlc) uses them to put open and close ticks
  either side of one bar.
