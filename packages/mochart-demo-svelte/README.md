# mochart-demo-svelte

Svelte 5 demo gallery for [mochart](../mochart/README.md), built on
[mochart-svelte](../mochart-svelte/README.md) (private, not published).

The full-featured demo app: browse every demo chart in single, multi,
transition, and rotation modes, or generate whole random datasets in random
mode. The JSON demo configs and datasets are shared from
[mochart-demo](../mochart-demo/README.md), a smaller vanilla-TS harness of
the same demos.

## Install

This repo uses npm workspaces; install once from the repo root:

```sh
npm install
```

## Run

From the repo root:

```sh
npm run dev -w mochart-demo-svelte       # vite dev server on http://localhost:5175
npm run build -w mochart-demo-svelte     # production build to dist/
npm run preview -w mochart-demo-svelte   # preview the production build on http://localhost:4175
```

Or run the same scripts with `npm run dev` etc. from this directory.
