# Error Bars

Error bars are first-class series config: set
[`errorLowProperty`](/reference/series#series.errorLowProperty)
and
[`errorHighProperty`](/reference/series#series.errorHighProperty)
to the data properties holding a point's absolute lower and upper bounds, and
the chart draws a capped whisker through every bar or line point.

<script setup>
import * as errorBars from '../examples/errorBars'
</script>

<LiveChart :config="errorBars.config" :data="errorBars.data" demo="error-bars" />

<<< @/examples/errorBars.ts

## How it works

- The bounds are **absolute values** in value-axis units (e.g. the ends of a
  confidence interval), not deltas from the value. For `value ± error` data,
  derive the bound columns once when preparing the rows.
- The bounds join the value axis domain, so whiskers never clip — note the
  axis above reaching past the tallest bar to cover its upper bound.
- Whiskers center on each bar's layout slot — including grouped sub-slots, as
  in the two plant series above — and on the point position for `line`,
  `area` and `none` renderer series. On [horizontal
  charts](/recipes/horizontal-bars) they run horizontally with vertical caps.
- Either bound works alone: a category missing one bound draws a one-sided
  whisker from the point to the defined bound, and a category missing both draws
  no whisker. A missing bound is a legitimate one-sided error bar, so the
  tooltip renders nothing for it rather than the missing-value text.
- Stacked series can't take error properties — absolute bounds have no
  meaning against a cumulative stack position — and config validation
  rejects the combination.
- The tooltip appends the bounds after the value, joined by the tooltip's
  `rangeValueSeparator`: `56.5 (53.9 - 58.6)`.
- Styling: [`errorBarCapSize`](/reference/series#series.errorBarCapSize)
  sets the cap width in pixels (`0` hides the caps; on bars the caps clamp to
  the bar slot), and
  [`errorBarStyle`](/reference/series#series.errorBarStyle)
  paints the whisker itself. Being a line, it takes a stroke-only style —
  [`strokeColor`](/reference/series#series.errorBarStyle.normal.strokeColor),
  [`strokeOpacity`](/reference/series#series.errorBarStyle.normal.strokeOpacity),
  [`strokeWidth`](/reference/series#series.errorBarStyle.normal.strokeWidth)
  and
  [`strokeDashArray`](/reference/series#series.errorBarStyle.normal.strokeDashArray)
  (e.g. `"5, 5"`; `null` for a solid whisker) — once per focus state. The default `strokeColor` is `"series"` in
  [`normal`](/reference/series#series.errorBarStyle.normal) and
  `"same"` in
  [`focused`](/reference/series#series.errorBarStyle.focused) and
  [`defocused`](/reference/series#series.errorBarStyle.defocused),
  so whiskers follow their series' color through focus, while the opacities
  (`0.9` normally, `1` focused, `0.5` defocused) dim them alongside it. Only
  the members you name are overridden, so thickening just the focused whisker
  is `errorBarStyle: { focused: { strokeWidth: 3 } }`.
- Whiskers animate with their series: value transitions share one duration
  across the point and its bounds, so the whisker stays glued to a moving
  bar, and entering categories grow their whisker out of the axis base with the
  bar.
