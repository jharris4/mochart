# Theming and dark mode

A chart has two kinds of color. **Series colors** — bars, lines, markers,
slices — come from the config: the
[color palette](/reference/colorPalette), per-series style overrides, or a
color ramp. **Chrome** — the title, axis lines, tick marks and labels, grid
lines, the legend, the crosshair — defaults to the CSS keyword
`currentColor`, so it resolves to whatever CSS `color` the chart's container
inherits from your page.

That split is most of the theming story. Put the chart on a page whose text
color flips with the theme and every piece of chrome follows along, with no
config and no second stylesheet — the live examples on this site restyle
when you toggle the site theme (try it). Series colors never follow the
page; they stay whatever the palette or your config says.

<script setup>
import * as theming from '../examples/theming'
</script>

The page color doesn't have to be a theme. This chart's host element sets
`style="color: #7c3aed"`, and every default-styled piece of chrome takes the
tint while the series keep their palette colors:

<LiveChart :config="theming.config" :data="theming.data" color="#7c3aed" />

## How it works

Chrome style fields default to `'currentColor'`, which is written to the
rendered SVG as-is — the browser resolves it against the inherited `color`,
so mochart never computes a theme itself. The defaults that resolve this
way:

- the title text, and the axis title texts
- axis lines, tick marks, and tick label text
- grid lines, the axis focus range, and focus tick marks
- the crosshair lines
- legend item text, and the series-icon borders in the legend and tooltip
- series value labels, and the pie center labels

Each comes with a tuned default opacity so a single value reads correctly
over both light and dark backgrounds — grid lines at `strokeOpacity` 0.13,
axis lines and tick marks at 0.65, the crosshair at 0.3, text at or near 1.
Chrome contrast is therefore adjusted through opacities, not by picking new
colors per theme.

## What does not follow the page

- **Series colors.** The palette and the color-ramp fields produce concrete
  colors by design — chart data should look the same on every page. Restyle
  them per theme by passing a different config (for example a different
  [`colorPalette`](/reference/colorPalette)) when your theme changes.
- **Colors you set yourself.** Any literal color in your config is used
  exactly as written, in every theme.
- **The tooltip surface** — see below.

## Dark mode

For chrome there is nothing to configure: when your page (or the chart's
container) sets a light text color on a dark background, the chart follows.

The tooltip is the one exception. It is an HTML overlay, and its background
and border form a *surface* that must sit at the opposite end of the
contrast pair from the text on top of it — something no inherited text
color can express — so its defaults are a translucent white background with
a dark border. Its text does inherit the page color, which is right for a
light surface in both themes; if you keep the light surface on a dark page,
scope a `color` override to the tooltip instead. To flip the surface
itself, override it with CSS scoped to your dark theme (the colors are
inline styles, so the overrides need `!important`):

```css
html.dark .mochart-tooltip-container .mochart-tooltip {
  background: rgba(32, 33, 39, 0.94) !important;
  border-color: rgba(140, 145, 160, 0.55) !important;
}
```

This is exactly what this docs site does for its live examples.
Alternatively, keep it in config: pass a config with a dark
[`tooltip.backgroundStyle`](/reference/tooltip#tooltip.backgroundStyle)
when your theme changes.

## Using `currentColor` in your config

Every style color field accepts `'currentColor'`
([the config model](/guide/config-model#styles-and-focus-states) covers the
style shape), so any element you restyle can opt back into following the
page — for example a series drawn in the page's text color:

```js
series: [{
  property: 'total',
  shapeStyle: { normal: { fillColor: 'currentColor' } }
}]
```

The one place it is rejected is the series color-scale bounds
(`colorMin` / `colorMax` and friends): those are interpolated by d3 scales,
which need concrete colors, so validation turns a keyword away rather than
letting it produce `NaN` colors.

## Exports

Exported images inline the chart's *resolved* colors, so a chart exported
from a dark page has light chrome — pass the export a background color that
matches the page, or export transparent. See
[Exporting images](/guide/export#dark-pages).
