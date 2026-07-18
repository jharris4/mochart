# mochart-demo

Demo gallery for the [mochart](../mochart/README.md) charting library
(private, not published).

A Vite app that renders every demo chart from JSON config/data pairs, with
live controls to exercise mochart's animations: randomize values, add/remove
groups, and autoplay.

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
