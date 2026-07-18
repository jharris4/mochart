# mochart-demo-vue

Vue 3 port of the [mochart-demo](../mochart-demo/README.md) gallery, built on
[mochart-vue](../mochart-vue/README.md) (private, not published).

Renders the same demo charts as the vanilla gallery — the JSON config/data
pairs are shared from `mochart-demo` — with live controls to randomize values,
add/remove groups, and autoplay.

## Install

This repo uses npm workspaces; install once from the repo root:

```sh
npm install
```

## Run

From the repo root:

```sh
npm run dev -w mochart-demo-vue       # vite dev server on http://localhost:5176
npm run build -w mochart-demo-vue     # production build to dist/
npm run preview -w mochart-demo-vue   # preview the production build on http://localhost:4176
```

Or run the same scripts with `npm run dev` etc. from this directory.
