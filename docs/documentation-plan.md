# mochart documentation improvement plan

Status: delivered (August 2026) — every non-optional item is checked off;
only the explicitly optional/later entries remain open. This was the working
plan for bringing mochart's documentation from "good READMEs + a raw HTML
config dump" to a real docs site with a generated reference, guides, IDE
hover docs, and demo integration.

## Where we were (the pre-plan snapshot, July 2026)

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

**Gaps at the time**

1. **No docs site.** The deployed landing page was a bare list of demo links;
   everything else lived only in READMEs on GitHub.
2. **The config reference is a dead end.** `generator.ts` emitted one unstyled
   HTML table file (`mochart-docs.html`) that was not deployed, with no
   navigation/search, no type-level formatting, no examples, and no links to
   the demos. The underlying descriptions were terse one-liners written for
   table cells.
3. **No IDE hover docs.** The shipped `.d.ts` types had almost no JSDoc
   (~13 doc comments across hundreds of config properties), so none of the
   `config/docs/` descriptions reached the editor — the place most users will
   actually look for "what does `capExpand` do?".
4. **Demos demonstrate but don't teach.** You could edit config/data JSON, but
   nothing explained what you were looking at, linked a config property to its
   docs, or let you share a tweaked chart.
5. **No task-oriented guides.** There was no "how do I make a stacked bar
   chart / dual axis / date axis / horizontal chart / gradient fill" content;
   users had to reverse-engineer demo configs.
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
- [x] One page per framework binding (guide/frameworks/, adapted from the
      binding READMEs): install, quick start in the framework's idiom,
      container-based sizing, callbacks/state placeholders, demo gallery
      link.
- [x] Recipes (first three, proving the live-chart pattern): stacked bars,
      dual value axes, date axis.
- [x] Remaining recipes: grouped series, horizontal (inverted) charts,
      thresholds & ranges, gradients, markers & labels, tooltip formatting —
      each with a live chart, the validated example config, and a "how it
      works" section linking into the reference.
- [x] Config reference pages rendered from `config-reference.json` at build
      time via a dynamic route (`reference/[section].md` + paths loader), one
      page per section with stable `#sectionId.propertyKey` anchors, color
      swatches for color defaults, and a generated overview table.
- [x] Live charts in markdown: the `LiveChart` theme component mounts
      `createDefaultChart` over example modules from `examples/`; every
      example is validated in CI with `validateConfig`/`getDataErrors`
      (`npm test -w @mochart/docs`). This immediately caught that strict
      validation required `version` at the time — every README quick start was
      broken;
      all fixed, along with pre-rename `npm install mochart-*` commands and
      stale `1.0.3` versions in the static HTML examples.
- [x] API reference page (`reference/api`): the entry points, `ChartHandle`,
      data providers, config helpers, constants, styling hooks, and a brief
      map of the advanced exports; handwritten, consistent with the Phase 3
      JSDoc.
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
      category/value-axis defaults on `AxisConfigBase`), leaving uncovered
      members untouched. `npm run generate-jsdoc -w @mochart/core`; the
      ratchet is `test/config/jsdocSync.test.ts`, which fails when the file
      drifts from the model.
- [x] Hand-documented the non-config public API surface: `ChartHandle`,
      `createChart`/`createDefaultChart` props, callbacks, state factories,
      event payloads, and the `DataProvider` interface.
- [x] Verified the JSDoc survives into `dist/types/*.d.ts` (the `types`
      export condition; the `development` condition serves `src` directly).

## Phase 4 — Demos that teach

- [x] Shareable state: demo-common's shareState module encodes the edited
      config/data as a base64url payload in the URL hash; every gallery has
      a Share button (next to the export buttons) and consumes the payload
      on mount. Building this surfaced and fixed a latent circular-reference
      bug in buildMochartDemoConfig for configs without explicit
      valueAxes.
- [x] Cross-linking, both directions:
      - Reference pages: a build-time usage index scans the docs example
        configs and the demo-data configs and renders capped "Used in" links
        per property (guide/recipe pages first, then vanilla-gallery demos).
      - Demo config editors: the Config tab footer links each reference
        section the edited config uses to its generated reference page
        (derived from the config keys, so no curation needed).
- [x] Per-demo blurbs: every demo carries a description in demos.json,
      rendered under the title in every gallery's Demos list.
- [x] Docs → demo hand-off: every live chart on the docs site has an "Open
      in demo" link that deep-links the vanilla gallery with that chart's
      exact config/data as a share payload.
- [ ] Optional, later: a dedicated "playground" page in the docs site — the
      vanilla single-demo editor embedded with a config picker. Only worth it
      if the shareable-URL + cross-link combination proves insufficient.

## Phase 5 — Polish and upkeep

- [x] Landing page (docs home): hero + linked feature cards, live hero
      chart with animate + open-in-demo controls, quick-start snippet, and
      per-framework guide/gallery link sections.
- [x] Contributor docs: CONTRIBUTING.md covers the config metadata
      pipeline (with add-a-property and add-a-section checklists), golden
      tests, gallery conventions, docs-site pitfalls, site assembly/deploy,
      and the CI guardrail summary.
- [x] Keep-fresh guardrails in CI — all landed with their phases: config
      parity fails the generator (→ build:pages), the JSDoc sync test and
      docs example validation run in root npm test, VitePress dead-link
      checking runs in the docs build. Summarized in CONTRIBUTING.md.
- [ ] Later, if/when versioned releases matter: docs versioning strategy
      (deliberately deferred — nothing versioned is published yet).

## Sequencing

Phase 1 → 2 is the critical path and delivers the most visible win (a real
docs site with a browsable config reference). Phase 3 is independent after
Phase 1 and is the highest value-per-effort for existing users. Phase 4 items
are independent of each other and can be picked off ad hoc. Suggested first
milestone: Phase 1 complete + VitePress skeleton with getting started, core
concepts, and generated reference deployed under `site/docs/`.
