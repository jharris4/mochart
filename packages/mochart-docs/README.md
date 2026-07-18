# @mochart/docs

Documentation site for the [@mochart/core](../mochart/README.md) charting
library (private, not published), built with [VitePress](https://vitepress.dev).

The site has three legs:

- **Guide** — getting started, the config model, data providers, staged
  animation, interaction, chart states, plus recipes for common chart shapes.
- **Config reference** — generated at build time from
  `@mochart/core`'s own descriptions, validators, and defaults. `npm run gen`
  runs the core generator (`packages/mochart/scripts/generator.ts`), which
  emits `packages/mochart/generated/config-reference.json`; the dynamic route
  in [reference/](reference/) renders one page per config section from it.
- **Demos** — the nav links to the demo galleries, which
  `scripts/build-pages.mjs` nests next to the docs on the deployed site.
  Under `vitepress dev` those links 404; use the demo dev servers instead.

Charts on guide/recipe pages are live: the
[LiveChart](.vitepress/theme/LiveChart.vue) theme component mounts
`createDefaultChart` over a config/dataset pair from [examples/](examples/).
Every example is validated in CI with the library's own `validateConfig` and
`getDataErrors` (`npm test` here runs [scripts/checkExamples.ts](scripts/checkExamples.ts)),
so a broken example fails the build instead of rendering an error state.

## Scripts

Run from the repo root:

```sh
npm run dev -w @mochart/docs        # generate reference model + vitepress dev (port 5181)
npm run build -w @mochart/docs      # generate reference model + vitepress build
npm run preview -w @mochart/docs    # preview the built site
npm test -w @mochart/docs           # validate the example configs/datasets
npm run typecheck -w @mochart/docs
```

The deployed site is assembled by `scripts/build-pages.mjs`, which builds
this package with the deploy base path and places the demo galleries at
`/vanilla/`, `/react/`, etc. next to it.
