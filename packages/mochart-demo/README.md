# mochart-demo

Demo gallery for the [mochart](../mochart/README.md) charting library
(private, not published).

A minimal vanilla-TypeScript Vite app that renders every demo chart from JSON
config/data pairs, with live controls to exercise mochart's
[staged animations](../mochart/README.md#staged-animation):
randomize values (kept within each demo's random spec and axis range),
add/remove groups — which plays the full axis expansion → value change →
axis contraction sequence — and autoplay. The stacked demos show the gapless
stacked transitions.

The full-featured galleries live in the framework packages
([mochart-demo-react](../mochart-demo-react/README.md),
[mochart-demo-svelte](../mochart-demo-svelte/README.md),
[mochart-demo-vue](../mochart-demo-vue/README.md),
[mochart-demo-lit](../mochart-demo-lit/README.md)) — they share this
package's demo configs. This app is the smallest harness around the same
demos and hosts the Playwright e2e suite.

## Install

This repo uses npm workspaces; install once from the repo root:

```sh
npm install
```

## Run

From the repo root:

```sh
npm run dev        # vite dev server on http://localhost:5173
npm run build      # production build to dist/
npm run preview    # preview the production build on http://localhost:4173
npm run test:e2e   # playwright end-to-end tests (see e2e/)
```

## Adding a demo

Demos are driven by [demos/demos.json](demos/demos.json), which lists entries
under `demos` (showcase) and `testDemos` (edge cases). Each entry points at a
config file in [demos/config/](demos/config/), a dataset in
[demos/data/](demos/data/), and a randomization spec in
[demos/random/](demos/random/) by basename:

```json
{
  "id": "revenue",
  "title": "Revenue",
  "config": "revenue-config.json",
  "data": "revenue-data.json",
  "random": "default-random.json"
}
```

Drop the two JSON files in place, add the entry, and the gallery picks it up —
all configs and datasets are bundled eagerly via `import.meta.glob`.
