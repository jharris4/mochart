# Patterns

Series fills can use the built-in `lines`, `crosshatch`, and `dots` SVG
patterns. Declare them in [`patterns`](/reference/patterns) and point a series
at one with [`pattern`](/reference/series#series.pattern). A sole pattern is
applied to every series automatically when no gradients are configured.
When several patterns or any gradients are configured, select patterns
explicitly by id.

<script setup>
import * as patterns from '../examples/patterns'
</script>

<LiveChart :config="patterns.config" :data="patterns.data" demo="grouped" />

<<< @/examples/patterns.ts

## How it works

- Patterns use screen-space pixel measurements, so their marks remain the
  same size across differently sized bars, areas, and pie slices. Plot markers
  remain solid because their small size makes patterns hard to read.
- `spacing` and the foreground/background colors and opacities are common to
  every type. Lines and crosshatches add `angle` and `lineWidth`; dots add
  `radius`.
- `foregroundColor: "series"` or `backgroundColor: "series"` resolves to the
  owning series' normal base fill color. `"currentColor"` instead follows the
  CSS `color` inherited by the chart. A null background is transparent.
- Put only common properties in `patternDefaults`; `type`, `id`, `ignore`,
  `angle`, `lineWidth`, and `radius` belong on individual entries.
- A series cannot use both `pattern` and `gradient`. Set `pattern: null` to opt
  a series out of an automatically selected sole pattern.
- Patterns replace per-row fill colors, while per-row stroke colors still
  apply. Legend and tooltip swatches reproduce the pattern.
