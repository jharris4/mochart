# @mochart/docs

Documentation site for the [@mochart/core](../mochart/README.md) charting
library (private, not published), built with [VitePress](https://vitepress.dev).

The site has three legs:

- **Guide** — getting started, the config model, data providers, staged
  animation, interaction, chart states, plus recipes for common chart shapes.
- **Reference** — generated at build time from the library source, in three
  families. `npm run gen` produces all three models, and the single dynamic
  route in [reference/](reference/) renders every page from them:
  - config sections, from `@mochart/core`'s own descriptions, validators, and
    defaults — the core generator
    (`packages/mochart/scripts/generator.ts`) emits
    `packages/mochart/generated/config-reference.json`;
  - chart props, callbacks, and callback payloads, from the JSDoc on the
    prop interfaces in `@mochart/core`'s `src/types/chart.ts` — the same
    generator emits `packages/mochart/generated/api-reference.json`;
  - framework props, from the five binding packages' own prop declarations —
    [scripts/generateBindings.ts](scripts/generateBindings.ts) emits
    `generated/binding-reference.json`.

  Every one of them fails the build on drift; see
  [CONTRIBUTING.md](../../CONTRIBUTING.md#the-props-callbacks-and-framework-props-pipeline)
  for what counts as drift and how to add a prop. `reference/api.md` is the
  one reference page written by hand.
- **Demos** — the nav links to the demo galleries, which
  `scripts/build-pages.mjs` nests next to the docs on the deployed site.
  Under `vitepress dev` those links 404; use the demo dev servers instead.

Charts on guide/recipe pages are live: the
[LiveChart](.vitepress/theme/LiveChart.vue) theme component mounts
`createDefaultChart` over a config/dataset pair from [examples/](examples/).
Every example is validated in CI with the library's own `validateConfig` and
`getDataErrors`, so a broken example fails the build instead of rendering an
error state.

`npm test` here regenerates the reference models and then runs three checks
over them:

- [scripts/checkExamples.ts](scripts/checkExamples.ts) — every example config
  and dataset validates;
- [scripts/checkApiCoverage.ts](scripts/checkApiCoverage.ts) — every public
  export, `ChartHandle` method, chart prop, and non-JS artifact is documented
  somewhere;
- [scripts/checkSectionCoverage.ts](scripts/checkSectionCoverage.ts) — the
  usage-index registries in
  [.vitepress/lib/usageIndex.ts](.vitepress/lib/usageIndex.ts) cover every
  config section core emits, so no section loses its "Used in" links.

## Scripts

Run from the repo root:

```sh
npm run dev -w @mochart/docs        # generate reference models + vitepress dev (port 5181)
npm run build -w @mochart/docs      # generate reference models + vitepress build
npm run gen -w @mochart/docs        # generate the three reference models only
npm run preview -w @mochart/docs    # preview the built site
npm test -w @mochart/docs           # generate, then the three checks above
npm run typecheck -w @mochart/docs
```

The generated models are gitignored, which is why `dev`, `build`, and `test`
each run `gen` first; invoking `vitepress` directly needs it run by hand.

The deployed site is assembled by `scripts/build-pages.mjs`, which builds
this package with the deploy base path and places the demo galleries at
`/vanilla/`, `/react/`, etc. next to it.
