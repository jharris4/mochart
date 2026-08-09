# Repo review findings

Review of the `mochart` monorepo on branch `review`, in two passes: a first
sweep (B1–B7, T1–T5, D1–D6) and a deeper second sweep (B8–B17, T6–T7, D7–D8).

Baseline, verified in isolation after every fix below: `npm test` (1209 core
tests + all workspaces), `npm run typecheck`, `npm run lint`, and
`npm run deadcode` all pass. Core statement coverage is 96% (branch 88%).
Nothing here came from a failing check — the findings came from reading the
source and probing the public API.

**Fixed** items are committed on this branch, one commit each, referencing the
id. **Open** items need a decision and were deliberately left alone.

Highest-severity open items: **B3**, **B13**, **B4**, **D2**, **T6**.

---

## Bugs

### B8. A controlled `filteredSeriesIds` of `false` hid the series — **Fixed** (`b17d6f52`)

**High.** `packages/mochart/src/data/SeriesData.ts` — `getSeriesFilteredFlags`

The map was read as "is this key present" rather than "is this key `true`":

```js
seriesFilteredFlags[id] = hasOwnProperty(map, id) && map[id] !== undefined;
```

So `filteredSeriesIds: { a: false, b: false }` hid **both** series. That is the
natural way to build the map from a set of hidden ids
(`Object.fromEntries(ids.map(id => [id, hidden.has(id)]))`), and the prop is
typed `Record<string, boolean>` and documented as "series id → `true` =
filtered out". Every other reader (`Legend`, `TooltipContent`,
`FocusController`) already tested `=== true`; the data layer was the only one
testing for presence, which also left focus and filtering disagreeing about
whether a series was hidden.

Confirmed by mounting with `{}` / `{ b: true }` / `{ b: false }` and counting
rendered `.mochart-series` groups: 2 / 1 / 1.

### B9. An unknown controlled focus id crashed the chart — **Fixed** (`f0a034fc`)

**High.** `packages/mochart/src/data/FocusData.ts` — `getFocusData`

`getFocusData` range-checked `focusedCategoryIndex` but not `focusedSeriesId`
or `focusedValueAxisId`, so an id naming no series/axis reached
`seriesById` / `valueAxesById` as `undefined` and threw:

```
TypeError: Cannot destructure property 'id' of 'seriesConfig' as it is undefined.
```

This breaks the pattern the interaction guide recommends — mirroring one
chart's reported focus into another — because sibling charts need not share
series ids. It threw at mount, on `update()`, and on `replace()`.

Unknown ids now read as unfocused, matching the existing out-of-range
category-index behaviour; `getSeriesConfigsOrderedByFocus` no longer pushes an
`undefined` config either.

### B10. A `mochartConfig` arriving after mount crashed the chart — **Fixed** (`8835be99`)

**High.** `FocusController.reconcile` and `Chart.derive`

Both structural-change checks guarded the config going *away* but not one
*arriving*. `FocusController.reconcile` passed a null previous config straight
into `hasConfigStructureChange`, and `Chart.derive` only short-circuited on the
*new* config being null:

```js
mochartConfigChanged && (!mochartConfig || hasConfigStructureChange(prevProps.mochartConfig, mochartConfig))
```

Every binding types `mochartConfig` as `MochartConfig | null` and passes props
through opaquely, so the ordinary async pattern — mount with
`mochartConfig={null}` and `loading`, then set the config when the fetch
resolves — threw `Cannot read properties of null (reading 'validation')`.
`replace()` and null → real → null → real cycles threw too.

A config appearing is now treated as structural, like one going away.

### B11. Negative and non-finite sizes reached the svg — **Fixed** (`a5d3061f`)

**Medium.** `packages/mochart/src/components/Chart.ts` — `sync`

Only an exact `0` took the documented no-size route, so `width: NaN` rendered
a chart carrying `<svg width="NaN" height="NaN">` and `width: -100` rendered
`width="-100"` — both invalid SVG. Any non-positive or non-finite size now
takes the same route as `0`; the prop JSDoc and the chart-states guide follow.

### B2. `binValues` crashed or exhausted memory on out-of-contract options — **Fixed** (`a811134d`)

**High.** `packages/mochart/src/data/Histogram.ts` — `getBinLayout`

`binCount` was used directly as an array length and as a max index:

| input | before |
| --- | --- |
| `{ binCount: 2.5, nice: false }` | `TypeError` reading `'start'` of undefined |
| `{ binCount: NaN, nice: false }` | same `TypeError` |
| `{ binCount: Infinity, nice: false }` | infinite loop → heap exhaustion |
| `{ binWidth: NaN }` | `NaN` in every bin edge |

A finite `binCount` now rounds down to at least 1, a non-finite one falls back
to the Sturges default, and a non-finite `binWidth` counts as unset.

### B1. Stitched multi-chart exports produced invalid XML — **Fixed** (`62a4360f`)

**High.** `packages/mochart-export/src/index.ts` — `getStitchedSvgText`

The outer `<svg>` was built with `createElementNS` *and* given an explicit
`setAttribute('xmlns', …)`, so `XMLSerializer` emitted the declaration twice
and the markup failed to parse (`duplicate attribute: xmlns`). Consequences:
`exportChartsPNG` always rejected — multi-chart PNG export never worked;
`exportChartsSVG` wrote a file strict SVG consumers reject. The single-chart
path was unaffected. It survived because the whole stitching API had no tests
(see T1).

### B3. A tiny `binWidth` still allocates without bound — **Open**

**High.** `packages/mochart/src/data/Histogram.ts` — `getBinLayout`

Distinct from B2. A *valid* finite positive `binWidth` can request an arbitrary
number of bins: `binValues([1…10], { binWidth: 1e-7 })` asks for 90 million bin
objects and exhausts the heap before returning. Any host binning
user-controlled data with a user-controlled width can be hung by one input.

Needs a decision: cap the bin count, and whether to throw past the cap (the
function already throws on an inverted domain) or clamp and widen the bins.

### B13. `ManagedChartProps` types the loading state as impossible — **Open**

**Medium.** `packages/mochart/src/types/chart.ts:189`

```ts
mochartConfig: MochartConfig;   // and dataProvider: DataProvider
```

Both are non-nullable, but core implements the null case (`Chart.sync` has
explicit `if (!mochartConfig)` branches), all five bindings declare
`MochartConfig | null` / `DataProvider | null`, and `createChart` carries the
comment *"despite the prop type, bindings mount with a null provider"*. So a
TypeScript host calling `createChart` directly cannot express the loading state
the bindings rely on — the regression test added for B10 needs a cast.

Fix is to widen both to `| null`. Left open because it changes a published type
on a release-prep branch.

### B4. State-component factories receive an internal provider wrapper — **Open**

**Medium.** `packages/mochart/src/createChart.ts` — `withFreshIdentity`

`createChart` wraps the host's `dataProvider` in a delegating copy so the
pipeline re-reads a provider it has already seen. That wrapper — not the host's
object — reaches the `getLoadingComponent` / `getErrorComponent` / … context:

```
identity === host: false | instanceof ArrayOfObjectsDataProvider: false | has refresh(): false
```

So a factory cannot `instanceof`-check its own provider, read custom members,
or call `refresh()`. The wrapper forwards `getCategoryProperty`, `getError`,
and `getLoading` but not `refresh`, so it does not satisfy the `DataProvider`
contract it is typed as. `createDefaultChart` is unaffected.

Needs a decision: pass the host provider into the factory context, or complete
the wrapper and document that the context provider is a delegate.

### B5. Series labels apply the tooltip prefix/suffix only in `auto` mode — **Open**

**Medium.** `packages/mochart/src/utils/ValueFormat.ts` — `getSeriesLabelFormat`

With `labelFormat: 'auto'` the function delegates to `getSeriesFormat`, which
appends `valuePrefix`/`valueSuffix`; with an explicit d3 specifier it does not.
So `valuePrefix: '$'` yields `$9` on the label with `'auto'` and `9.0` with
`'.1f'`. The config docs describe both as tooltip-only ("when showing them **in
the tooltip**"), which the `auto` branch contradicts.

Needs a decision: apply prefix/suffix to labels in both branches, or neither.

### B12. Animated charts leave empty `style=""` attributes — **Open**

**Low.** `packages/mochart/src/render/dom.ts` — `setProperty` / `setStyle`

Clearing a style empties it rather than removing the attribute, so anything
that was ever styled keeps `style=""` forever. Hidden axis ticks
(`style: tick.hidden ? hiddenStyle : null`) hit this during a tween, so an
animated chart's settled DOM differs from a static one's — found by rendering
each scenario both ways and diffing the settled markup. The artifact is baked
into the checked-in golden snapshots and into SVG exports.

Fixing it (`removeAttribute('style')` once the declaration is empty) works, but
regenerates 206 golden files and shifts `style` to the end of the attribute
list on elements that toggle, so ~274 of the 1250 changed lines are pure
attribute reordering. Left open: that snapshot churn is the user's call before
a release.

### B6. `exportPNG` can hang instead of rejecting — **Open**

**Low.** `packages/mochart-export/src/index.ts` — `rasterizeSvgText`

`ctx.drawImage` / `canvas.toBlob` run inside the `img.onload` handler. If
either throws synchronously — a tainted canvas raises `SecurityError` when the
chart embeds a cross-origin `<image>` — the exception escapes the handler and
the promise never settles, so `await exportPNG(...)` hangs. A `try`/`catch`
that calls `reject` would settle it.

### B16. `createHeatmap` can emit duplicate category values — **Open**

**Low.** `packages/mochart/src/data/Heatmap.ts`

`columnLabels` is documented as "must be unique" but nothing enforces it, and a
list shorter than the column count mixes labels with the 1-based numeric
fallback, which can collide:

```js
createHeatmap([{ label: 'r', values: [1, 2, 3] }], { columnLabels: ['2'] })
// column values: ["2", "2", "3"]   ← duplicate
createHeatmap([{ label: 'r', values: [1, 2] }], { columnLabels: ['x', 'x'] })
// column values: ["x", "x"]
```

The chart's own `getDataErrors` reports duplicate category values as an error,
so the helper can hand back data its sibling API rejects. A length/uniqueness
check in the helper would catch it at the source.

### B15. `followSeries` accepts self-references and cycles — **Open**

**Low.** `packages/mochart/src/config/validation/seriesConfig.ts`

`{ id: 's', followSeries: 's' }` and a two-series cycle (`a → b → a`) both pass
validation. Neither crashes — both render — but a series following itself is
meaningless, and the validator already rejects a `followSeries` naming no
series, so the remaining cases look like an oversight.

### B17. One `NaN` poisons a whole waterfall — **Open**

**Low.** `packages/mochart/src/data/Waterfall.ts` — `computeWaterfallSteps`

The running total is not guarded, so a single non-finite `value` makes every
later step `NaN`:

```js
computeWaterfallSteps([{ label: 'a', value: 1 }, { label: 'b', value: NaN }, { label: 'c', value: 5 }])
// ends: [1, NaN, NaN]
```

`createHistogram` and `createPie` both filter non-finite inputs; waterfall does
not. Needs a decision on the semantics (skip the step, or treat it as 0).

### B14. `hasConfigStructureChange` throws on a null config — **Open**

**Low.** `packages/mochart/src/config/core/mochartConfig.ts`

A public export (documented under "Advanced exports") that dereferences
`.validation` on both arguments. Both internal callers were fixed in B10, so it
is no longer reachable from the chart, but it stays a sharp edge for the
documented API given that a null config is a real state elsewhere in the
library.

### B7. Stitched grid reserves empty columns — **Open**

**Low.** `packages/mochart-export/src/index.ts` — `getStitchedSvgText`

`totalWidth` is always `cols * cellWidth + (cols - 1) * gap`, so exporting 2
charts with `{ cols: 4 }` yields an image half of which is blank. Clamping the
column count to the chart count would trim it.

---

## Test coverage gaps

### T7. The three shipped crashes had no coverage at all — **Fixed** (with B8–B11)

**High.** B8, B9, and B10 were each reachable through documented, ordinary
usage, and no test in any package exercised them: no test mounted with a null
`mochartConfig`, none passed a controlled focus id that names nothing, and none
passed a `filteredSeriesIds` value of `false`. Regression tests now cover all
three (`ControlledFocus.test.ts`, `ChartStates.test.ts`), plus the non-positive
size cases from B11.

### T1. The export stitching API had no tests — **Fixed** (`14d5dba1`)

**High.** `exportChartsSVG`, `exportChartsPNG`, and `getStitchedChartsSvgText`
are documented in the package README and the export guide, and none of the
three had a single test — which is how B1 shipped. Added 11 cases covering grid
sizing, cell centering, row wrapping and gaps, background handling, elements
without a chart, filename derivation, the `false`/`null` no-chart returns,
keyboard-semantics stripping, and the B1 regression.

### T2. `binValues` invalid-input paths — **Fixed** (`61461aec`)

Fractional, non-finite, and non-positive `binCount`, and non-finite `binWidth`.

### T6. `npm run test:coverage` does not pass — **Open**

**Medium.** The golden suite runs in ~39s uninstrumented but takes minutes
under v8 coverage, and individual demos cross the configured 30s
`testTimeout` — a different demo each run (`cluttered`, then
`cluttered-inverted`), so it is load-dependent rather than one slow test. The
documented per-package coverage command therefore fails, and the margin is thin
enough that a loaded CI runner could fail plain `npm test` too.

Needs a decision on the remedy: raise `testTimeout`, or exclude the golden
demos from coverage instrumentation.

### T3. Renderer and component function coverage — **Open**

**Low.** Modules whose *function* coverage trails their statement coverage —
whole branches of behaviour are never invoked:

| module | funcs | stmts |
| --- | --- | --- |
| `src/components/Series.ts` | 62.5% | 88.2% |
| `src/components/SeriesMarkers.ts` | 62.5% | 95.0% |
| `src/components/Background.ts` | 66.7% | 78.6% |
| `src/components/ValueAxis.ts` | 66.7% | 90.6% |
| `src/components/SeriesLabels.ts` | 73.7% | 86.7% |
| `src/components/PieSeries.ts` | 75.0% | 94.0% |

### T4. `ElList.destroy(true)` is never exercised — **Open**

**Low.** `packages/mochart/src/render/list.ts:93-101` — the DOM-removing branch
of the keyed list's teardown is uncovered, while `RendererList.destroy` is.

### T5. No coverage thresholds — **Open**

**Low.** `packages/mochart/vitest.config.ts` configures a coverage reporter but
no `thresholds`, and CI runs `npm test` rather than `test:coverage`, so coverage
can regress without failing anything. Blocked on T6 in practice.

---

## Documentation

### D1. Docs site footer claimed the wrong licence — **Fixed** (`394ce868`)

**High.** `.vitepress/config.ts` read "Released under the BSD-3-Clause
License." on every page of the deployed site. The project relicensed to MIT in
`c9b1857`; the root `LICENSE`, every `package.json`, and every per-package
`LICENSE` say MIT. This was the only surviving BSD reference in the repo.

### D2. The documented build target does not match what ships — **Open**

**Medium.** `packages/mochart/README.md:255` and
`packages/mochart-docs/guide/getting-started.md:131` both state the published
builds target **ES2020**. `vite.config.ts` sets no `build.target`, so Vite 8's
default (`baseline-widely-available`) applies and the shipped `dist/mochart.js`
contains ES2021 logical assignment:

```
$ grep -oE '\?\?=|\|\|=|&&=' dist/mochart.js | sort | uniq -c
   2 &&=    7 ||=    5 ??=
```

(`tsconfig.json` targets ES2020, but esbuild, not tsc, emits the bundle.)
Needs a decision: pin `build.target: 'es2020'` so the promise is enforced, or
restate the docs to match the actual baseline.

### D7. The framework-props mapping is misleading about `style` — **Open**

**Medium.** `packages/mochart-docs/.vitepress/lib/renderBindingPage.ts`

Core's `style` prop (inline style on the chart's *root element*) is the one row
in the generated name-mapping table that reads `—` for all five bindings, and
the page never says what `—` means. Meanwhile React, Svelte, and Lit each
document their own `style` prop — targeting the *container div* they create —
in the per-binding section directly below. A reader scanning the mapping
concludes no binding supports `style`, which is wrong for three of them and
unexplained for the other two.

A sentence in the mapping intro explaining `—` and distinguishing the
container-level `style`/`class` props from core's chart-root `style` would fix
it.

### D8. Vue and Angular document no class/style prop — **Open**

**Low.** React (`className`, `style`), Svelte (`class`, `style`), and Lit
(`className`, `style`) all expose container props; Vue relies on attribute
fallthrough (`inheritAttrs: false` plus an `attrs` spread) and Angular on its
host element. Both work, but neither is stated anywhere in the reference or the
framework guides, so a Vue or Angular reader has no documented way to class or
style the chart container.

### D3. Truncated sentence in the core README — **Fixed** (`f33db2eb`)

**Low.** The `onSeriesClick` bullet ended mid-clause at "the cartesian
`onSliceClick`".

### D6. `@mochart/angular` exports no prop types — **Open**

**Low.** `mochart-react`, `-vue`, `-lit`, and `-svelte` all export
`ChartProps` / `DefaultChartProps` / `BaseChartProps` / `ChartCallbackProps`
(plus `ChartRef` where applicable). `packages/mochart-angular/src/index.ts`
exports only `PlaceholderProps` and `PlaceholderComponent` — its inputs live on
the component classes. Defensible given Angular's decorator inputs, but it
leaves TypeScript hosts of that one binding without a named prop surface, and
nothing says so.

### D4. `@mochart/movalid` has no `homepage` — **Open**

**Low.** Every other publishable package sets
`"homepage": "https://mochart.org"`; movalid does not, so npm shows no project
link. Left alone because movalid is a standalone validator with no page on that
site — the right URL is a judgement call.

### D5. No `repository.directory` on any publishable package — **Open**

**Low.** All nine publishable packages point `repository.url` at the monorepo
root without `"directory": "packages/<name>"`, so npm's "Repository" link and
provenance land on the repo root rather than the package.

---

## Checked and clean

Recorded so the next review does not redo the work.

**Verified by construction, not by reading:**

- **Animated and static charts settle to the same DOM.** Rendered 12 scenarios
  (bars, lines, stacks, range bars, dual axes, pie, date/linear axes, missing
  values, category add/remove/reorder, series add) through both data sources
  and diffed the settled markup. The only divergence found was B12's empty
  `style=""`; everything else matched byte for byte.
- **The documented minimal `DataProvider` works.** An object literal or class
  with only `getCategoryValues` + `getSeriesValue` mounts and renders, by
  category value or by index; `getLoading`/`getError`-only providers reach the
  right states; `getDataErrors` accepts them.
- **Chart lifecycle is robust.** `destroy()` twice, `update`/`refresh`/`replace`
  after destroy, detached containers, empty→populated→empty data, category
  reorder, duplicate categories, all-undefined values, single category,
  identical values, ±1e308, invalid→valid→invalid configs, mid-tween config
  swaps, 20 rapid updates during a tween, toggling `animate` mid-tween, and
  `refresh()` mid-tween all behave and leave no timers running.
- **Config validation holds up.** Duplicate series/axis ids, dangling
  `axis`/`stack`/`followSeries` references, empty `series`, non-object configs,
  and `__proto__` keys in JSON configs are all rejected or handled without
  prototype pollution.
- **Every documented import resolves.** All `@mochart/*` named imports in the 65
  tracked markdown files were resolved against the packages' real export sets
  through the TypeScript checker — no drift.
- **Every config path named in the docs exists.** All `` `section.property` ``
  references in the docs and READMEs were checked against the generated config
  reference; the only miss was `chart.update` in the benchmark README, which is
  a `ChartHandle` method, not a config path.
- **The config reference is complete.** All 948 documented properties have a
  description, and every one has either a literal default or a conditional
  default — none renders blank.

**Verified by inspection:**

- **Doc/code drift guards are strong.** `checkApiCoverage`,
  `checkSectionCoverage`, and `checkExamples` run under `npm test`;
  `apiReference.test.ts`, `docs.test.ts`, and `jsdocSync.test.ts` pin the
  generated config reference, the per-section description modules, and the
  JSDoc on `src/types/config.ts`.
- **Markdown links.** All relative links in the 65 tracked `.md` files resolve;
  all absolute docs routes resolve to a page or the generated
  `reference/[section]` route. VitePress dead-link detection is on.
- **Keyboard and ARIA coverage is thorough** — roving tab stops, Enter/Space
  activation, Escape, arrow stepping and clamping, Home/End, live-region
  announcements, filtered-series focus recovery, reduced motion, and the
  decorative-hidden path all have tests.
- **Licence metadata.** All 20 packages declare MIT; all nine publishable ones
  ship an MIT `LICENSE`.
- **Binding prop parity.** 29 core props map across all five bindings with only
  `style` unmapped (D7); the Angular name differences (outputs without the `on`
  prefix) and Lit's `*Template` names are deliberate and documented.
