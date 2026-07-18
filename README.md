# mochart monorepo

Monorepo for **mochart**, an animated interactive SVG charting library with
zero framework dependencies, plus its framework wrappers, demo gallery, and
the **movalid** validation library it uses for config validation.

What sets mochart apart is its
[staged animation](packages/mochart/README.md#staged-animation) model: updates
play as axis expansion → value change (including group and series
transitions) → axis contraction, so only one kind of change is in motion at a
time, and stacked series animate as a single unit so the stack never shows
gaps between segments mid-transition.

## Packages

| Package | Description |
| --- | --- |
| [mochart](packages/mochart/README.md) | The core charting library — animated, interactive SVG charts rendered with a retained-mode renderer (no vdom, no framework). |
| [mochart-react](packages/mochart-react/README.md) | React components wrapping mochart. |
| [mochart-svelte](packages/mochart-svelte/README.md) | Svelte 5 components wrapping mochart. |
| [mochart-vue](packages/mochart-vue/README.md) | Vue 3 components wrapping mochart. |
| [mochart-lit](packages/mochart-lit/README.md) | lit-html directives wrapping mochart. |
| [mochart-export](packages/mochart-export/README.md) | SVG and PNG image export for rendered mochart charts. |
| [mochart-demo](packages/mochart-demo/README.md) | Minimal demo gallery app (private) — browse every chart config with live data controls; home of the shared demo configs and the Playwright e2e suite. |
| [mochart-benchmark](packages/mochart-benchmark/README.md) | Performance benchmark harness (private) — measures mount/update/frame-time cost of generated charts at configurable sizes. |
| [movalid](packages/movalid/README.md) | Simple yet powerful chainable JavaScript validators with human-readable error messages. |

Each wrapper framework also has a full-featured demo gallery —
`mochart-demo-react`, `mochart-demo-svelte`, `mochart-demo-vue`, and
`mochart-demo-lit` (all private) — with single/multi/random/transition/rotation
demo modes; they share the demo configs from `mochart-demo`, which is a
smaller vanilla-TS harness of the same demos.
There are also build-free static HTML examples in
[packages/mochart/example](packages/mochart/example/README.md).

## Getting started

This repo uses npm workspaces:

```sh
npm install
npm run dev        # start the demo gallery (mochart-demo) with vite
```

## Scripts

Run from the repo root:

```sh
npm run dev         # dev server for the demo gallery
npm run build       # build the demo gallery
npm test            # run tests in every workspace that has them
npm run typecheck   # typecheck every workspace that has a typecheck script
```

Target a single package with `-w`, e.g. `npm test -w mochart`.

## License

BSD-3-Clause
