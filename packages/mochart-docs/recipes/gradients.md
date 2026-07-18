# Gradients

Series fills and strokes can use SVG gradients: declare them in
[`linearGradientConfigs`](/reference/linearGradientConfigs) (or
[`radialGradientConfigs`](/reference/radialGradientConfigs)) and point a
series at one with
[`gradient`](/reference/seriesConfigs#seriesConfigs.gradient).

<script setup>
import * as gradients from '../examples/gradients'
</script>

<LiveChart :config="gradients.config" :data="gradients.data" />

<<< @/examples/gradients.ts

## How it works

- The gradient vector runs from `x1`/`y1` to `x2`/`y2` in 0–1 shape
  coordinates — `0,0 → 0,1` is a top-to-bottom fade. Add
  [`rotation`](/reference/linearGradientConfigs#linearGradientConfigs.rotation)
  to angle it.
- Each stop sets `offset` (0–1 along the vector), `color`, and `opacity`;
  `stops` is the one property without a default.
- Radial gradients take `cx`/`cy`/`r` (circle) and `fx`/`fy` (focal point)
  instead of a vector.
- Shared values for several gradients can go in `linearGradientAllConfig` /
  `radialGradientAllConfig`, like every list section
  (see [the config model](/guide/config-model#shared-all-sections)).
