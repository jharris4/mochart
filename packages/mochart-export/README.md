# mochart-export

SVG and PNG image export for the
[mochart](https://github.com/jharris4/mochart) charting library. Give it any
element containing a rendered chart and it downloads the chart as a
standalone image — computed styles inlined, crosshair stripped, and an
optional solid background painted beneath the chart.

The export captures everything inside the chart svg (title, plot, axes,
legend); the HTML tooltip is never included.

## Install

```sh
npm install mochart-export
```

## Usage

```js
import { exportSVG, exportPNG } from 'mochart-export';

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
  backgroundColor: '#f5f5f5' // background color when not transparent (default #ffffff)
});

await exportPNG(element, {
  // all of the svg options, plus:
  scale: 3 // rasterization scale relative to the on-screen size (default 2)
});
```

### Lower-level helpers

```js
import { findChartSvg, getChartSvgText } from 'mochart-export';

const svgElement = findChartSvg(element); // SVGSVGElement | null
const svgMarkup = getChartSvgText(element, { transparent: true }); // string | null
```

`getChartSvgText` returns the standalone svg markup without triggering a
download — useful for tests or for piping the markup elsewhere.
