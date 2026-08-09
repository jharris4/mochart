# Repo review findings

Review of the `mochart` monorepo on branch `review`, in two passes: a first
sweep (B1–B7, T1–T5, D1–D6) and a deeper second sweep (B8–B17, T6–T7, D7–D8).

Baseline, verified in isolation after every fix below: `npm test` (1213 core
tests + all workspaces), `npm run typecheck`, `npm run lint`, and
`npm run deadcode` all pass. Core statement coverage is 96% (branch 88%).
Nothing here came from a failing check — the findings came from reading the
source and probing the public API.

**Fixed** items are committed on this branch, one commit each, and each records
what the fix was and why that shape was chosen over the alternatives.
**Open** items are the ones still needing a decision.

Highest-severity open items: **T6**, **B12**.

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

**Fix:** `=== true` in place of `!== undefined`, keeping the `hasOwnProperty`
guard. `=== true` rather than a truthiness check because that is both the
documented contract and what every other reader already used — matching them
was the point. Safe by construction for existing callers: the internal state
machine only ever stores `true` or deletes the key, so only host-supplied
`false` changes behaviour, and only toward what the docs promise.

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

**Fix:** unknown ids normalize to "unfocused" in `getFocusData`, right beside
the existing `focusedCategoryIndex` range check, and
`getSeriesConfigsOrderedByFocus` no longer pushes an `undefined` config.

Normalizing rather than throwing or warning, because the guard for the third
focus prop was already there and already chose that answer — the asymmetry was
the bug, so matching it is the smallest correct change. Normalizing inside
`getFocusData` covers every path: both data sources build focus data through
it, and the `getFocusDataWith*` transforms carry the ids forward from there.
The controller keeps the stale id, exactly as it keeps an out-of-range index,
so a host echoing focus back is not fought.

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

**Fix:** both sites now treat a config *appearing* as structural, symmetrically
with one going away — `reconcile` resets focus and filter state, `derive`
re-initializes.

Reset is the right answer rather than an attempt to preserve state: ids from
before a null gap cannot be assumed to mean the same thing after it, and
`reconcile` already resets on the equivalent data-provider transition
(`oldDataProvider && dataProvider ? remap : reset`). The config path was simply
missing the guard its neighbour had.

### B11. Negative and non-finite sizes reached the svg — **Fixed** (`a5d3061f`)

**Medium.** `packages/mochart/src/components/Chart.ts` — `sync`

Only an exact `0` took the documented no-size route, so `width: NaN` rendered
a chart carrying `<svg width="NaN" height="NaN">` and `width: -100` rendered
`width="-100"` — both invalid SVG.

**Fix:** the gate became `width > 0 && height > 0`, which covers `0`, negative,
`NaN`, and `undefined` in one expression, and the prop JSDoc plus the
chart-states guide now say "not a positive number" instead of "is 0".

Routing to the existing no-size state rather than clamping or throwing: the
state is already there, already documented, and already what a host sees before
its container is laid out — an unusable size is an unusable size regardless of
which way it is unusable.

### B2. `binValues` crashed or exhausted memory on out-of-contract options — **Fixed** (`a811134d`)

**High.** `packages/mochart/src/data/Histogram.ts` — `getBinLayout`

`binCount` was used directly as an array length and as a max index:

| input | before |
| --- | --- |
| `{ binCount: 2.5, nice: false }` | `TypeError` reading `'start'` of undefined |
| `{ binCount: NaN, nice: false }` | same `TypeError` |
| `{ binCount: Infinity, nice: false }` | infinite loop → heap exhaustion |
| `{ binWidth: NaN }` | `NaN` in every bin edge |

**Fix:** a finite `binCount` rounds down to at least 1, a non-finite one falls
back to the Sturges default, and a non-finite `binWidth` counts as unset.

Repairing rather than throwing, unlike B3: these are contract violations that
have an obvious intended reading (a count must be a whole number ≥ 1; a
meaningless width is no width), the `binCount` doc already says the actual
count may differ, and a non-positive `binWidth` was silently ignored before —
so repairing keeps that precedent. B3's cap throws instead because a
too-small-but-valid width has no reinterpretation that is not a lie.

### B1. Stitched multi-chart exports produced invalid XML — **Fixed** (`62a4360f`)

**High.** `packages/mochart-export/src/index.ts` — `getStitchedSvgText`

The outer `<svg>` was built with `createElementNS` *and* given an explicit
`setAttribute('xmlns', …)`, so `XMLSerializer` emitted the declaration twice
and the markup failed to parse (`duplicate attribute: xmlns`). Consequences:
`exportChartsPNG` always rejected — multi-chart PNG export never worked;
`exportChartsSVG` wrote a file strict SVG consumers reject. The single-chart
path was unaffected. It survived because the whole stitching API had no tests
(see T1).

**Fix:** dropped the `setAttribute('xmlns', …)`. `createElementNS` already puts
the element in the SVG namespace, so `XMLSerializer` emits the declaration on
its own — the explicit attribute was not belt-and-braces, it was the whole
defect. The single-chart path proves it: it clones a live svg, never sets
`xmlns`, and serializes correctly. Locked in by a test asserting the markup
parses and carries exactly one declaration per svg (outer plus one per tile).

### B3. A tiny `binWidth` allocated without bound — **Fixed** (`ba1be0a6`)

**High.** `packages/mochart/src/data/Histogram.ts` — `binValues`

Distinct from B2. A *valid* finite positive `binWidth` could request an
arbitrary number of bins: `binValues([1…10], { binWidth: 1e-7 })` asked for 90
million bin objects and exhausted the heap before returning. Any host binning
user-controlled data with a user-controlled width could be hung by one input.

**Fix:** capped at 10000 bins, throwing past it (like the existing
inverted-domain check) rather than clamping — `binWidth` is documented as an *exact* width, so
clamping would have to silently widen the bins or drop data. The pathological
cases now throw in ~1ms:

```
binValues: 90000000 bins requested, more than the 10000 maximum
```

The cap is a memory safety net, not a legibility rule: nothing legible comes
near it (the widest plot area is a few thousand device pixels, and Sturges on a
million values gives 21 bins), so it only ever fires on a mistake. Minimum bar
width is a separate, already-solved concern —
[`categoryAxis.minCategoryValueExtent`](packages/mochart/src/data/AxisData.ts#L110)
defaults to 1px and is applied at layout time, where the width is known and
resize is handled.

### B13. `ManagedChartProps` typed the loading state as impossible — **Fixed** (`c570eab4`)

**Medium.** `packages/mochart/src/types/chart.ts`

```ts
mochartConfig: MochartConfig;   // and dataProvider: DataProvider
```

Both were non-nullable, but core implements the null case (`Chart.sync` has
explicit `if (!mochartConfig)` branches), all five bindings declare
`MochartConfig | null` / `DataProvider | null`, and `createChart` carried the
comment *"despite the prop type, bindings mount with a null provider"*. So a
TypeScript host calling `createChart` directly could not express the loading
state the bindings rely on — the B10 regression test needed a cast.

**Fix:** both widened to `| null`, and the cast dropped from that test. Type-only
change: no runtime behaviour moved, and widening an input type keeps existing
callers compiling.

**Follow-up (open, low):** the two *internal* types the controller forwards
into — `ChartProps` (`components/Chart.ts`) and the publicly exported
`ChartDataSourceInput` (`chart/ChartDataSource.ts`) — still declare both
non-null, so `ChartController` casts at that boundary (now with a comment
saying why). Widening them too is correct but cascades to 65 type errors,
almost all in `Chart.ts` where the config is non-null by control flow rather
than by type; that is a refactor with real regression risk and no runtime
change, so it was left out of a release-prep branch. It matters mainly for
hosts implementing a custom `ChartDataSource`, which the API reference lists
under "Advanced exports".

### B4. State-component factories received an internal provider wrapper — **Fixed** (`4a48e51c`)

**Medium.** `packages/mochart/src/createChart.ts` — `withFreshIdentity`

`createChart` wraps the host's `dataProvider` in a delegating copy so the
pipeline re-reads a provider it has already seen (that is what makes
`refresh()` work when the host mutates data in place). That wrapper — not the
host's object — reached the `getLoadingComponent` / `getErrorComponent` / …
context:

```
identity === host: false | instanceof ArrayOfObjectsDataProvider: false | has refresh(): false
```

So a factory could not `instanceof`-check its own provider, read custom members
(`getErrorComponent: ({ dataProvider }) => retry(dataProvider.retry)` got
`undefined`), or call `refresh()` — all silently. The wrapper forwarded
`getCategoryProperty`, `getError`, and `getLoading` but not `refresh`, so it did
not satisfy the `DataProvider` contract it was typed as.
`createDefaultChart` was unaffected.

**Fix:** separate the two concerns instead of conflating them.
`props.dataProvider` now stays the host's own object — what the factories are
handed — and the fresh-identity delegate moved to an explicit
`readDataProvider` the controller passes to the data sources.
`FocusController.reconcile` compares the *read* providers too, since remapping
focus after an in-place reorder keys off exactly the identity change the
delegate exists to create.

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
passed a `filteredSeriesIds` value of `false`.

**Fix:** regression tests in `ControlledFocus.test.ts` and
`ChartStates.test.ts`, each written to fail against the old code before the fix
landed, plus the non-positive size cases from B11 and the provider-identity
case from B4.

The common shape of all four bugs is worth recording: a guard existed for one
member of a set and not its siblings — one focus prop range-checked out of
three, the config-gone case handled but not config-arriving, `0` handled but
not `NaN`. The tests are written per *set* rather than per case, so a future
prop or state added to one of these groups has an obvious place to be covered.

### T1. The export stitching API had no tests — **Fixed** (`14d5dba1`)

**High.** `exportChartsSVG`, `exportChartsPNG`, and `getStitchedChartsSvgText`
are documented in the package README and the export guide, and none of the
three had a single test — which is how B1 shipped.

**Fix:** 11 cases covering grid sizing, cell centering, row wrapping and gaps,
background handling, elements without a chart, filename derivation, the
`false`/`null` no-chart returns, keyboard-semantics stripping, and the B1
regression. Written against the public entry points rather than the internal
`getStitchedSvgText`, so they pin the contract the README documents; four of
them failed on the unfixed code, which is what identified B1.

### T2. `binValues` invalid-input paths — **Fixed** (`61461aec`, `ba1be0a6`)

**Fix:** fractional, non-finite, and non-positive `binCount`, and non-finite
`binWidth` (B2), plus just-under/just-over the bin cap and the `1e-7` heap repro (B3).
The cap cases assert on the error text, so the limit cannot be quietly raised
without the test noticing.

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

**Fix:** the footer string. Confirmed exhaustive by grepping every tracked
`.ts`/`.md`/`.json`/`.vue`/`.mjs`/`.js`/`.html` file for "BSD" — one hit, now
zero — and by checking the `license` field and `LICENSE` file of all 20
packages.

### D2. The documented build target did not match what shipped — **Fixed** (`83e1b89f`)

**Medium.** `packages/mochart/README.md` and
`packages/mochart-docs/guide/getting-started.md` both stated the published
builds target **ES2020**. `vite.config.ts` set no `build.target`, so Vite 8's
default applied and the shipped bundle carried ES2021 logical assignment:

```
$ grep -oE '\?\?=|\|\|=|&&=' dist/mochart.js | sort | uniq -c
   2 &&=    7 ||=    5 ??=
```

(`tsconfig.json` targets ES2020, but esbuild, not tsc, emits the bundle.)

**Fix:** pinned `build.target: 'es2020'` rather than rewording the docs, for
two reasons. Core was the only publishable package whose target floated — the
other seven pin ES2020 in their tsconfigs (Angular ES2022, as it requires), and
only core opted out by going through Vite, which ignores tsconfig's `target`
for the bundle. And the real defect was drift, not the specific version: Vite's
default tracks current browser baselines, so the documented support floor would
have risen silently on every Vite major. Both bundles now contain no
post-ES2020 syntax, and the two doc sentences say "pinned to ES2020" so the
claim reads as the commitment it now is.

**Follow-up (open, low):** nothing enforces this. A CI grep of the built bundle
for post-target syntax (`??=`, `||=`, `&&=`, `#private`, `static {`) is the
check that would have caught the original drift.

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

**Fix:** completed to "the cartesian counterpart of `onSliceClick`", which is
what the surrounding text and the callback's behaviour imply — it fires on
click regardless of `focusOnClick`, exactly as `onSliceClick` does for pie.

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
