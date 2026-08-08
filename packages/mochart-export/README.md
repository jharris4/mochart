# @mochart/export

SVG and PNG image export for the
[@mochart/core](https://github.com/jharris4/mochart) charting library. Give it any
element containing a rendered chart and it downloads the chart as a
standalone image — computed styles inlined, crosshair stripped, and an
optional solid background painted beneath the chart.

The export captures everything inside the chart svg (title, plot, axes,
legend); the HTML tooltip is never included. Several charts can also be
tiled into a single image — see
[multiple charts in one image](#multiple-charts-in-one-image).

## Install

```sh
npm install @mochart/export @mochart/core
```

## Usage

```js
import { exportSVG, exportPNG } from '@mochart/export';

// element can be the chart's container, the div.mochart-chart root itself,
// or the chart <svg> element
exportSVG(element);
await exportPNG(element);
```

Both functions look up the chart svg inside `element`, derive the filename
from the chart title (falling back to `export`), and trigger a browser
download. `exportSVG` returns `false` (and `exportPNG` resolves `false`)
when no chart svg is found.

### Options

```js
exportSVG(element, {
  filename: 'my-chart',      // exact filename (no extension); overrides the title
  filenamePrefix: 'acme-',   // prefix for the title-derived filename
  transparent: true,         // keep the background transparent
  backgroundColor: '#f5f5f5' // background when not transparent (defaults to the page background behind the chart)
});

await exportPNG(element, {
  // all of the svg options, plus:
  scale: 3 // rasterization scale relative to the on-screen size (default 2)
});
```

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

All the single-chart options apply — the filename is derived from the first
chart found — plus:

```js
exportChartsSVG(elements, {
  cols: 2, // required: number of grid columns
  gap: 16  // pixels between tiles, both axes (default 0)
});

await exportChartsPNG(elements, {
  // all of the stitch options, plus:
  scale: 3 // rasterization scale relative to the tiled grid's size (default 2)
});
```

Elements without a chart svg are skipped; the export returns `false` (PNG:
resolves `false`) only when none of the elements contain one.

## Lower-level helpers

```js
import { findChartSvg, getChartSvgText, getStitchedChartsSvgText } from '@mochart/export';

const svgElement = findChartSvg(element); // SVGSVGElement | null
const svgMarkup = getChartSvgText(element, { transparent: true }); // string | null
const gridMarkup = getStitchedChartsSvgText([elementA, elementB], { cols: 2 }); // string | null
```

`getChartSvgText` and `getStitchedChartsSvgText` return the standalone svg
markup without triggering a download — useful for tests or for piping the
markup elsewhere.

For TypeScript hosts, the option shapes are exported as `ExportSvgOptions`,
`ExportPngOptions`, `StitchOptions`, and `StitchPngOptions`.
