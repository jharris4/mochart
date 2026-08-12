# Accessibility

Charts are keyboard-accessible and screen-reader labeled by default. The
plot area, legend, and interactive series are tab stops; the keyboard
drives the same tooltip, focus, and filtering as the mouse; and assistive
tech hears roles, names, and live value announcements instead of a thicket
of unlabeled shapes. It all works out of the box — the
[`accessibility`](/reference/accessibility) config section tunes it, localizes
its labels, or turns it off.

<script setup>
import * as a11y from '../examples/accessibility'
</script>

Try it: Tab to the plot area of this chart, press <kbd>Enter</kbd>, and step
through the categories with the arrow keys. Tab again to reach the legend
and filter a series with <kbd>Enter</kbd>:

<LiveChart :config="a11y.config" :data="a11y.data" />

This example's config names its own tab stops — a screen reader announces the
plot area as "Weekly signup values" and the legend as "Signup types":

```js
accessibility: {
  plotLabel: 'Weekly signup values',
  legendLabel: 'Signup types'
}
```

## Keyboard map

The plot area is a single tab stop whenever the
[`tooltip`](/reference/tooltip#tooltip.visible) or
[`crosshair`](/reference/crosshair#crosshair.visible) is enabled:

| Key | Action |
| --- | --- |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | open the tooltip; press again to close |
| <kbd>←</kbd> <kbd>↑</kbd> <kbd>→</kbd> <kbd>↓</kbd> | step the shown category (opens the tooltip if closed) |
| <kbd>Home</kbd> / <kbd>End</kbd> | jump to the first / last category |
| <kbd>Esc</kbd> | close the tooltip |

Reopening returns to the last category you were viewing. On single-category
charts (a pie or donut), the arrow keys are inert and
<kbd>Enter</kbd>/<kbd>Space</kbd> still toggles the tooltip.

With both the tooltip and the crosshair disabled, the chart has no keyboard
or screen-reader route to its values — the remaining tab stops filter and
focus series but never read numbers. If you disable both, provide the values
another way, such as a data table or text summary near the chart.

An open tooltip is part of the tab order. With
[`tooltip.showControls`](/reference/tooltip#tooltip.showControls) on, its
‹ / › / mode controls are ordinary buttons (the ends report
`aria-disabled` instead of dropping out of the tab order), and the
tooltip's rows are keyboard-reachable whenever clicking them does something
— per the controls' current mode, or the
[`focusCategoryOnClick`](/reference/tooltip#tooltip.focusCategoryOnClick) /
[`focusSeriesOnClick`](/reference/tooltip#tooltip.focusSeriesOnClick) /
[`filterSeriesOnClick`](/reference/tooltip#tooltip.filterSeriesOnClick)
config. Like legend items they form a single tab stop with a roving focus:
arrows and <kbd>Home</kbd>/<kbd>End</kbd> move between rows,
<kbd>Enter</kbd>/<kbd>Space</kbd> acts exactly like a click, and a
keyboard-focused row highlights the same way a hovered one does.
<kbd>Esc</kbd> anywhere inside the tooltip closes it and returns focus to
the plot area.

Legend items are keyboard-reachable whenever clicking them does something
([`legend.filterOnClick`](/reference/legend#legend.filterOnClick) or
[`legend.focusOnClick`](/reference/legend#legend.focusOnClick)). They form a
single tab stop with a roving focus: <kbd>Tab</kbd> enters the legend, the
arrow keys and <kbd>Home</kbd>/<kbd>End</kbd> move between items, and
<kbd>Enter</kbd>/<kbd>Space</kbd> acts exactly like a click — filtering or
focusing the series. A keyboard-focused item highlights its series the same
way hovering it does.

Pie and donut slices work the same way when they are interactive (the series
has [`focusOnClick`](/reference/series#series.focusOnClick) or the chart has
an `onSliceClick` callback): one tab stop, arrow keys moving between slices
in config order, and <kbd>Enter</kbd>/<kbd>Space</kbd> doing what clicking the
slice does — the focus toggle and `onSliceClick` — with no pointer position
invented for it.

Cartesian series follow the same pattern when clicking them does something
(the series has [`focusOnClick`](/reference/series#series.focusOnClick) or
the chart has an `onSeriesClick` callback): one roving tab stop over the
series, arrow keys moving between them in config order, and
<kbd>Enter</kbd>/<kbd>Space</kbd> acting as a whole-series click —
`onSeriesClick` reports `categoryIndex: -1`, as a line or area path click
does. Follower series ([`followSeries`](/reference/series#series.followSeries))
stay pointer-only; their clicks belong to their leader. The
[interaction guide's callbacks example](/guide/interaction#callbacks)
doubles as a live keyboard demo: <kbd>Tab</kbd> to a series, press
<kbd>Enter</kbd>, and its event log shows the whole-series `onSeriesClick`
payload.

A title with an `onTitleClick` callback is a tab stop with `role="button"`,
named from the title text and activated by <kbd>Enter</kbd>/<kbd>Space</kbd>.
A title with [`title.link`](/reference/title#title.link) is a link instead, so
it is already keyboard-reachable and gets no second role.

## What screen readers hear

The chart svg is announced as a chart (via `aria-roledescription`) and named
from [`title.text`](/reference/title#title.text); an untitled chart falls
back to
[`accessibility.chartLabel`](/reference/accessibility#accessibility.chartLabel).
Decorative geometry — axes, grid lines, series shapes, the crosshair — is
`aria-hidden`, so a screen reader lands on the meaningful stops: the plot
area button, the legend, and the tooltip.

Each set of roving tab stops is announced as a named group, so a screen
reader says what you have entered before it reads the first item: the legend
group is named from
[`accessibility.legendLabel`](/reference/accessibility#accessibility.legendLabel),
the interactive series or pie slices from
[`accessibility.seriesLabel`](/reference/accessibility#accessibility.seriesLabel),
and an open tooltip's rows from
[`accessibility.tooltipLabel`](/reference/accessibility#accessibility.tooltipLabel).
Each group appears only while its items are actually tab stops.

Keyboard navigation speaks. Opening or stepping the tooltip announces its
content through a visually-hidden live region — "Mon: Trial: 18, Paid: 6" —
mirroring exactly what the tooltip shows, including per-series value
formatting. Legend items — and tooltip series rows, when clicking them
filters — expose their filtered state as a toggle-button `aria-pressed`
(pressed means the series is shown), and interactive pie slices are named
with their series title and current share.

## The focus ring

The visible keyboard focus ring ships in the optional stylesheet:

```js
import '@mochart/core/mochart.css';
```

It draws a 2px `currentColor` outline on the focused tab stop, only for
keyboard focus (`:focus-visible`) — mouse clicks stay ring-free — and inset
on the plot rect so it stays clear of the axis labels. Without the import,
charts fall back to the browser's default focus outline; keyboard access
itself works either way.

The ring rules are scoped to a `mochart-accessible` class that the chart
puts on its root element only while
[`accessibility.enabled`](/reference/accessibility#accessibility.enabled) is
`true` — so a chart with accessibility disabled keeps browser-default
outlines on its native controls (the tooltip's buttons, a linked title)
even with the stylesheet imported.

A focus move the chart makes itself is also ringed, which `:focus-visible`
alone would miss: filtering the focused series from the legend, or clicking a
tooltip row that then unmounts itself, both hand focus to another element
from a pointer interaction. Those get the same outline, so focus is never
invisible after the chart moves it.

## Forced colors and High Contrast

In forced-colors modes (Windows High Contrast among them) the stylesheet
restores the tooltip control buttons to the system palette — `ButtonFace`,
`ButtonText`, `ButtonBorder`, `GrayText` at the disabled ends — and replaces
their hover and active tints, which are `color-mix` over `currentColor` and
flatten to nothing under forced colors, with `Highlight` fills. The focus
ring switches to `Highlight`.

Series fills and strokes are left as configured. They are SVG presentation
attributes from the palette, and forcing them to the system palette would
collapse every series to one color — worse than keeping hues the mode did not
ask about. A chart that has to stay readable there should carry a non-color
encoding as well: distinct
[`markerShape`](/reference/series#series.markerShape) values per series, or
`strokeDashArray` on lines. That advice applies to color-vision deficiency
generally, not only to forced colors.

## Reduced motion

When the user's system requests reduced motion, the chart applies every
update instantly instead of animating, and the preference is watched live.
This is on by default and controlled by
[`accessibility.respectReducedMotion`](/reference/accessibility#accessibility.respectReducedMotion)
— see [Reduced motion](/guide/staged-animation#reduced-motion) in the
animation guide.

## Localizing the labels

Every built-in accessibility string is a config key:

```js
const config = {
  // ...
  accessibility: {
    chartLabel: 'Diagramm',        // svg name when the title has no text
    chartRoleDescription: 'Diagramm',
    plotLabel: 'Diagrammwerte',    // the plot-area tab stop
    seriesLabel: 'Datenreihen',    // the interactive series / pie slices group
    legendLabel: 'Legende',        // the legend group
    tooltipLabel: 'Tooltip-Werte', // the tooltip rows group
    tooltipPreviousLabel: 'Vorherige Kategorie', // the tooltip controls' ‹ button
    tooltipNextLabel: 'Nächste Kategorie'        // … and its › button
  }
};
```

Series and category announcements are built from your data and titles, so
they need no extra translation. The one visible string in the set is the
[tooltip controls'](/guide/interaction#tooltip-controls) mode button, which
is chart UI rather than a screen-reader label — its words localize through
[`tooltip.filterModeText`](/reference/tooltip#tooltip.filterModeText) and
[`tooltip.focusModeText`](/reference/tooltip#tooltip.focusModeText).

## Turning it off

Set [`accessibility.enabled`](/reference/accessibility#accessibility.enabled)
to `false` to render the chart with none of the above — no tab stops, key
handlers, roles, labels, `aria-hidden` markers, or live region — for example
when the host page provides its own accessible alternative to the chart.
Pointer interactions are unaffected, and `respectReducedMotion` is
deliberately not gated by this switch.

## Decorative charts

`enabled: false` still leaves the chart's text content (title, axis and data
labels) exposed to screen readers. For a chart that is *purely decorative* —
say a sparkline repeating a value already shown as text — set
[`accessibility.hidden`](/reference/accessibility#accessibility.hidden) to
`true` instead. The chart's container is marked `aria-hidden` so assistive
tech skips it entirely, and every tab stop the chart itself renders — series,
slices, the plot, tooltip controls, legend items, and a linked title — is
removed with it, so keyboard users cannot land on content screen readers
cannot see. Content you inject through the
[state factories](/guide/chart-states) is yours to make non-focusable. Only do
this when the surrounding page already conveys what the chart shows.

## Exports

A downloaded SVG is a static image, so [exporting](/guide/export) removes
the interactive semantics — the tab stops and their `role`, `aria-label`,
`aria-expanded`, and `aria-pressed` attributes.

What the root svg gets depends on whether the chart has an accessible name
to carry. With accessibility enabled, the chart's own `aria-label` (its
title, or
[`chartLabel`](/reference/accessibility#accessibility.chartLabel)) is left in
place and the svg is marked `role="img"`, so the exported image is announced
by the chart's name. With
[`accessibility.enabled`](/reference/accessibility#accessibility.enabled)
`false` or
[`hidden`](/reference/accessibility#accessibility.hidden) `true` there is no
`aria-label` to keep, so the export is marked `aria-hidden="true"` instead —
an unnamed `role="img"` would be a worse result than the unroled svg it came
from. Add your own `aria-label`, `figcaption` or adjacent text where you
place the image if it needs a name in that case.
