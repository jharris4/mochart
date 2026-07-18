# mochart documentation improvement plan

Status: proposed (July 2026). This is the working plan for bringing mochart's
documentation from "good READMEs + a raw HTML config dump" to a real docs
site with a generated reference, guides, IDE hover docs, and demo integration.
Check items off as they land.

## Where we are today

**Assets worth building on**

- The READMEs (root, `@mochart/core`, each binding) are recently rewritten and
  solid: features, staged-animation explanation, quick starts, config section
  overview, callbacks, states.
- The config system is already a machine-readable single source of truth:
  per-section **descriptions** (`packages/mochart/src/config/docs/`),
  **validators** (`config/validation/`), and **defaults** including
  conditional defaults (`config/defaults/`). `scripts/generator.ts` already
  walks all of it and cross-checks key parity.
- Six full demo galleries (vanilla + five frameworks) deployed to GH
  Pages/Cloudflare via `scripts/build-pages.mjs`, all sharing configs
  (`@mochart/demo-data`), logic (`@mochart/demo-common`), and UI copy
  (`demoText`).
- Build-free static HTML examples in `packages/mochart/example/`.

**Gaps**

1. **No docs site.** The deployed landing page is a bare list of demo links;
   everything else lives only in READMEs on GitHub.
2. **The config reference is a dead end.** `generator.ts` emits one unstyled
   HTML table file (`mochart-docs.html`) that is not deployed, has no
   navigation/search, no type-level formatting, no examples, and no links to
   the demos. The underlying descriptions are terse one-liners written for
   table cells.
3. **No IDE hover docs.** The shipped `.d.ts` types have almost no JSDoc
   (~13 doc comments across hundreds of config properties), so none of the
   `config/docs/` descriptions reach the editor — the place most users will
   actually look for "what does `capExpand` do?".
4. **Demos demonstrate but don't teach.** You can edit config/data JSON, but
   nothing explains what you're looking at, links a config property to its
   docs, or lets you share a tweaked chart.
5. **No task-oriented guides.** There is no "how do I make a stacked bar
   chart / dual axis / date axis / horizontal chart / gradient fill" content;
   users must reverse-engineer demo configs.
6. **No API (function/class) reference** beyond README prose — `ChartHandle`,
   data providers, `enhanceConfig`, render primitives, etc.

## Target end state

One deployed site (same GH Pages/Cloudflare pipeline) with three legs:

- **Guide** — getting started, core concepts, per-framework pages, recipes.
- **Reference** — generated config reference (per-section pages) + API
  reference, with live rendered examples where they help.
- **Demos** — the existing galleries, cross-linked both ways with the docs.

Plus IDE-level docs: every public config property documented in the shipped
`.d.ts`, generated from the same `config/docs/` source so it can never drift.

## Phase 1 — Config reference data model (foundation)

Everything downstream (site pages, JSDoc, demo tooltips) should consume one
generated artifact instead of each re-walking the config modules.

- [x] Refactor `packages/mochart/scripts/generator.ts` to first build a
      structured JSON model (`scripts/configReferenceModel.ts`): per section →
      per property → `{ description, details?, rules[], default |
      conditionalDefaults[] }`. Key-parity integrity checks now fail the run
      (exit 1) and execute in CI via the docs build; fixing the check exposed
      and fixed four misnamed threshold description keys.
- [x] Emit the model to `packages/mochart/generated/config-reference.json`
      (gitignored, built like `dist/`).
- [x] Keep a thin HTML renderer over the model — `mochart-docs.html` still
      generates.
- [x] Details mechanism: docs modules may export `getDetails()`; ~28 details
      written for the trickiest properties (series wiring/renderers/missing
      values, axis bounds, animation phases, legend interaction, stacking).
      Remaining properties get details incrementally.

## Phase 2 — Docs site

- [x] New private package `packages/mochart-docs` using **VitePress**
      (Vite-native like everything else in the repo, markdown-first, built-in
      search/nav/dark mode). Alternative considered: Astro Starlight — heavier
      dependency footprint for no extra benefit here.
- [x] Guide content (first milestone): getting started + core concepts (the
      config model, data providers, staged animation, interaction, chart
      states), all with live charts where they help.
- [ ] One page per framework binding (adapted from binding READMEs) —
      follow-up.
- [x] Recipes (first three, proving the live-chart pattern): stacked bars,
      dual value axes, date axis.
- [ ] Remaining recipes: grouped series, horizontal (inverted) charts,
      thresholds & ranges, gradients, markers & labels, custom tooltip
      formatting — follow-up.
- [x] Config reference pages rendered from `config-reference.json` at build
      time via a dynamic route (`reference/[section].md` + paths loader), one
      page per section with stable `#sectionId.propertyKey` anchors, color
      swatches for color defaults, and a generated overview table.
- [x] Live charts in markdown: the `LiveChart` theme component mounts
      `createDefaultChart` over example modules from `examples/`; every
      example is validated in CI with `validateConfig`/`getDataErrors`
      (`npm test -w @mochart/docs`). This immediately caught that strict
      validation requires `version` — every README quick start was broken;
      all fixed, along with pre-rename `npm install mochart-*` commands and
      stale `1.0.3` versions in the static HTML examples.
- [ ] API reference for the public exports (`src/index.ts`) — follow-up.
- [x] Wire into `scripts/build-pages.mjs`: the docs site IS the site root
      (bare landing page deleted); demos stay at `/<slug>/`; the demo
      deep-link redirect is injected into VitePress's 404.html;
      `_redirects`/.nojekyll unchanged.
- [x] Docs build runs in `ci.yml` via `build:pages` (VitePress fails the
      build on dead internal links); example validation runs via root
      `npm test`, typecheck via root `npm run typecheck`.

## Phase 3 — IDE hover docs from the same source

- [x] Codegen JSDoc onto the config types: `scripts/generateJsdoc.ts`
      rewrites doc comments on every model-covered property (description +
      details + defaults, incl. conditional defaults and merged
      group/series-axis defaults on `AxisConfigBase`), leaving uncovered
      members untouched. `npm run generate-jsdoc -w @mochart/core`; the
      ratchet is `test/config/jsdocSync.test.ts`, which fails when the file
      drifts from the model.
- [x] Hand-documented the non-config public API surface: `ChartHandle`,
      `createChart`/`createDefaultChart` props, callbacks, state factories,
      event payloads, and the `DataProvider` interface.
- [x] Verified the JSDoc survives into `dist/types/*.d.ts` (the `types`
      export condition; the `development` condition serves `src` directly).

## Phase 4 — Demos that teach

- [ ] Shareable state: encode the edited config/data (or a diff from the
      base demo) in the URL hash in `@mochart/demo-common`, so docs pages and
      users can deep-link a specific chart state. All six galleries get it
      for free if it lives in the shared layer.
- [ ] Cross-linking, both directions:
      - Reference pages link each recipe/demo that exercises the property.
      - Demo config editors link section/property names to the reference
        anchors (`site/docs/reference/<section>#<section>.<key>`).
- [ ] Per-demo blurbs: one or two sentences per demo config in
      `@mochart/demo-data` (next to the JSON, surfaced by all galleries and
      reusable as recipe intro text).
- [ ] Optional, later: a dedicated "playground" page in the docs site — the
      vanilla single-demo editor embedded with a config picker. Only worth it
      if the shareable-URL + cross-link combination proves insufficient.

## Phase 5 — Polish and upkeep

- [ ] Landing page redesign (docs home): hero chart, one-paragraph pitch,
      quick-start snippet, links to galleries per framework.
- [ ] Contributor docs: how the config metadata pipeline works (docs/
      validators/defaults parity, how to add a config property end to end),
      how golden tests work, how the site builds.
- [ ] Keep-fresh guardrails in CI: config parity check (Phase 1), JSDoc diff
      check (Phase 3), docs build + dead-link check (Phase 2).
- [ ] Later, if/when versioned releases matter: docs versioning strategy.

## Sequencing

Phase 1 → 2 is the critical path and delivers the most visible win (a real
docs site with a browsable config reference). Phase 3 is independent after
Phase 1 and is the highest value-per-effort for existing users. Phase 4 items
are independent of each other and can be picked off ad hoc. Suggested first
milestone: Phase 1 complete + VitePress skeleton with getting started, core
concepts, and generated reference deployed under `site/docs/`.
