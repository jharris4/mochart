# mochart-demo-angular

Angular demo gallery for [mochart](../mochart/README.md), built on
[mochart-angular](../mochart-angular/README.md) (private, not published).

The full-featured demo app: browse every demo chart in single, multi,
transition, and rotation modes, or generate whole random datasets in random
mode. The JSON demo configs and datasets are shared from
[mochart-demo-data](../mochart-demo-data/README.md); [mochart-demo-basic](../mochart-demo-basic/README.md)
is a smaller no-framework harness of the same demos that hosts the e2e suite.

It is a plain Vite app like the other galleries — `@analogjs/vite-plugin-angular`
provides the Angular AOT compilation, routing comes from `@angular/router`,
and change detection is zoneless.

## Install

This repo uses npm workspaces; install once from the repo root:

```sh
npm install
```

## Run

From the repo root:

```sh
npm run dev -w mochart-demo-angular       # vite dev server on http://localhost:5180
npm run build -w mochart-demo-angular     # production build to dist/
npm run preview -w mochart-demo-angular   # preview the production build on http://localhost:4180
```

Or run the same scripts with `npm run dev` etc. from this directory.
