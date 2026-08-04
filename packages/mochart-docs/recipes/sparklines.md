# Sparklines

The `createSparklineConfig` helper turns any chart config into a sparkline
preset — axes, legend, tooltip, crosshairs and point markers hidden and
margins collapsed — leaving only the plotted shapes for tiny inline charts.

<script setup>
import * as sparkline from '../examples/sparkline'
</script>

<LiveChart :config="sparkline.config" :data="sparkline.data" :height="56" />

<<< @/examples/sparkline.ts

## How it works

- The preset only fills in defaults — any value set on the passed config
  wins. To bring one piece back, set it explicitly: e.g.
  `legendConfig: { visible: true }` survives the preset untouched.
- `interactive: true` keeps the tooltip and crosshairs enabled for
  sparklines large enough to host them; `padding` (default 2px) keeps
  strokes at the data extremes from clipping against the chart edges.
- Point markers are hidden by nulling
  [`markerShape`](/reference/series#series.markerShape)
  through `seriesAllConfig`, so line series render as a bare stroke.
- The sparkline is still a regular chart — size it by mounting it small
  (this page uses a 56px-tall host; table cells around 150×32 work well)
  and it renders any series type. A win/loss strip is two `bar` series
  with [`skipMissing`](/reference/series#series.skipMissing),
  one property per direction, on an axis fixed to `min: -1, max: 1` — the
  same one-property-per-direction trick the
  [waterfall](/recipes/waterfall) uses.
