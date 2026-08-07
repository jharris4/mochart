# Staged animation

Most charting libraries tween every element straight to its final position in
a single step, which makes updates that change both the data and the axis
domains hard to follow. mochart instead splits each update into sequential
phases, so only one kind of change is in motion at a time.

<script setup>
import * as animation from '../examples/animation'
</script>

Watch the phases — the alternate dataset adds categories *and* raises the
maximum, so the axes expand first, then values change, and on the way back
values change before the axes contract:

<LiveChart :config="animation.config" :data="animation.data" :alt-data="animation.altData" />

## The three phases

1. **Axis expansion** — if the new data needs more room (new categories, larger
   values), the axis domains grow first and the existing shapes reflow into
   the wider domains, so incoming data has a place to land.
2. **Value change** — values tween to their new positions. This phase also
   plays **category transitions** (categories added, removed, or reordered are
   merged into one display sequence so old and new categories animate coherently)
   and **series transitions** (series added, removed, or filtered via the
   legend).
3. **Axis contraction** — once the values settle, the axis domains collapse
   to fit the remaining data.

Phases that a given update doesn't need are skipped, and each phase's
duration scales with the size of its change, so small updates stay snappy
while large ones use the full configured duration.

## Gapless stacked animation

Stacked series animate as a single unit: throughout a transition, each
segment's baseline is derived from the tweened top of the segment below it,
rather than each segment tweening independently toward its final position.
The stack therefore stays contiguous for the whole animation — no gaps or
overlaps between segments — even while series are being added to or removed
from the stack. Try it in the [stacked bars recipe](/recipes/stacked-bars).

## Tuning

All knobs live in [`animation`](/reference/animation):

| Property | Controls |
| --- | --- |
| [`animate`](/reference/animation#animation.animate) | master switch — `false` applies every update instantly |
| [`initialDuration`](/reference/animation#animation.initialDuration) | the first render when the chart mounts |
| [`expansionDuration`](/reference/animation#animation.expansionDuration) | the axis expansion phase |
| [`valueChangeDuration`](/reference/animation#animation.valueChangeDuration) | the value change phase (incl. category/series transitions) |
| [`contractionDuration`](/reference/animation#animation.contractionDuration) | the axis contraction phase |
| [`focusDuration`](/reference/animation#animation.focusDuration) | hover/click focus emphasis transitions |

Durations are in milliseconds and are the *maximum* for the phase — smaller
changes complete proportionally faster. On an axis running `0` to `100` with
`valueChangeDuration: 1000`, a bar growing the full height of the axis takes
1000 ms, one going from `50` to `100` takes 500 ms, and one going from `95` to
`100` takes 50 ms.

## Reduced motion

When the user's system requests reduced motion (the `prefers-reduced-motion:
reduce` accessibility setting), the chart applies every update instantly, as
if `animate` were `false`. The preference is watched live — flipping the OS
setting takes effect immediately, without re-creating the chart. Set
[`accessibility.respectReducedMotion`](/reference/accessibility#accessibility.respectReducedMotion)
to `false` to keep animating regardless of the preference.
