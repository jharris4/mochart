# Exporting images

The [@mochart/export](https://github.com/jharris4/mochart/tree/main/packages/mochart-export)
companion package downloads a rendered chart as a standalone SVG or PNG
file. The export captures everything inside the chart svg — title, plot,
axes, and legend, in their current state — with the chart's computed styles
inlined, so the image renders the same outside your page's stylesheets. The
crosshair is stripped, and the HTML tooltip is never included.

<script setup>
import * as basic from '../examples/basic'
</script>

<LiveChart :config="basic.config" :data="basic.data" :export-buttons="true" />

## Install

```sh
npm install @mochart/export
```

The package is framework-free, like the core library — the same functions
work with every [framework binding](/guide/frameworks/react).

## Downloading a chart

```js
import { exportSVG, exportPNG } from '@mochart/export';

exportSVG(element);
await exportPNG(element);
```

`element` can be the chart's container, the `div.mochart-chart` root itself,
or the chart `<svg>` — the functions find the chart svg from any of them.
With a framework binding, a ref to the element wrapping the chart component
works. The filename is derived from the chart title (`Monthly Revenue` →
`Monthly_Revenue.svg`), falling back to `export`; `exportSVG` returns
`false` (and `exportPNG` resolves `false`) when no chart svg is found.

### Options

```js
exportSVG(element, {
  filename: 'my-chart',      // exact filename (no extension); overrides the title
  filenamePrefix: 'acme-',   // prefix for the title-derived filename
  transparent: true,         // keep the background transparent
  backgroundColor: '#f5f5f5' // background when not transparent (default #ffffff)
});

await exportPNG(element, {
  // all of the svg options, plus:
  scale: 3 // rasterization scale relative to the on-screen size (default 2)
});
```

The PNG is rasterized through an offscreen canvas at `scale` times the
chart's on-screen pixel size — the default of `2` keeps exports crisp on
high-DPI displays.

### Dark pages

The chart's structural colors (axis and legend text, grid lines, …) default
to following the host page via `currentColor`
(see [Theming and dark mode](/guide/theming)), and the export inlines those
resolved colors. On a dark page that means light text — so pass a
`backgroundColor` that matches the page instead of the white default (the
buttons above do exactly that, following the site theme), or export
`transparent` and let the destination supply the background.

## Multiple charts in one image

```js
import { exportChartsSVG, exportChartsPNG } from '@mochart/export';

// tile the charts found in the elements into a 2-column grid
exportChartsSVG([elementA, elementB, elementC], { cols: 2 });
await exportChartsPNG([elementA, elementB, elementC], { cols: 2, gap: 16 });
```

The charts are tiled left to right, top to bottom into `cols` columns (rows
follow from the count). Every cell is sized to the largest chart and smaller
charts are centered within their cells, so mixed sizes stay aligned.
`gap` adds pixels between tiles (default `0`). All the single-chart options
apply, with the filename derived from the first chart found. Elements
without a chart svg are skipped; the export returns `false` only when none
of the elements contain one.

## Markup without a download

```js
import { findChartSvg, getChartSvgText, getStitchedChartsSvgText } from '@mochart/export';

const svgElement = findChartSvg(element); // SVGSVGElement | null
const svgMarkup = getChartSvgText(element, { transparent: true }); // string | null
const gridMarkup = getStitchedChartsSvgText([elementA, elementB], { cols: 2 }); // string | null
```

`getChartSvgText` and `getStitchedChartsSvgText` return the same standalone
svg markup the download functions produce — useful for tests, server-side
storage, or piping the markup into another tool.

## Try it in the demos

Every [demo gallery](/vanilla/demos) has a share menu with these exports
wired up — including the tiled multi-chart export on the Multi tab.
