# Gradients

Series fills and strokes can use SVG gradients: declare them in
[`linearGradients`](/reference/linearGradients) (or
[`radialGradients`](/reference/radialGradients)) and point a
series at one with
[`gradient`](/reference/series#series.gradient). As with
[stacks](/recipes/stacked-bars) and [groups](/recipes/grouped-series), a
sole configured gradient is applied to every series automatically when no
[patterns](/recipes/patterns) are configured. Select gradients explicitly by
id when several gradients or any patterns are configured.

<script setup>
import * as gradients from '../examples/gradients'
</script>

<LiveChart :config="gradients.config" :data="gradients.data" demo="gradients" />

<<< @/examples/gradients.ts

## How it works

- The gradient vector runs from `x1`/`y1` to `x2`/`y2` in 0–1 shape
  coordinates — `0,0 → 0,1` is a top-to-bottom fade. Add
  [`rotation`](/reference/linearGradients#linearGradients.rotation)
  to angle it.
- Each stop sets `offset` (0–1 along the vector), `color`, and `opacity`;
  `stops` is the one property without a default.
- Radial gradients take `cx`/`cy`/`r` (circle) and `fx`/`fy` (focal point)
  instead of a vector.
- Shared values for several gradients can go in `linearGradientDefaults` /
  `radialGradientDefaults`, like every list section
  (see [the config model](/guide/config-model#shared-defaults-sections)).
- Gradients are positional — the fade follows the shape, not the data. For
  color driven by data values, see [color by value](/recipes/color-by-value).
