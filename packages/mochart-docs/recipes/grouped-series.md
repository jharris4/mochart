# Grouped series

Series lay out side by side within each category slot when they share a category id
from [`seriesGroups`](/reference/seriesGroups) — clustered bars.
As with [stacks](/recipes/stacked-bars), a sole configured category is joined
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
  on the category axis.
- Grouping and [stacking](/recipes/stacked-bars) can coexist: series in the
  same stack occupy one slot of the cluster, so two stacks side by side make
  paired stacked bars.
