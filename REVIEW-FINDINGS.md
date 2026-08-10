# Repo review findings

Review of the `mochart` monorepo on branch `review`, in two passes: a first
sweep (B1–B7, T1–T5, D1–D6) and a deeper second sweep (B8–B18, T6–T7, D7–D8).

Baseline, verified in isolation after every fix below: `npm test` (1216 core
tests + all workspaces), `npm run typecheck`, `npm run lint`, and
`npm run deadcode` all pass; core's `npm test` is coverage-instrumented and
held to thresholds (96.82% statements, 89.07% branches). Nothing here came from a failing check — the
findings came from reading the source and probing the public API.

**33 findings: 32 fixed, 1 closed as won't-fix, 0 open.**

**Fixed** items are committed on this branch, one commit each, and each records
what the fix was and why that shape was chosen over the alternatives.
**Open** items are the ones still needing a decision.

Nothing is open.

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

### B5. Series labels applied the tooltip prefix/suffix only in `auto` mode — **Fixed**

**Medium.** `packages/mochart/src/utils/ValueFormat.ts` — `getSeriesLabelFormat`

With `labelFormat: 'auto'` the function delegated to `getSeriesFormat`, which
appends `valuePrefix`/`valueSuffix`; with an explicit d3 specifier it did not.
So `valuePrefix: '$'` yielded `$9` on the label with `'auto'` and `9.0` with
`'.1f'`.

This looked like a coin flip — apply the affixes to labels in both branches or
neither — until what labels actually format settled it. They render
**`labelProperty`**, a separate data column (default `null`; labels only draw
when it is set):

```js
// SeriesLabels.ts
text: String(valueFormat(labelValues[skipI]!))   // labelValues = the labelProperty column
```

`valuePrefix`/`valueSuffix` describe the *series value*, which is why the docs
scope them to the tooltip — the one place series values are shown as text. A
config plotting `revenue` with `valuePrefix: '$'` and
`labelProperty: 'unitsSold'` was stamping `$` onto a unit count, and only when
`labelFormat` happened to be `'auto'`. So the docs were right and the `auto`
branch was the defect.

**Fix:** the numeric formatting moved into a shared `getSeriesValueFormatter`.
`getSeriesFormat` wraps it in `applyPrefixAndSuffix` (the tooltip path);
`getSeriesLabelFormat` reuses it bare. Extracting rather than deleting one call
makes the asymmetry unrepresentable instead of fixed by hand.

Invisible to everything the repo renders: one file anywhere uses these affixes
(`mochart-docs/examples/tooltipFormat.ts`) and it sets no `labelProperty`, so no
golden moved and no doc example changed — which is also why it went unnoticed.
The pre-existing `auto` test had set both affixes to `null`, neutralising the
very case that was broken; it now covers both branches with affixes set, and
the auto one fails on the old code with `expected '$9 USD' to be '9'`.

**Follow-up (done):** the fix left no way to put an arbitrary suffix on a label
— d3's `$` format type covers currency prefixes, but not `' kg'`. Rather than
reuse the value affixes (which is what caused this bug), `labelPrefix` and
`labelSuffix` were added as their own pair, mirroring the value ones and
independent of `labelFormat` exactly as those are of `valueFormat`.

### B18. A `style` prop silently dropped the chart root's `position: relative` — **Fixed**

**Medium.** `packages/mochart/src/components/Chart.ts` — `sync`

`style` is a default *parameter*, so a caller's value replaces the default
rather than merging with it:

```js
const defaultChartStyle = { position: 'relative' };
const { style = defaultChartStyle, … } = this.props;
```

That default is load-bearing. The tooltip is an HTML overlay mounted inside
`div.mochart-chart` and positioned `absolute` with `left`/`top` computed in the
chart's own coordinate space, and the aria live region is `position: absolute`
with the clipped-1px idiom. Both need the chart root to be a positioned
ancestor. Measured:

| `style` prop | resulting root style |
| --- | --- |
| *(omitted)* | `position: relative` |
| `{ background: '#fff' }` | `background: rgb(255,255,255)` — **no position** |
| `'background: #fff'` (string) | `background: rgb(255,255,255)` — **no position** |
| `{ background: '#fff', position: 'relative' }` | both |

So the natural thing — styling the chart root's background — silently moves the
tooltip's containing block up to whatever ancestor happens to be positioned,
and lets the live region escape its clip. Nothing warns: the prop is documented
as "Inline style applied to the chart's root element" with no mention that one
declaration is required.

Only reachable through `createChart`/`createDefaultChart` directly — the five
bindings never forward this prop (see D7), so they cannot trigger it. Medium
rather than Low because the prop is plainly documented, the failure is silent,
and the symptom (a tooltip in the wrong place) points nowhere near its cause.

**Fix:** the caller's style is layered over the default rather than replacing
it, in both accepted forms — `{ ...defaultChartStyle, ...style }` for objects,
`'position: relative;' + style` for strings, since later declarations win in
`cssText` just as later keys win in a merge.

Merging under the caller rather than forcing `relative` on top, because the
real invariant is narrower than the default suggests: the root must be a
*containing block*, and `absolute`, `fixed` and `sticky` all qualify. Forcing
`relative` would fix this bug by removing legitimate capability. Verified
across both forms:

| `style` | resulting position |
| --- | --- |
| *(omitted)* | `relative` |
| `{ background: '#fff' }` / `'background: #fff'` / `''` | `relative`, background kept |
| `{ position: 'absolute' }` | `absolute` |
| `'position: sticky'` | `sticky` |
| `{ position: 'static' }` | `static` — still breaks, by explicit request |

Documented as well as fixed, since merging closes the accidental case but not
the deliberate one: the prop's JSDoc now says the style layers over
`position: relative` and that `position` should only be overridden with another
non-`static` value. That names the actual constraint instead of restating the
default, so someone reaching for `absolute` knows it is fine and someone
reaching for `static` knows it is not.

### B12. Animated charts left empty `style=""` attributes — **Fixed**

**Low.** `packages/mochart/src/render/dom.ts` — `setProperty` / `setStyle`

Clearing a style empties it rather than removing the attribute, so anything
that was ever styled keeps `style=""` forever. Hidden axis ticks
(`style: tick.hidden ? hiddenStyle : null`) hit this during a tween, so an
animated chart's settled DOM differs from a static one's — found by rendering
each scenario both ways and diffing the settled markup. The artifact is baked
into the checked-in golden snapshots and into SVG exports.

**Fix:** `removeAttribute('style')` once the declaration is empty, gated on the
incoming value being falsy so the hot path pays nothing when a style is being
set.

The cost was a one-time golden regeneration, measured rather than assumed
before committing. All 1250 changed lines across 206 files classify as exactly
two mechanical transforms, with nothing unaccounted for:

| | lines |
| --- | --- |
| pure `style=""` removal | 976 |
| attribute reorder only (same attrs, `style` moves to the end) | 274 |
| anything else | **0** |

The reorder is because removing and re-adding an attribute appends it; it has
no rendering effect and only matters to string comparison. The regenerated
snapshots were then re-run twice with no further churn, confirming they are
deterministic rather than render-order dependent — so this is a single
regeneration, not recurring churn. Afterwards the DOM is *more* stable than
before: it no longer depends on whether an element was ever styled during a
tween.

### B6. `exportPNG` hung instead of rejecting — **Fixed**

**Low.** `packages/mochart-export/src/index.ts` — `rasterizeSvgText`

`ctx.drawImage` / `canvas.toBlob` ran inside the `img.onload` handler. A
synchronous throw there escapes the *handler*, not the promise executor, so
nothing rejected and the promise never settled — `await exportPNG(...)` hung
forever. The realistic trigger is a canvas tainted by a cross-origin `<image>`
in the chart, which makes `toBlob` raise `SecurityError`.

Who catches it today: **nobody**. Of 17 call sites, 16 are `void exportPNG(…)`
(every demo gallery) and one is a bare `await` in the docs' `LiveChart.vue`. So
the practical change is *silent hang → console error*: both still fail to
download, but one leaves a trace and the other leaves none. No success path
changes, and the only affected path currently produces nothing at all.

**Fix:** a `try`/`catch` around the handler body that rejects. The caught value
is passed through unwrapped — an early version wrapped it in a generic `Error`
and the test caught that swallowing the `DOMException`'s `SecurityError` name,
which is the whole diagnosis. Rejecting rather than resolving `false` keeps
"nothing to export" and "rasterization failed" distinct, and matches the
`img.onerror` path that already rejects.

The regression test stubs `Image` (jsdom never fires `onload`) and a context
whose `drawImage` throws; against the unfixed code it does not fail, it *times
out*, which is the bug stated exactly.

### B16. `createHeatmap` could emit duplicate category values — **Fixed**

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
so the helper handed back data its sibling API rejects — and duplicates are a
real fault, not a label nuisance: `ArrayOfObjectsDataProvider` indexes rows by
category value, so they collapse onto one key.

**Fix:** `columnLabels`, when given, must be one per column and unique; either
failure throws, matching how `binValues` already refuses an inverted domain and
an over-cap bin count.

Checking length as well as uniqueness because they catch different mistakes:
uniqueness catches the corruption, but a short list that happens not to collide
(`['Jan']` over 3 columns → `['Jan', '2', '3']`) renders fine with nonsense
labels and would otherwise report nothing. The length check names that directly
— "1 columnLabels for 3 columns" — instead of surfacing later as a confusing
duplicate. Documented on the option and in the heatmap recipe.

### B15. `followSeries` accepted self-references, cycles and chains — **Fixed**

**Medium.** `packages/mochart/src/config/validation/mochartConfig.ts`

Filed as Low on the assumption these were merely meaningless. They are not —
measured, with `onSeriesClick` set:

| config | interactive series | click on `a` reports |
| --- | --- | --- |
| normal | 2 | `a` |
| `b` follows `a` (intended) | 1 | `a` |
| self-reference `a→a` | 1 (`a` lost its own) | `a` |
| cycle `a↔b` | **0** | **`b`** |

Interactivity is gated on `followSeries === NONE` in both `SeriesContainer` and
`Series`, so in a cycle every series is a follower and none gets a tab stop or
button role — all keyboard access and every `onSeriesClick` target disappears.
Worse, `Series` redirects a follower's id to its leader, so in a cycle each
click reports the *other* series and a host acts on the wrong data.

Chains fail the same way: follower lookups are
`series.filter(config => config.followSeries === id)`, never transitive, so in
`a ← b ← c` filtering `a` collects `[b]` and leaves `c` behind.

**Fix:** one rule — a `followSeries` must name a series that does not itself set
`followSeries`. No graph walk, and it rejects self-references, cycles and chains
together, because all three violate the same single-level invariant the code
relies on. The built-in candlestick and OHLC helpers always satisfy it.

### B17. One `NaN` poisoned a whole waterfall — **Fixed**

**Low.** `packages/mochart/src/data/Waterfall.ts` — `computeWaterfallSteps`

The running total is not guarded, so a single non-finite `value` makes every
later step `NaN`:

```js
computeWaterfallSteps([{ label: 'a', value: 1 }, { label: 'b', value: NaN }, { label: 'c', value: 5 }])
// ends: [1, NaN, NaN]
```

`binValues` filters non-finite inputs and `computePieFractions` clamps them to
0; waterfall was the only one of the three that propagated, and because its
steps are cumulative the damage was not confined to the bad bar — every later
step and total inherited the `NaN`.

**Fix:** a non-finite value counts as 0, and leaves a `total` step at its
running value rather than resetting to one.

Zero rather than throwing, because `item.value ?? 0` already treats an
*omitted* value as zero — throwing on `NaN` while silently accepting
`undefined` would be a strange split — and because a waterfall fed from live
data with one gap should degrade by a bar, not fail entirely. `getDataErrors`
is no safety net here: it inspects the data handed to the chart, by which point
one `NaN` has already become a column of them.

### B14. `hasConfigStructureChange` threw on a null config — **Fixed**

**Low.** `packages/mochart/src/config/core/mochartConfig.ts`

A public export (documented under "Advanced exports") that dereferenced
`.validation` on both arguments. Both internal callers were fixed in B10, so it
was no longer reachable from the chart — but a null config is a real, supported
state everywhere else: `ManagedChartProps.mochartConfig` is nullable since B13
and every binding mounts with null while loading. A host following that pattern
and calling this helper hit a `TypeError` on its first render.

**Fix:** both parameters widened to `MochartConfig | null`, with a null on
either side counting as a structural change and two nulls as no change.

Accepting null rather than documenting the restriction, because B10 had already
established that rule — and had taught it to *both* internal callers
separately, each carrying its own `!oldConfig || !newConfig ||` prefix. Encoding
it in the helper let both call sites drop that duplication, so the rule now
lives in one place instead of three. Widening a parameter type is backward
compatible for existing callers.

### B7. Stitched grid reserved empty columns — **Fixed**

**Low.** `packages/mochart-export/src/index.ts` — `getStitchedSvgText`

`totalWidth` was always `cols * cellWidth + (cols - 1) * gap`, so exporting 2
charts with `{ cols: 4 }` yielded an image half of which was blank.

**Fix:** `columns = min(cols, charts.length)` — `cols` is an upper bound rather
than a literal column count.

The distinction that makes this safe: an empty cell in a partly-filled *last
row* is inherent to grid layout and is left alone (3 charts at `cols: 2` still
produce a 2×2 grid with one empty cell); only columns that no chart can ever
reach are trimmed. Both behaviours have a test so the two cases cannot be
conflated later.

The one thing clamping removes is a stable output width across exports of
differing chart counts, which would let batches line up. No caller in the repo
relies on it, and the README only promises "tiled left to right, top to bottom
into `cols` columns", which the clamp still satisfies.

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

### T6. `npm run test:coverage` did not pass — **Fixed**

**Medium.** `npm run test:coverage` fails: a golden demo crosses the configured
30s `testTimeout`, a different one each run (`cluttered`, then
`cluttered-inverted`), so the documented per-package coverage command does not
pass.

Measured, because the cause is not the obvious one:

| scenario | result |
| --- | --- |
| golden file, no coverage | 121 pass, 39s, slowest test **2.2s** |
| 4 heaviest demos, with coverage | ~2s each — no overhead in isolation |
| whole golden file, with coverage | **121 pass**, slowest **4.6s**, durations flat across the run |
| whole core suite, with coverage | **fails** — one golden test at **30.8s** |

So it is neither per-test instrumentation cost (the heaviest demos are
unaffected in isolation) nor accumulation across the file (durations do not
climb: 2717, 4647, 996, 1212, 1330, 1455, 188, 1607, 1610, 2832 ms in
execution order). Coverage roughly doubles each golden test *and* keeps all 86
files' workers busy longer; under that saturation the heaviest demos are
starved of CPU and stretch past 30s. That is why it never reproduces alone and
why the victim changes.

**Fix:** `vi.setConfig({ testTimeout: 120_000 })` at the top of
`golden.test.ts`, with the global 30s left alone and a pointer to the override
added beside it.

File-scoped rather than global because the goldens are the only tests within an
order of magnitude of the limit — the other 85 files run in milliseconds, so
30s stays a live hang detector there. 120s is ~4x the worst observed (30.8s)
and ~26x the instrumented baseline, while still failing a real hang inside two
minutes.

Not taken: excluding the goldens from coverage guts the signal (they are what
exercises the renderer); `--no-file-parallelism` removes the contention at the
cost of every coverage run being far slower; splitting the file would work but
is churn for something one line fixes.

**Follow-up (open, low):** nothing keeps this working. CI runs `npm test` and
never `test:coverage`, which is why it sat broken — that is the same decision
as T5 (no thresholds), so "run coverage in CI with thresholds" is one
follow-up, not two. The numbers above are the floors to set.

### T8. Axis placement permutations were untested — **Fixed**

**Low.** `data/AxisData.ts` and `layout/PlotLayout.ts` held the largest cluster
of uncovered branches (64 paths between them), almost all config permutations
rather than error paths: `side`, `collapsed`, `visible`, the three
`tickLabelAnchor` values, `tickLabelRotation` sign, and explicit
`tickLabelSize`/`titleSize` against `AUTO`. No test file referenced `side:` at
all.

**Fix:** a matrix in `AxisPlacement.test.ts` over side × inverted, the collapse
and visibility switches, all three anchors on ordinal, single-category and
linear axes, rotation in both signs on both sides, and the explicit sizing and
`focusRangeApplyToTitle` paths.

`PlotLayout.ts` 88.1% → **95.9%** branches, `AxisData.ts` 85.4% → 88.5%,
overall 89.07% → 89.64%. `tickLabelParallel` is derived from the rotation
(`vertical ? rotation > 70 : rotation < 20`) rather than configured, so the
rotation cases are what reach it.

### T3. Renderer and component function coverage — **Fixed**

**Low.** Six modules whose *function* coverage trailed their statement
coverage: their pointer handlers and guards were constructed on every render —
so the statements creating them counted as covered — but never called, because
no test dispatched the events they wait on. The golden suite pins these modules'
*output*, not their behaviour under interaction, which is the same blind spot
B4, B8, B12 and B15 were found in.

**Fix:** one commit per module, each dispatching the interactions its handlers
wait on. All six now at 100% functions:

| module | funcs before | after |
| --- | --- | --- |
| `components/Series.ts` | 62.5% | 32/32 |
| `components/SeriesMarkers.ts` | 62.5% | 8/8 |
| `components/Background.ts` | 66.7% | 3/3 |
| `components/ValueAxis.ts` | 66.7% | 9/9 |
| `components/SeriesLabels.ts` | 73.7% | 19/19 |
| `components/PieSeries.ts` | 75.0% | 12/12 |

Core coverage moved 96.29 → **96.82%** statements, 88.61 → **89.07%** branches,
95.82 → **97.41%** functions. Three things the tests documented on the way:
`Background.onClick` is an optional prop no caller ever passes, so its handler
only ever runs its guard; the value axis handlers sit on the axis's inner
transform group rather than its root; and only line/area series have a
whole-series shape, so bars and markers carry per-category handlers instead.

### T4. `ElList.destroy(true)` was never exercised — **Fixed**

**Low.** `packages/mochart/src/render/list.ts` — the DOM-removing branch of the
keyed list's teardown was uncovered, while `RendererList.destroy` was not.

It turned out to be unreachable rather than merely untested. `Renderer.destroy`
passes `removeDom && !insideElement`, and every component builds its list as
`this.elList(this.root)` — hosted on its own root — so the flag is always
`false` and the element is discarded wholesale instead. The branch only serves
the no-arg `elList()` form, which hosts on `parentDom` for a pass-through
renderer with no element of its own, and no component uses that shape.

**Fix:** two unit tests in the existing `ElList` describe, covering
`destroy(true)` and `destroy(false)` directly — no component needed, and they
pin the contract for the pass-through shape a future component would hit first.
`list.ts` statements and lines went 92.94% / 92.68% → **100% / 100%**; the
residual branch gaps are the defensive `if (node.parentNode)` guards.

### T5. No coverage thresholds — **Fixed**

**Low.** `packages/mochart/vitest.config.ts` configured a coverage reporter but
no `thresholds`, and CI ran `npm test`, never `test:coverage` — so coverage was
measurable on demand and defended by nothing. That is precisely why T6 sat
broken: the command had been failing and nothing ran it.

**Fix:** thresholds at `statements 96, branches 88, functions 95, lines 96` —
a whisker under the current 96.29 / 88.61 / 95.82 / 96.42, so real erosion fails
while an incidental refactor does not. Verified to bite by raising the
statements floor to 99 and watching the run fail with
`Coverage for statements (96.29%) does not meet global threshold (99%)`.

Core's `test` script now runs `vitest run --coverage`, replacing the separate
`test:coverage`. That is what makes CI enforce it without change: `npm test`
already fans out to every workspace, so core runs **once**, instrumented,
rather than twice. The cost is a slower local full-suite run for core (~48s →
~95s); a single test file is unaffected, since that is run directly through
vitest without coverage.

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

### D7. The framework-props mapping was misleading about `style` — **Fixed**

**Medium.** `packages/mochart-docs/.vitepress/lib/renderBindingPage.ts`

Two different elements are both stylable through a prop called `style`:

```html
<div style="…">                        <!-- the binding's container: its style/class prop -->
  <div class="mochart-chart" style="…">  <!-- the chart root: core's style prop -->
    <svg>…</svg>
  </div>
</div>
```

The generated page said both "no binding has `style`" and "here is React's
`style`", with nothing reconciling them. Its mapping table promises "every core
prop and the name each binding gives it" and rendered core's `style` as `—` in
all five columns — while the per-binding sections directly below listed
`style` for React, Svelte, and Lit ("Style applied to the container div the
chart mounts into"). Both statements are true, of different props on different
elements, and `—` was never given a meaning anywhere on the page.

The fact underneath: core's `style` is genuinely unreachable from every
binding. Each destructures it out and spends it on its own container
(`const { className, style, dataTestId, ...chartProps } = props`), so it never
reaches `createChart`. The generator was behaving correctly — the bindings'
`style` is a different prop, so it finds no mapping — the page just never said
so.

**Fix:** the mapping intro now states what `—` means, shows the two-element
nesting above, and says the per-binding `style`/`class` props target the
container rather than the chart root. Documentation only: the behaviour is
right (the container carries the size and is what you normally style), and
adding a `chartStyle` pass-through would put two style props on one component,
which is the confusion rather than the cure. The `style` link is read from the
model rather than hardcoded, so it cannot drift from the generated anchor.

### D8. Vue and Angular documented no class/style prop — **Fixed**

**Low.** React (`className`, `style`), Svelte (`class`, `style`), and Lit
(`className`, `style`) all expose container props; Vue relies on attribute
fallthrough (`inheritAttrs: false` plus an `attrs` spread) and Angular on its
host element. Both work, but neither was stated anywhere, so a Vue or Angular
reader had no documented way to class or style the chart container — and their
`—` cells looked identical to React's despite meaning something different.

**Fix:** covered by the same D7 intro, which closes with why those two list no
container props. Fixed together because one sentence resolves both: three
identical-looking `—` situations (not forwarded, framework fallthrough, host
element) needed telling apart in one place.

### D3. Truncated sentence in the core README — **Fixed** (`f33db2eb`)

**Low.** The `onSeriesClick` bullet ended mid-clause at "the cartesian
`onSliceClick`".

**Fix:** completed to "the cartesian counterpart of `onSliceClick`", which is
what the surrounding text and the callback's behaviour imply — it fires on
click regardless of `focusOnClick`, exactly as `onSliceClick` does for pie.

### D6. `@mochart/angular` exports no prop types — **Fixed**

**Low.** `mochart-react`, `-vue`, `-lit`, and `-svelte` all export
`ChartProps` / `DefaultChartProps` / `BaseChartProps` / `ChartCallbackProps`
(plus `ChartRef` where applicable). `packages/mochart-angular/src/index.ts`
exports only `PlaceholderProps` and `PlaceholderComponent` — its inputs live on
the component classes as `@Input()` decorators.

**Fix:** documented, not changed — a sentence in the Angular README and the
framework guide saying there are no prop interfaces to import, that templates
type-check against the classes, and that `Chart`/`DefaultChart`/`BaseChart` are
the types to reference.

Angular's convention really is inputs on the class, and Angular is the one
binding that exports its base component (`BaseChart`), which *is* its type
surface. Synthesising `ChartProps` for it would mean a second declaration of
every input that could drift from the decorators — the same drift the generated
framework-props page exists to prevent. The genuine gap was that nothing told an
Angular reader any of this.

### D4. `@mochart/movalid` has no `homepage` — **Closed, won't fix**

**Low.** Every other publishable package sets
`"homepage": "https://mochart.org"`; movalid does not, so npm shows no Homepage
link.

**Deliberately left as is.** movalid is a standalone validator library that
mochart happens to use, and mochart.org has no movalid content at all — so
pointing there would send someone after validator docs to a charting site,
which is worse than no link. Pointing at the repo subdirectory would be
accurate but now duplicates D5's `repository.directory`, which already resolves
npm's Repository link to `packages/movalid`, where the README is the
documentation.

Recorded rather than left silent so it is not re-raised as an oversight: the
inconsistency with the other eight packages is intentional.

### D5. No `repository.directory` on any publishable package — **Fixed**

**Low.** All nine publishable packages pointed `repository.url` at the monorepo
root without `"directory": "packages/<name>"`, so npm's "Repository" link and
provenance landed on the repo root rather than the package.

**Fix:** the field added to all nine, each verified to resolve to a real package
directory. Purely additive metadata — nothing reads it at build or runtime.

Worth doing before publishing rather than after: the field only has an effect
once the packages are on npm, and correcting it later means a republish.

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
