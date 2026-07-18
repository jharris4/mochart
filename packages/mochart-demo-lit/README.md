# mochart-demo-lit

Lit port of the [mochart-demo](../mochart-demo/README.md) gallery, built on
[mochart-lit](../mochart-lit/README.md) (private, not published).

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
npm run dev -w mochart-demo-lit       # vite dev server on http://localhost:5177
npm run build -w mochart-demo-lit     # production build to dist/
npm run preview -w mochart-demo-lit   # preview the production build on http://localhost:4177
```

Or run the same scripts with `npm run dev` etc. from this directory.
