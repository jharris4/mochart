# Contributing to mochart

This guide covers how the repo fits together for people changing mochart
itself — especially the config metadata pipeline, whose sources feed
validation, the generated documentation, and IDE hovers all at once. For
using the library, start at the [documentation site](packages/mochart-docs/README.md)
or the [core README](packages/mochart/README.md).

## Getting started

```sh
npm install     # runs prepare → build:libs, which builds every library dist
npm run dev     # demo gallery dev server (@mochart/demo-vanilla)
npm run dev:docs  # documentation site dev server (port 5181)
```

Every pull request is gated on the root scripts below. CI runs them in this
order and stops at the first failure, so running them in the same order locally
is the quickest way to reproduce a red build:

```sh
npm run lint      # eslint over the whole repo
npm run deadcode  # knip: unused exports, files and dependencies
npm run typecheck # every workspace that has a typecheck script
npm test          # tests in every workspace that has them
npm run test:e2e  # Playwright suite (hosted by @mochart/demo-basic)
```

`test:e2e` needs a browser once per machine: `npx playwright install chromium`.
CI then runs `build:pages` twice, once per base path; the checks that step
carries are listed under [CI guardrails, in one
place](#ci-guardrails-in-one-place).

The library packages ship built `dist/` output that is gitignored, so a fresh
clone must `npm install` before anything imports `@mochart/core` by its
default export condition (dev servers use the `development` condition and run
from `src/`). Target one workspace with `-w`, e.g.
`npm test -w @mochart/core`. `lint` and `deadcode` exist only at the root;
narrow them with a path (`npx eslint packages/mochart`) or a workspace
(`npx knip --workspace packages/mochart`) instead.

## The config metadata pipeline

Every config section has **three sources of truth** in `packages/mochart/src/config/`:

| Source | Directory | Feeds |
| --- | --- | --- |
| Validators | `validation/` | runtime validation, reference "Validation" text |
| Defaults (incl. conditional) | `defaults/` | runtime defaulting, reference "Default" text |
| Descriptions + optional `getDetails()` | `docs/` | reference prose, generated JSDoc |

Everything documentation-shaped is **generated from those sources**, so they
can never drift from the code:

- `scripts/configReferenceModel.ts` assembles the structured model;
  `scripts/generator.ts` (`npm run generate-docs -w @mochart/core`) renders
  `mochart-docs.html` and emits `generated/config-reference.json`. It **exits
  non-zero when the three sources disagree** on a section's keys.
- `scripts/generateJsdoc.ts` (`npm run generate-jsdoc -w @mochart/core`)
  rewrites the JSDoc on the config interfaces in `src/types/config.ts` from
  the same model. `test/config/jsdocSync.test.ts` fails whenever the file is
  out of date — regenerate rather than hand-edit those comments.
- The docs site renders its config reference from
  `generated/config-reference.json` at build time, and adds per-property
  "Used in" links from a build-time scan of the docs examples and demo
  configs.

### Adding a config property, end to end

1. Add the validator in `src/config/validation/<section>.ts`.
2. Add the default in `src/config/defaults/<section>.ts` (conditional
   defaults live there too; a property that intentionally has no default must
   be whitelisted in `scripts/configReferenceModel.ts`).
3. Add the description in `src/config/docs/<section>.ts` — and a `getDetails()`
   entry if one line isn't enough.
4. Add the typed property to the matching interface in `src/types/config.ts`
   (just the type — its JSDoc is generated).
5. Implement the behavior, then run
   `npm run generate-docs -w @mochart/core` and
   `npm run generate-jsdoc -w @mochart/core`.
6. `npm test -w @mochart/core` — the parity checks and the JSDoc sync test
   confirm the sources agree, and the golden tests catch rendering changes.

### Adding a new config section

Beyond the three sources and the type, a new section must be registered in a
few generated-docs consumers (each is a simple list):

- `scripts/configReferenceModel.ts` — the `getSectionSources()` descriptor
  list (and `sectionKeyAllMap` handling if it has a companion `*Defaults` section).
- `scripts/generateJsdoc.ts` — `sectionInterfaceMap`.
- `packages/mochart-demo-common/src/docsLinks.ts` — the section id list that
  drives the demo Config tab's reference links (enforced by that package's
  `docsLinks.test.ts` coverage guard).
- `packages/mochart-docs/.vitepress/lib/usageIndex.ts` — the object/list
  section id sets (enforced by the docs `scripts/checkSectionCoverage.ts`
  check in its test script).

## Golden snapshot tests

`packages/mochart/test/golden/` renders **every demo config** from
`@mochart/demo-data` through the public `createChart()` API in jsdom, drives
the staged animations on a fake clock, and compares normalized DOM against
checked-in snapshots (initial mount, static update, mid-tween, and settled
states). They are the primary regression oracle for renderer changes:

```sh
npm test -w @mochart/core                 # includes the golden suite
npx vitest run -u                          # (in packages/mochart) update snapshots
```

Review golden diffs like code — an unexpected snapshot change usually means
an unintended rendering change.

## The demo galleries

Six feature-equivalent galleries (vanilla + five framework ports) share their
logic through `@mochart/demo-common` and their configs/datasets through
`@mochart/demo-data`:

- All user-facing copy lives in demo-common's `demoText` — edit it there
  only.
- A feature added to one gallery's UI is expected in all six (see the share
  button or Config-tab docs links for the pattern: shared logic in
  demo-common, one thin component per framework).
- Demo blurbs live as `description` fields in `demo-data/src/demos.json`.
- The Playwright e2e suite lives in `@mochart/demo-basic`, which is a
  minimal harness rather than a gallery and is not deployed.

## The documentation site

`packages/mochart-docs` is a VitePress site (see its README for structure).
Points worth knowing when contributing:

- Example configs in `examples/` power the live charts and are validated in
  CI with the library's own `validateConfig`/`getDataErrors`
  (`npm test -w @mochart/docs`) — a broken example fails the build.
- The config reference pages and their "Used in" links are generated; edit
  the config sources (above), not the pages.
- VitePress fails the build on dead internal links. Links into the demo
  galleries (`/vanilla/…`) resolve only on the assembled site and are
  exempted in `.vitepress/config.ts`; demo deep links need a trailing slash
  so VitePress doesn't append `.html`, and anchors into non-VitePress pages
  need `target="_self"` so its SPA router doesn't intercept them.

## Site assembly and deployment

`npm run build:pages` (scripts/build-pages.mjs) assembles `site/`: the docs
site at the root, each gallery at `/<slug>/`, a demo deep-link redirect
injected into the docs 404.html (GitHub Pages has no rewrites), and a
`_redirects` file for Cloudflare Pages. `PAGES_BASE` sets the base path
(defaults to `/mochart/`; CI builds a `/` variant for Cloudflare). Deploys
are gated behind the `ENABLE_PAGES_DEPLOY` / `ENABLE_CLOUDFLARE_DEPLOY`
repository variables — see `.github/workflows/ci.yml`.

## CI guardrails, in one place

| Check | Where it runs |
| --- | --- |
| ESLint rules | `eslint .` → `npm run lint` |
| Unused exports, files and dependencies | `knip` → `npm run deadcode` |
| Types, per workspace | `tsc` / `svelte-check` / `vue-tsc` / `ngc` → `npm run typecheck` |
| Config sources key parity | generator exits 1 → docs build → `build:pages` |
| Generated JSDoc freshness | `test/config/jsdocSync.test.ts` → root `npm test` |
| Docs example validity | `checkExamples.ts` → root `npm test` |
| Golden rendering snapshots | core vitest → root `npm test` |
| Dead docs links | VitePress build → `build:pages` |
| Demo behavior | Playwright e2e → `npm run test:e2e` |

The first two are worth a word on scope:

- **Lint** (`eslint.config.mjs`, one flat config for the whole monorepo) is
  configured to catch bugs, not style: there are no formatting rules, and every
  disabled rule carries a comment explaining why it is off. Type-aware rules
  run on plain `.ts`/`.tsx`; `.svelte` and `.vue` files get their framework
  plugin's syntactic rules only, because `svelte-check`/`vue-tsc` in
  `typecheck` already cover their types. `npm run lint:fix` applies the
  autofixable subset, and a deliberately unused binding is spelled with a
  leading `_`.
- **Dead code** is knip over every workspace: it reports exports, types and
  files that nothing in the repo reaches, and declared dependencies nothing
  imports. Reachability starts from the `entry` patterns in `knip.json`, which
  is where an export that is public API but has no in-repo consumer belongs.

## Config format versioning

Configs may carry a `version`; when present, strict validation requires it to
equal `CONFIG_VERSION` (`src/config/core/constants.ts`), and omitting it means
"the current format". If a change to the config format bumps it, add a
migration step to `src/config/migration/` so `migrateConfig` upgrades older
configs, and update the version in the demo configs and docs examples.
