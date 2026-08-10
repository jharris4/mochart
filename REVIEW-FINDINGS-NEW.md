# mochart repo review findings — merged, 9 August 2026

**Sources.** This file merges two independent review passes of the same tree:
`OPUS-findings-2026-08-09.md` (145 findings, reproduced verbatim below) and
`SOL-findings-2026-08-09.md` (8 findings). Five SOL findings are folded into the
sections below with continued section ids and are tagged **[from SOL review]**.
Three were skipped as duplicates of a finding the Opus pass already recorded:

| Skipped SOL finding | Covered by |
|---|---|
| A callback-only title is inaccessible by keyboard | [A11Y-2](#a11y-2--ontitleclick-is-a-mouse-only-control) |
| `ChartFactoryContext` documents values the runtime does not provide | [API-9](#api-9--state-factory-context-members-arrive-inconsistently-the-readme-implies-otherwise) (amended with SOL's two extra facts) |
| Contributor command documentation omits CI-critical scripts | [TOOL-7](#tool-7--lint-and-deadcode-gate-every-pr-but-are-documented-nowhere) |

Each finding carries a **Status** marker on its metadata line — **Open** until
fixed, then **Fixed** with its commit hash, matching the convention in
`REVIEW-FINDINGS.md`.

---

Analysis of the `mochart` monorepo on branch `review` (51 commits ahead of `main`,
working tree clean). Twelve parallel audits covering the core library's data
pipeline, animation, layout, components/renderer, config system, public API,
chart-type helpers, accessibility, the five framework bindings, the docs site,
the demo apps, the test suite, and repo tooling. Emphasis on `packages/mochart`
(`@mochart/core`, ~28.5k lines of TypeScript).

**Baseline, measured during this analysis — everything currently passes:**
`npm run typecheck` (20 workspaces, 0 errors), `npm run lint` (0), `npm run deadcode`
(0), `npm test -w @mochart/core` (91 files, 1348 tests, coverage 97.2% statements /
90.59% branches / 97.7% functions, thresholds met). **No finding below comes from a
failing check** — they all come from reading the source and probing the public API.

`REVIEW-FINDINGS.md` records a prior review pass (38 findings, 36 fixed). Nothing
already fixed there is repeated here; several findings below are the *adjacent*
cases that pass did not reach, and those are flagged as such.

**150 findings: 1 critical, 31 high, 69 medium, 49 low.** (145 from the Opus pass,
5 from the SOL pass.)

**Status: 24 fixed (2 partial), 4 needing an answer, 126 open.**

Findings marked **[verified]** were independently re-confirmed with a runnable probe
or direct source read during assembly, over and above the auditing agent's own work.

---

## Contents

| § | Section | C | H | M | L | Total |
|---|---|---|---|---|---|---|
| [1](#1-core--data-pipeline) | Core — data pipeline | – | 2 | 2 | 2 | 6 |
| [2](#2-core--animation-and-layout) | Core — animation & layout | **1** | 1 | 2 | 3 | 7 |
| [3](#3-core--components-renderer-and-interaction) | Core — components, renderer & interaction | – | 3 | 4 | 4 | 11 |
| [4](#4-core--chart-type-helpers) | Core — chart-type helpers | – | 3 | 6 | 3 | 12 |
| [5](#5-core--config-system-and-validation) | Core — config system & validation | – | 3 | 4 | 2 | 9 |
| [6](#6-core--public-api-types-and-utils) | Core — public API, types & utils | – | 1 | 5 | 7 | 13 |
| [7](#7-accessibility) | Accessibility | – | 2 | 5 | 5 | 12 |
| [8](#8-framework-bindings-export-and-editor) | Bindings, export & editor | – | 2 | 6 | 4 | 12 |
| [9](#9-documentation) | Documentation | – | 3 | 7 | 3 | 13 |
| [10](#10-demo-applications) | Demo applications | – | 5 | 10 | 7 | 22 |
| [11](#11-tests-and-coverage) | Tests & coverage | – | 3 | 8 | 4 | 15 |
| [12](#12-build-tooling-packaging-and-ci) | Build, tooling, packaging & CI | – | 3 | 6 | 4 | 13 |
| [13](#13-movalid) | movalid | – | – | 4 | 1 | 5 |
| | **Total** | **1** | **31** | **69** | **49** | **150** |

`§13`'s `VAL-1` is a cross-reference to `CONFIG-1` (one defect, two vantage points) and is not
counted twice. Several other findings are cross-linked between sections for the same reason.

The five findings carried in from the SOL pass are
[COMP-11](#comp-11--pointer-payloads-use-the-wrong-coordinate-frame-and-break-when-css-scaled),
[HELP-12](#help-12--two-valid-large-pie-values-overflow-the-total-and-collapse-every-slice),
[API-13](#api-13--the-advanced-public-input-types-are-non-nullable-and-the-controller-casts-around-it),
[DOC-13](#doc-13--filtering-every-series-does-not-activate-the-documented-no-series-state) and
[TEST-15](#test-15--the-claimed-three-engine-browser-support-is-only-ever-tested-in-chromium).

---

# 1. Core — data pipeline

### DATA-1 — `null` in the data collapses the value axis to a single point
**High · Bug · [DomainData.ts:38](packages/mochart/src/data/DomainData.ts#L38)** **[verified]** — **Fixed**

The missing-value guard is `value !== undefined && !Number.isNaN(value)`. `Number.isNaN(null)`
is `false`, so `null` reaches the comparisons — where `min === null` doubles as the
"no minimum yet" sentinel. Assigning `min = null` re-arms the sentinel and discards
every minimum seen so far. `Infinity` is not excluded either.

Probed directly:

```
getDomainForValues([5, null, 20])   → [20, 20]      // every point on one pixel
getDomainForValues([10, null])      → [null, 10]    // breaks the null-pair invariant
mergeDomain([null, 10], [1, 2])     → [1, 2]        // the 10 is silently dropped
getDomainForValues([10, Infinity])  → [10, null]
getDomainForValues([5, NaN, 20])    → [5, 20]       // NaN is handled correctly
```

`null` is the standard JSON/API missing marker, and `createChart` — the entry point all
five bindings use — never runs `getDataErrors`, so nothing catches it. The chart renders
one tick and every point stacked on it, with no error.

**Fix:** use `typeof value === 'number' && Number.isFinite(value)` in `getDomainForValues`,
and the equivalent `Number.isFinite` check on the numeric form (Dates included) in
`getCategoryDomainForValues` at [:17](packages/mochart/src/data/DomainData.ts#L17).

**Fixed automatically.** Applied exactly as recommended: `getDomainForValues` now guards with
`typeof value === 'number' && Number.isFinite(value)`, and `getCategoryDomainForValues` guards
with `!Number.isFinite(numericValue(value))` (which covers Invalid Date, ±Infinity and a stray
null on top of the NaN it already handled). Five new cases in `test/data/DomainData.test.ts`
cover null in the middle, a trailing null, all-null, and infinities on both helpers. The
narrower per-function fix was taken over the finding's alternative of coercing at the
`getSeriesValuesForProperty` read boundary: that boundary also feeds tooltips, labels and
`missingValues` handling, so it changes far more than the domain maths. DATA-2 is fixed
separately at its own three sites. Full core suite passes (1355 tests), typecheck and lint clean.

### DATA-2 — one non-finite value wipes out the later series in a stack
**High · Bug · [SeriesData.ts:247-276](packages/mochart/src/data/SeriesData.ts#L247)** — **Fixed**

`setStackSingleSeriesValues` treats only `undefined` as missing. `NaN >= 0` is `false`,
so a `NaN` falls into the negative branch and is *added* into `negativeStackValues[i]`,
poisoning the accumulator for every subsequent series in that stack at that category.
Same defect in `getStackPriorValues` ([:278](packages/mochart/src/data/SeriesData.ts#L278))
and `incrementStackValues` ([:294](packages/mochart/src/data/SeriesData.ts#L294)).

Three stacked series, rows `[{a:5,b:NaN,c:-2},{a:1,b:2,c:-4}]`: series `c`'s valid `-2`
renders nothing and vanishes from the axis domain (`axisDomain` loses the real minimum
of `-6`). Same class as the already-fixed B17 waterfall NaN poisoning, but in core stacking.

**Fix:** treat non-finite as missing in all three functions. Fixing the read boundary
instead — coercing non-finite to `undefined` in `getSeriesValuesForProperty`
([:124](packages/mochart/src/data/SeriesData.ts#L124)) — resolves DATA-1 and DATA-2 together.

**Fixed automatically.** A single `isStackableValue()` type guard (`value !== undefined &&
Number.isFinite(value)`) now gates all three functions, so a non-finite value takes exactly the
path `undefined` already took: `setStackSingleSeriesValues` emits `undefined` for the slot and
carries the positive accumulator into `prior`, `getStackPriorValues` reads the positive
accumulator, and `incrementStackValues` skips it. Regression tests in
`test/data/StackNonFinite.test.ts`; two of the four fail on the unpatched source. The strongest
of them asserts a NaN row is now byte-identical to the same row with the property simply absent.
Full core suite passes (1359 tests), typecheck and lint clean.

Two corrections to the finding. First, its worked example says the axis domain "loses the real
minimum of `-6`" — for those rows the real minimum is `-4` (no category sums two negatives), and
what actually went wrong is that series `c`'s valid `-2` became NaN and rendered nothing. Second,
`Infinity` never poisoned the negative accumulator, because `Infinity >= 0` sends it down the
*positive* branch; it corrupted the axis domain instead, which DATA-1's fix already contains.
The infinity case is kept as a test regardless.

### DATA-3 — a controlled `focusedCategoryIndex` below `-1` defocuses everything
**Medium · Bug · [FocusData.ts:37-40](packages/mochart/src/data/FocusData.ts#L37)** — **Open**

The guard clamps only the upper bound, and `isFocused` treats *only* `-1` as unfocused.
`getFocusData(config, chartData, -2, …)` on a two-category chart returns
`categoryFocusPercentages: [-1, -1]` with own keys `["0","1","-2"]` — every category
styled defocused, none focused, plus a non-index property written onto an array. `1.5`
and `NaN` behave the same. The guard's own comment claims the opposite. Adjacent to the
already-fixed B9, which hardened only the id paths.

**Fix:** normalize once — `Number.isInteger(i) && i >= 0 && i < categoryValues.length ? i : -1`.

### DATA-4 — date category axes never preserve `axisData` identity
**Medium · Bug · [AxisData.ts:33-45](packages/mochart/src/data/AxisData.ts#L33)** — **Open**

`scaleMutator` keeps the old scale when `areArraysAndEqual(oldScale.domain(), newScale.domain())`,
but that helper compares with `!==`. A d3 time scale rebuilds its domain `Date` objects
on every `domain()` call, so the comparison is false even for a scale compared against
itself. [AxisData.ts:193](packages/mochart/src/data/AxisData.ts#L193) already documents
this exact d3 behaviour in a neighbouring function — only `scaleMutator` was missed.

Measured on a simulated tween frame: `number+linear` preserved, `string+ordinal`
preserved, `date+linear` **not** preserved. [Chart.ts:704](packages/mochart/src/components/Chart.ts#L704)
gates a full DOM text remeasure on `oldAxisData !== axisData`, so for every
`type: 'date'` + `scale: 'linear'` chart that optimization is dead and the remeasure
runs on every animated frame.

**Fix:** compare scale domains by value (`+a[i] === +b[i]`, handling `Date`).

### DATA-5 — `groupSeriesCounts`/`stackSeriesCounts` are computed everywhere, read nowhere
**Low · Inconsistency · [SeriesData.ts:26-27](packages/mochart/src/data/SeriesData.ts#L26)** — **Open**

Both are written, copied through `getSeriesDataWithSeriesCounts`, re-derived per animation
frame, and re-exported into every per-category tooltip value object — with no consumer.
Only `axisSeriesCounts` is read. Meanwhile [SeriesPositions.ts:68](packages/mochart/src/utils/SeriesPositions.ts#L68)
divides the slot by the *static* group length, so filtering one series out of a group
leaves its slot empty rather than widening the survivors — which is exactly what
`groupSeriesCounts` would be for.

**Fix:** decide one way — consume them in `getSeriesPositionData` so grouped bars reclaim
a filtered slot, or delete both fields from the five places that produce them.

### DATA-6 — `getSeriesContainerFilteredSeriesCounts` counts *unfiltered* series
**Low · Inconsistency · [SeriesData.ts:460-474](packages/mochart/src/data/SeriesData.ts#L460)** — **Open**

It increments when `filteredSeriesFlags[id] === false` — i.e. it returns the number still
shown. After the suppress→filter rename, "filtered" means legend-toggled-off, so the name
states the opposite of the value. [AxisData.ts:314](packages/mochart/src/data/AxisData.ts#L314)
reads `if (axisConfig.visibleWhenAllFiltered || filteredSeriesCount > 0)`, which parses as
a contradiction.

**Fix:** rename to `getSeriesContainerVisibleSeriesCounts` / `visibleSeriesCount` across
the six call sites. Behaviour unchanged.

---

# 2. Core — animation and layout

### ANIM-1 — an `Infinity` phase duration wedges the chart in a permanent rAF loop
**Critical · Bug · [DomainAnimationData.ts:75](packages/mochart/src/animation/DomainAnimationData.ts#L75)** **[verified]** — **Fixed**, with an open question

`getPositiveDomainDeltaPercentage` returns `domainDeltaExtent / (domainDeltaExtent + domainExtent)`
with no guard on the denominator. When a value axis has a *negative* extent — an explicit
`min` above the data, or `max` below it — a growth delta of the same magnitude cancels the
denominator exactly:

```
valueAxes: [{ min: 0 }] with all-negative data  →  domain [0, -5], extent = -5
values grow -5 → 0                              →  delta [0, 5]
deltaPercentage = 5 / (5 + -5) = Infinity        →  400ms × Infinity = Infinity
```

`MochartTween.update` computes `percentage = (time - startTime) / duration`, which is `0`
forever, so the tween never reaches `1`. The chart freezes at the expansion start frame and
the `requestAnimationFrame` loop never terminates — 5000 frames (80 s of simulated time for
a 200 ms animation) with `completeCallback` never firing. `valueAxes: [{ max: 0 }]` with
all-positive data hangs identically.

`min: 0` to anchor bars at zero, on a series that then goes negative, is an entirely
ordinary configuration.

**Fix:** clamp the denominator (`Math.max(domainExtent, 0)`, or reuse `getSafeDomainExtent`)
and clamp the result to `[0, 1]`. Add a belt-and-braces guard in `ChartTweens.buildDataTween`
so a non-finite or negative duration is treated as instant. Separately,
[valueAxisConfig.ts:27,31](packages/mochart/src/config/validation/valueAxisConfig.ts#L27)
accepts any `min`/`max` with **no `min < max` cross-check** — it should reject or warn. **[verified]**

**Fixed automatically.** `getPositiveDomainDeltaPercentage` now clamps the denominator with
`Math.max(domainExtent, 0)`, which is provably enough on its own: `domainDeltaExtent` is `> 0`
inside that branch, so the ratio lands in `(0, 1]` and no separate result clamp is needed. A
`safeDuration()` helper in `ChartTweens` maps any non-finite or negative duration to `0`
(instant) and is applied to all four phase durations — the three in `buildDataTween` plus the
focus tween, which computes its duration the same way. Regression test in
`test/animation/InvertedDomainPacing.test.ts` drives real frames on a fake clock and asserts the
animation settles and leaves no pending frame request; it fails on the unpatched source. Full
core suite passes (1350 tests), typecheck and lint clean.

One correction to the finding: `valueAxes: [{ max: 0 }]` with all-positive data does **not** hang
— only the `min` case reproduces. The `max` case is kept as a second test regardless.

> **QUESTION (needs an answer):** the `min`/`max` cross-check is left undone deliberately. The
> hang is fixed at the maths layer, so this is now pure input hardening with a behavioural
> trade-off: because `strict` defaults to `true`, a *warning* invalidates the config just as an
> *error* does (see [CONFIG-9](#config-9--validateconfigs-strict-parameter-is-undocumented)), so
> either choice turns a chart that renders today into a config-error state. An inverted domain is
> also not obviously meaningless — `{min: 0}` on data that is currently all-negative is a
> reasonable way to pin the axis at zero and let the data grow into it. **Which do you want:**
> (a) reject `min >= max` as a validation error, (b) emit a warning only, (c) **[recommended]**
> leave it accepted and document that an explicit bound past the data inverts the domain, or
> (d) clamp the offending bound at build time and warn?
>
> *Recommendation: (c).* The hang is fixed and an inverted domain now renders and animates
> predictably, so nothing is unsafe any more — and (a) and (b) are the same thing in default
> strict mode, both turning charts that render today into a config-error state.

### ANIM-2 — a zero-span domain makes every update flash to zero, then to full height
**High · Bug · [DomainAnimationData.ts:72-80](packages/mochart/src/animation/DomainAnimationData.ts#L72), [SeriesAnimationData.ts:534](packages/mochart/src/animation/SeriesAnimationData.ts#L534)** — **Partially fixed**, with an open question

When all values on an axis are equal the domain collapses (`[7, 7]`). d3 renders that at
the range midpoint, but the expansion/contraction phases interpolate to and from a
*non*-degenerate domain, where the same values sit at the extremes. Frame trace for
`[{a:7},{b:7}] → [{a:9},{b:9}]` at 300×200:

```
settled h=81 (mid-plot) → frames 0-8 h=0 (bars vanish) → frame 16 h=58
→ frames 24-32 h=161 (bars fill the plot) → final snaps back to h=81
```

Same for a single data point. Related symptoms from the same root: an all-equal chart never
plays its initial animation, and an axis with a negative extent zeroes every value delta at
[SeriesAnimationData.ts:762](packages/mochart/src/animation/SeriesAnimationData.ts#L762),
silently skipping *all* animation (`valueAxes: [{min: 100}]` with data 10→20 applies instantly).

**Fix:** widen a zero-extent domain to a non-degenerate one once, before it reaches either
the scale or the animation deltas. At minimum use `getSafeDomainExtent`
([DomainData.ts:76](packages/mochart/src/data/DomainData.ts#L76) — already written for
exactly this case) in `createValueDeltaData` and as the denominator above.

**Partially fixed automatically — the rest needs an answer.** This finding is two problems
sharing a root, and only one of them has a fix that does not require a decision.

*Fixed:* the silently-skipped animation. `getSeriesValuesDeltas` weights a change as
`maxAbsoluteDelta / valueAxisExtent` gated on `valueAxisExtent > 0`, and `createValueDeltaData`
fed it raw `getDomainExtents`, so a **negative** extent zeroed every value delta and applied the
update instantly whatever duration was configured. `createValueDeltaData` now uses a new
`getSafeDomainExtents`, and `getSafeDomainExtent` takes `Math.abs` of a non-collapsed span — which
is what its own comment ("so delta weights stay positive") already claimed it did. The two
existing series-domain callers are unaffected, because `getDomainForValues` never returns an
inverted domain; only an explicit axis `min`/`max` can invert one. Regression tests in
`test/animation/CollapsedDomainDeltas.test.ts`. Full core suite passes (1364 tests).

One correction to the finding: the *collapsed*-domain half of this does not reproduce as
written. `[{a:7},{b:7}]` on a bar series gives the axis domain `[0, 7]`, not `[7, 7]`, because a
value axis defaults its `base` to 0 — so the extent is never actually 0 there. Those cases are
kept as tests and pass both before and after. A genuinely collapsed domain needs a renderer that
does not anchor to a base.

> **QUESTION (needs an answer):** the visual flash is left unfixed. Its cause is that a collapsed
> domain is rendered by d3 at the *range midpoint*, while the expansion/contraction phases
> interpolate to and from a non-degenerate domain where those same values sit at an *extreme* —
> hence `h=81 → h=0 → h=161 → h=81`. Closing that gap means widening a zero-extent domain before
> it reaches the scale, which **changes where an all-equal chart draws its bars when nothing is
> animating at all**, and will churn the golden snapshots. That is a visual-design call, not a
> bug fix. **Which do you want:** (a) widen a zero-extent domain to `[v - 0.5, v + 0.5]` (or
> `[0, 1]` for v = 0) everywhere, accepting that an all-equal line chart then draws mid-plot for
> a different reason and all-equal bars change height; (b) keep the static rendering as it is and
> instead force the animation phases to hold the degenerate domain, so no expansion runs and the
> update cross-fades in place; (c) leave it, and document that all-equal data animates oddly?
> *Recommendation: (b).* It is the smaller change, preserves every current golden snapshot, and
> keeps a visual-design decision out of a bug fix.

### LAYOUT-1 — negative `width`/`height` reach background rects on small or heavily spaced charts
**Medium · Bug · [PlotLayout.ts:91](packages/mochart/src/layout/PlotLayout.ts#L91), [SpacingLayoutInfo.ts:47-53](packages/mochart/src/layout/SpacingLayoutInfo.ts#L47), [LegendLayout.ts:113-121](packages/mochart/src/layout/LegendLayout.ts#L113)** — **Open**

`getPlotHeight` returns `innerHeight - titleHeight - legendHeight` unclamped;
`createSpacingLayoutInfo` guards only on `width > 0`, never height; `getLegendLayoutInfo`
clamps `legendItemTextWidth` but leaves per-item `itemWidth` unclamped. Prior finding B11
fixed only the top-level gate in `Chart.sync`, so any positive-but-small size still reaches this.

- `chart.padding {top:200,bottom:200}` at 300×200 → `<rect height="-204">` in `g.mochart-plot-background`
- `chart.margin` 120 all round at 300×200 → `height="-40"` and `height="-46"`
- title + legend at 20×20 → `height="-37"` and `width="-1"` on the legend-item background

Negative `width`/`height` is an SVG error value: browsers drop the element, so host-styled
backgrounds silently disappear, and strict SVG→PNG rasterisers reject the document.

**Fix:** `Math.max(0, …)` in `getPlotHeight`; mirror the `width > 0` guard for height in
`createSpacingLayoutInfo`; clamp `itemWidth`/`textWidth` in the legend layout.

### ANIM-3 — a structural config change replays the full mount animation, undocumented
**Medium · Doc gap · [AnimatedDataSource.ts:112-114](packages/mochart/src/chart/AnimatedDataSource.ts#L112), [staged-animation.md:51](packages/mochart-docs/guide/staged-animation.md#L51)** — **Open**

`hasConfigStructureChange` routes to `start()`, which discards `chartData` and rebuilds with
`initialAnimation = true`. The chart collapses to the axis base and regrows at
`initialDuration`, not `valueChangeDuration`. The docs say `initialDuration` is "when the
chart mounts"; `ChartHandle.update`'s JSDoc says config changes "animate through the staged
animation phases".

Measured: `initialDuration: 1600` / `valueChangeDuration: 160`, settle, then remove one series
via `update({ config })` — first frame after the update has every segment 1-2 px tall at the
plot floor, taking 96 frames (~1.6 s) to settle. Any host with a live config editor — the six
shipped demos, for one — flashes the whole chart to zero on an edit that only removed a series.

**Fix:** document which edits count as structural (series/axis/stack set, ids, chart type,
category-axis property/type/scale) on `initialDuration` and in `staged-animation.md`. If the
flash is unintended, carry the current `chartData` into `start()` for the structural path.

### LAYOUT-2 — `keepInside` lets an oversized tooltip escape past the left/top edge
**Low · Bug · [TooltipLayout.ts:50-63](packages/mochart/src/layout/TooltipLayout.ts#L50)** — **Open**

The `x < bx` / `y < by` clamps run *before* the max-edge clamps, so when the tooltip is larger
than the bounding rect the max-edge clamp wins and pushes it out the opposite side:
`fitRectangleWithinRectangle({x:10,y:10,width:100,height:50}, {x:20,y:20,width:200,height:80})`
→ `{x:-90, y:-20}`. Reachable on a narrow chart with a multi-row tooltip.

**Fix:** clamp both ways with min last — `x = Math.max(bx, Math.min(x, bx + bwidth - width))`.

### ANIM-4 — dead store in `setKeyedSeriesDomainForDelta`
**Low · Bug · [ChartAnimation.ts:231-235](packages/mochart/src/animation/ChartAnimation.ts#L231)** — **Open**

The `if (domainDelta[valueKey].deltaPercentage < deltaPercentage)` branch assigns
`seriesDomainObject[valueKey]`, then line 235 unconditionally overwrites it. Harmless today
only because `getDomainForDelta` re-tests the same condition, but the code says something it
does not do.

**Fix:** delete lines 231-233, or make 235 the `else` branch.

### ANIM-5 — shared delta constants are mutated in place
**Low · Bug · [SeriesAnimationData.ts:843-844](packages/mochart/src/animation/SeriesAnimationData.ts#L843)** — **Open**

`getSeriesValuesDeltas` returns the module-level `emptyValueDelta` singleton for a zero delta;
the caller then writes `deltaCopied = false` onto it, stamping a constant shared by every chart
instance on the page. `setValueDeltaFactorForValues` likewise writes `deltaFactor` onto the
three shared constants. Latent — the writes currently store the value that slot would have had
anyway — but the surrounding `adjust*` functions carry explicit "never mutated" comments, so
the invariant is already understood to matter.

**Fix:** return a fresh object for the zero case, or `Object.freeze` the three constants.

---

# 3. Core — components, renderer and interaction

### COMP-1 — pointer enter/leave *toggles* the tooltip instead of opening/closing it
**High · Bug · [Chart.ts:804](packages/mochart/src/components/Chart.ts#L804), [Chart.ts:849](packages/mochart/src/components/Chart.ts#L849), via [toggleTooltip:750](packages/mochart/src/components/Chart.ts#L750)** — **Fixed**

With `tooltip.followPointer: true`, both the enter and the leave handler call `toggleTooltip`,
which *flips* `tooltipVisible` rather than setting it. Any other path that changes it inverts
the pairing:

- mouseenter → opens; click the tooltip (`closeOnClick`) → closes; **mouseleave → re-opens**
  and stays pinned at `left:-8px; top:-8px` after the pointer has left the page area.
- keyboard `Enter` on the plot → opens; **mouseenter → closes**; mouseleave → re-opens.

**Fix:** give `toggleTooltip` an explicit `open: boolean` (or add `openTooltip`/`closeTooltipAt`)
so enter always opens and leave always closes, leaving `onChartClick` as the only true toggle.

**Fixed automatically.** `toggleTooltip` is now `setTooltipOpen(open, payload)` and
`toggleTooltipAtCategory` is `setTooltipOpenAtCategory(open, categoryIndex)`. Each of the seven
call sites states its intent: pointer enter passes `true`, pointer leave `false`, Escape `false`,
arrow-key open `true`, and only `onChartClick` and keyboard Enter/Space pass
`!this.state.tooltipVisible` — the two paths that are genuinely toggles. The body is otherwise
unchanged; the old `tooltipVisible ? null : x` expressions were already computing against the
post-flip state, so `open ? x : null` is exactly equivalent. Two regression tests in
`ChartInteraction.test.ts` cover both inverted pairings the finding describes (close-by-click then
leave; keyboard-open then enter); both fail on the unpatched source. Full core suite passes
(1366 tests), typecheck and lint clean.

### COMP-2 — `onSeriesLayoutBoundsChange` fires from inside `derive()`, before props commit
**High · Bug · [Chart.ts:392](packages/mochart/src/components/Chart.ts#L392) → [:727](packages/mochart/src/components/Chart.ts#L727)** **[verified]** — **Fixed**

`applyLayoutInfo` invokes the host callback while `Renderer.update()` is still in `derive` —
[renderer.ts:116](packages/mochart/src/render/renderer.ts#L116) calls `derive`, and
[renderer.ts:132](packages/mochart/src/render/renderer.ts#L132) assigns `this.props` only
afterwards. (Confirmed by reading; `mount()` assigns props first, so this affects updates only.)
Two consequences:

1. **Stale callback identity.** The callback invoked is the *previous* render's closure. Mount
   with `cbA`, then `update({width:400, height:300, onSeriesLayoutBoundsChange: cbB})` → `cbA`
   runs, not `cbB`. Hosts passing fresh closures per render (React/Svelte/Vue) get a callback
   closed over stale state.
2. **Reentrant update silently discarded.** A host that resizes in response to the new bounds
   re-enters `update()`; the nested update commits fully, then the outer `update()` overwrites
   `this.props`/`this.state` with the older values. Outer `update(400×300)` → callback calls
   `update(500×500)` → final `<svg width="400" height="300">`. The host's most recent
   instruction is lost with no error.

Same class as the already-fixed ChartController "notify after commit" and the truncating
components' post-`setState` field writes — it just wasn't fixed here.

**Fix:** record the pending bounds in `applyLayoutInfo` and dispatch from a post-commit hook
(`enqueue`, or the existing `measure` path) reading the committed `this.props`.

**Fixed automatically.** Applied exactly as recommended. `applyLayoutInfo` now stores the bounds
in `this.pendingSeriesLayoutBounds` instead of dispatching, and `measure()` — already the
component's post-commit hook — opens by calling `flushSeriesLayoutBoundsChange()`, which reads the
committed `this.props`. `Renderer.setState` calls `queueMeasure` just as `update` does, so the two
`setState`-driven `applyLayoutInfo` call sites (Chart.ts:519, :562) flush on the same path, and
mount is covered by its own `measure(null, null)`. Three regression tests in
`test/components/SeriesLayoutBounds.test.ts`; the two the finding describes fail on the unpatched
source. The reentrancy test is the classic responsive-container pattern — the host resizes to
500×500 from inside the callback during an outer 400×300 update, and the 500×500 must win.
Full core suite passes (1369 tests), typecheck and lint clean.

### COMP-3 — tooltip prev/next buttons leave the `aria-live` announcer stale
**Medium · Bug (a11y) · [Chart.ts:742](packages/mochart/src/components/Chart.ts#L742), used by [TooltipControls.ts:54](packages/mochart/src/components/TooltipControls.ts#L54)** — **Open**

`announceTooltipCategory` is called only from `onPlotKeyDown`. `updateTooltipCategoryIndex` —
the path the tooltip's Previous/Next buttons use — never touches the `role="status"` region,
and the tooltip body is not itself a live region. Open with Enter (live = `"Jan: …"`), press
ArrowRight (live = `"Feb: …"`), then click **Previous category**: the tooltip shows `Jan` but
the live region still reads `"Feb: Series S0: 20.00"` — the last announcement now contradicts
the visible tooltip.

**Fix:** call `this.announceTooltipCategory(tooltipCategoryIndex)` inside
`updateTooltipCategoryIndex`, and drop the now-redundant explicit calls in `onPlotKeyDown`.

### COMP-4 — `isMouseWithinChart` latches on when the pointer handlers are detached
**Medium · Bug · [Chart.ts:348](packages/mochart/src/components/Chart.ts#L348), gated at [:1044](packages/mochart/src/components/Chart.ts#L1044)** — **Open**

`chartEventHandler` is swapped for `{}` whenever `loading` turns on or the chart loses data.
If the pointer is inside at that moment the real `mouseleave` is never observed and the flag
stays `true` forever. Measured: mouseenter (1 `onChartMouseEnter`) → `loading: true` then
`false` → mouseenter again → **0 callbacks**; the event is misread as a move. With
`followPointer` the tooltip opened before the flip also stays open across the whole loading
period. The host's enter/leave callbacks stay inverted until the pointer leaves once.

**Fix:** reset `this.isMouseWithinChart = false` on the branch that installs the empty handler
map, and in the no-size / no-config early returns.

### COMP-5 — leaving a *filtered* tooltip row clears the focused series
**Medium · Bug · [TooltipContent.ts:378](packages/mochart/src/components/TooltipContent.ts#L378)** — **Open**

`onSeriesMouseEnter` correctly skips filtered series ([:373](packages/mochart/src/components/TooltipContent.ts#L373)),
but `onSeriesMouseLeave` has no matching guard and unconditionally emits `onFocus({ seriesId: null })`.
The same handlers are wired to `focusin`/`focusout`, so keyboard traversal hits it too. Filter
`S1`, hover the `S0` row (focus `S0`), then move across the struck-through `S1` row: enter emits
nothing (correct) but leave drops `S0`'s focus. The legend gets this right via its `hoverActive`
guard ([Legend.ts:266](packages/mochart/src/components/Legend.ts#L266)).

**Fix:** mirror `LegendItem.hoverActive` — record on enter whether focus was applied, and only
emit the clearing `onFocus` on leave/blur if it was.

### COMP-6 — Legend drops keyboard focus to `<body>` when its focused item disappears
**Medium · Bug (a11y) · [Legend.ts:176-220](packages/mochart/src/components/Legend.ts#L176)** — **Open**

`SeriesContainer` and `PieSeriesContainer` both snapshot `document.activeElement` before
`sync(...)` and re-focus the inheriting node afterwards. `Legend` computes `effectiveRovingId`
but never restores DOM focus, and its fallback is only `interactiveIds[0]` with no
nearest-neighbour inheritance. Focus item `S1` in a 3-series legend, then update with a config
that drops `S1` → `document.activeElement` becomes `BODY`. Fires on any dynamic series list or
`showInLegend` toggle.

**Fix:** copy the `SeriesContainer` pattern into `Legend.sync`; consider adopting its
nearest-following-neighbour fallback too.

### COMP-7 — negative `width`/`height` on the legend icon when `iconBorderSize` exceeds `iconSize`
**Low · Bug · [SeriesColorIcon.ts:193](packages/mochart/src/components/SeriesColorIcon.ts#L193)** — **Open**

Both validate as `numberMin(0)` independently, so `shapeSize = iconSize - iconBorderSize` can
go negative and is written straight to the rect: `legend: { iconSize: 4, iconBorderSize: 10,
showIconShapes: false }` renders `<rect width="-6" height="-6">`. Browsers log an error and drop
the element, so the icon vanishes with no diagnostic.

**Fix:** `Math.max(iconSize - iconBorderSize, 0)` (and clamp `symbolSize` likewise), or add a
cross-field validation warning.

### COMP-8 — thresholds on an ordinal category axis render nothing, silently
**Low · Inconsistency · [AxisThresholdLine.ts:63](packages/mochart/src/components/AxisThresholdLine.ts#L63)** — **Open**

The render gate is `scale === SCALE_LINEAR`, and `Scale` is only `'ordinal' | 'linear'` — so
every threshold on an ordinal axis (the default for string categories) is dropped. The config
validates clean, no warning is emitted, and the `mochart-category-axis-threshold` group is
emitted but empty, so it reads as a rendering failure rather than an unsupported option.
[docs/axisConfig.ts:78](packages/mochart/src/config/docs/axisConfig.ts#L78) documents
`thresholds` generally without mentioning the restriction.

**Fix:** either support ordinal placement (map through the band positions as `AxisTickMarks`
does), or emit a validation warning and document the restriction.

### COMP-9 — `TooltipSeriesLine` leaks a child `Slot` on every `rightAlignValues` flip
**Low · Bug (teardown) · [TooltipContent.ts:171](packages/mochart/src/components/TooltipContent.ts#L171), [:190](packages/mochart/src/components/TooltipContent.ts#L190)** — **Open**

The icon `Slot` is created inside the `ElSlot` `init` callback, so each `'aligned' ↔ 'plain'`
key change registers a new region on the renderer while the old one — still holding a mounted
`SeriesColorIcon` — stays in `this.regions`. `ElSlot.clear()` detaches the old container's DOM
but never destroys the child renderer. Unbounded growth for a host that lets users toggle
`tooltip.rightAlignValues`.

**Fix:** create a single `iconSlot` per layout in `create()`, or destroy the previous slot
before reassigning.

### COMP-10 — `liveRegionNode` retains a detached node after the body is torn down
**Low · Bug · [Chart.ts:1181](packages/mochart/src/components/Chart.ts#L1181)** **[verified]** — **Open**

`this.liveRegionNode` is assigned only inside `syncBody`. The error and no-size branches of
`sync()` call `this.body.set(null)`, destroying `ChartBody` without clearing the field — so
the chart holds a reference to a detached `<div>` and subsequent `announceTooltipCategory`
calls write into nothing.

**Fix:** set `this.liveRegionNode = null` alongside `this.body.set(null)` in the three
early-return branches of `sync()`.

### COMP-11 — pointer payloads use the wrong coordinate frame and break when CSS-scaled
**High · Bug · [Chart.ts:363](packages/mochart/src/components/Chart.ts#L363), [:775](packages/mochart/src/components/Chart.ts#L775)** **[from SOL review]** — **Partially fixed**, with an open question

Two defects in one expression. `ChartEventPayload.chartX`/`chartY` are documented at
[types/chart.ts:5](packages/mochart/src/types/chart.ts#L5) as coordinates relative to the *chart
container*, but the handler subtracts the origin of the **series-background** rect
([SeriesBackground.ts:31](packages/mochart/src/components/SeriesBackground.ts#L31)) — so every
payload is plot-relative, off by the whole left/top axis gutter. Separately, those values come from
`getBoundingClientRect()`, which reports **CSS** pixels, and are then divided by the *logical* plot
extents at [:775](packages/mochart/src/components/Chart.ts#L775) to derive
`categoryPercentage`/`valuePercentage` and the nearest category. Any CSS scaling of the container —
`transform: scale()`, a `width: 100%` SVG, a zoomed page — makes both the fractions and the selected
category wrong.

[ChartInteraction.test.ts:56](packages/mochart/test/components/ChartInteraction.test.ts#L56) stubs
*every* bounding rect to the full chart at 1:1, which collapses the two frames onto each other and
then asserts the plot-relative values as correct — so the suite pins the bug in place rather than
catching it.

**Fix:** convert client coordinates into SVG user coordinates using the rect's own scale factor,
keep the plot-local values for the category/value maths, and add the plot offset back when
populating `chartX`/`chartY`. Retest with a non-zero plot offset (axes on both sides) and a scaled
bounding rect.

**Partially fixed automatically — the rest needs an answer.**

*Fixed:* the CSS-scaling defect. A new `toPlotLocalPoint(clientX, clientY)` divides out the
rect's own scale (`seriesLayoutInfo.width / plotRect.width`) before returning plot-local SVG user
units, and does the in-bounds test against the logical extents. Both call sites use it —
`processChartEvent` and `onSeriesShapeClick`, which had the same raw subtraction. Both cartesian
and pie route `shapeRef` to `SeriesBackground`, whose rect is drawn straight from
`seriesLayoutInfo`, so the scale factor is right in both chart types. Regression tests in
`test/components/PointerScaling.test.ts` mount at 1× and at 0.5× and assert identical fractions
and category index; both fail on the unpatched source. Full core suite passes (1371 tests).

> **QUESTION (needs an answer):** the coordinate *frame* is left as it is. `chartX`/`chartY` are
> documented as chart-container-relative and are in fact plot-relative, so the two ways to close
> the gap are not equivalent: adding the plot offset **changes the numbers every existing host
> receives** on `onChartClick`/`onChartMouseEnter`/`onChartMouseMove`/`onChartMouseLeave`, silently
> and with no type change to flag it. There is also a reason to prefer the current values —
> `categoryPosition`/`valuePosition` in the same payload are explicitly documented as *plot*
> pixels, so today all four position fields share one origin. **Which do you want:** (a) add the
> plot offset so `chartX`/`chartY` match their documentation, accepting the silent break; (b)
> correct the JSDoc to say plot-relative, keeping all four fields consistent; or (c) add separate
> `containerX`/`containerY` fields and leave `chartX`/`chartY` alone?
>
> *Recommendation: (b).* It is the only option with no silent behaviour change for existing
> hosts, and it leaves all four position fields sharing one origin. Note
> `ChartInteraction.test.ts:56` stubs every rect to the full chart at 1:1, which collapses the two
> frames onto each other — whichever option you pick, that fixture needs a non-zero plot offset
> before it can tell them apart.

---

# 4. Core — chart-type helpers

### HELP-1 — volume-pane fractions at their documented range ends emit an invalid config
**High · Bug · [Candlestick.ts:191](packages/mochart/src/data/Candlestick.ts#L191)** **[verified]** — **Fixed**

`buildVolumeValueAxisConfigs` divides by `1 - heightFraction - gapFraction` and by
`heightFraction` with no guard, so in-contract option values produce negative or degenerate
margin fractions. Both `minMarginFraction` and `maxMarginFraction` validate as `numberMin(0)`,
and an invalid config makes `Chart` render the config-error component instead of the chart.
Probed end to end through `validateConfig`:

```
{heightFraction: 0.8, gapFraction: 0.3}  → minMarginFraction -10.999…  → INVALID, blank chart
{heightFraction: 1}                      → minMarginFraction -21       → INVALID, blank chart
{heightFraction: 0}                      → maxMarginFraction null      → INVALID, blank chart
{heightFraction: 0.95}                   → minMarginFraction 2.4e16    → valid, price squashed to one pixel row
```

Both options are documented as "The fraction (0 - 1)…" with no stated joint constraint.

**Fix:** validate in `getVolumeOptions` — throw unless `heightFraction ∈ (0,1)`,
`gapFraction ∈ [0,1)` and `heightFraction + gapFraction < 1`, matching the throw-on-bad-options
contract `binValues` and `createHeatmap` already use. Tighten the JSDoc and
[recipes/candlestick.md:93](packages/mochart-docs/recipes/candlestick.md#L93) to state it.

**Fixed automatically.** Applied exactly as recommended: `getVolumeOptions` now throws for
`heightFraction ∉ (0,1)`, `gapFraction ∉ [0,1)` and `heightFraction + gapFraction >= 1`, with
`createCandlestick: volume …` messages matching the `binValues`/`createHeatmap` wording. Failing
loudly at the helper beats letting a derived margin reach the validator, where the error names
`minMarginFraction` — a key the caller never set. JSDoc on both options and the recipe now state
the joint constraint. Eight new cases in `test/data/Candlestick.test.ts` cover every rejected
input plus both usable extremes. Full core suite passes (1379 tests).

### HELP-2 — duplicate labels in waterfall / candlestick / OHLC produce data the validator rejects
**High · Bug · [Waterfall.ts:109](packages/mochart/src/data/Waterfall.ts#L109), [Candlestick.ts:231](packages/mochart/src/data/Candlestick.ts#L231), [Ohlc.ts:103](packages/mochart/src/data/Ohlc.ts#L103)** — **Fixed**

All three write `label` straight into the ordinal category column with no uniqueness check.
`getDataErrors` rejects duplicate category values, and `DefaultChartInput.validateDataProvider`
swaps in the empty error provider on any data error — so the whole chart goes blank:

```
createWaterfall([{label:'Start',total:true,value:100},{label:'Other',value:20},{label:'Other',value:-30}])
→ getDataErrors: ["category values must be unique, duplicates: Other"]
```

Two same-named waterfall steps (`Other`, `Adjustments`, `FX`) is ordinary input. `createHeatmap`
already throws for exactly this class on `columnLabels` (B16); its siblings never got the guard.
`createHistogram` has the same hole via a custom `binLabel`.

**Fix:** add the `checkColumnLabels` equivalent to `createWaterfall`/`computeWaterfallSteps`,
`computeCandlesticks` (covering candlestick and OHLC), and over the generated `binLabel` values.

**Fixed automatically.** A shared `checkUniqueLabels(helper, what, labels)` in the new
`src/data/labels.ts` now guards `computeWaterfallSteps`, `computeCandlesticks` (so `createOhlc`
inherits it) and `createHistogram`'s generated `binLabel` values; `createHeatmap`'s hand-rolled
duplicate check was folded into the same helper so all four report identically. Throwing was
chosen over silently disambiguating (`Other`, `Other (2)`) because it matches the B16
`createHeatmap` precedent and because renaming a caller's own labels behind their back is worse
than a message naming the duplicate — a blank chart with no diagnostic is what made this hard to
find in the first place. Four regression tests, one per helper. Full core suite passes (1383
tests), typecheck, lint and deadcode clean.

### HELP-3 — `computeCandlesticks` accepts NaN and missing OHLC fields silently
**High · Bug · [Candlestick.ts:160](packages/mochart/src/data/Candlestick.ts#L160)** — **Fixed**

`open/high/low/close` are copied through unchecked; `direction = close < open ? 'down' : 'up'`.

- `{open:2, high:NaN, low:1.5, close:1.8}` → `downHigh: NaN` → data error → the error provider
  replaces the entire dataset, so **one bad tick blanks a 200-candle chart**.
- `{open:3, low:2, close:3.5}` (no `high`) → validator passes, the candle silently renders with no wick.
- `{open:5, high:6, low:4, close:NaN}` → comparison is false → **green** candle, `change: NaN`.

No `low <= high` sanity check either, so inverted input renders an upside-down wick. Direct
analogue of the fixed B17 waterfall guard, which `Candlestick.ts`/`Ohlc.ts` never received;
neither test file has a non-finite case.

**Fix:** throw when any of the four is missing or non-finite (naming the label), and on
`high < low`. If silent tolerance is preferred, emit `undefined` for *every* column of that
candle so `missingValues` skips the slot cleanly rather than half-drawing it.

**Fixed automatically.** Took the throwing option: `checkCandleValues` runs per candle inside
`computeCandlesticks`, so `createOhlc` inherits it, and the message names the label and the
offending key. The silent-tolerance alternative was rejected because two of the three symptoms
are *wrong output*, not missing output — a NaN close renders a **green** candle with
`change: NaN`, and a missing `high` renders a wickless candle that looks like real flat data.
Neither is something a caller can notice, so failing loudly is the only option that surfaces bad
input. `high < low` is covered too; an all-equal (flat) candle stays legal. Six regression tests.
Full core suite passes (1389 tests), typecheck and lint clean across all workspaces.

### HELP-4 — `createHeatmap` silently paints one colour for a reversed or collapsed `domain`
**Medium · Bug · [Heatmap.ts:107](packages/mochart/src/data/Heatmap.ts#L107), [:146](packages/mochart/src/data/Heatmap.ts#L146)** — **Open**

Neither `createHeatmapColorScale` nor `createHeatmap` checks `domain[1] >= domain[0]`. With a
reversed domain, `extent > 0` is false so every value maps to the ramp midpoint and
`clampValue` returns `0` for every cell — a uniform slab of mid-blue that looks like real flat
data. `binValues` throws on exactly this, so the two helpers disagree on the same option name.

**Fix:** throw `createHeatmap: invalid domain [min, max]` when `!(domain[1] >= domain[0])`,
matching `binValues`' wording. A genuinely collapsed `[v, v]` domain can stay legal.

### HELP-5 — `cellPadding` at or above its documented maximum makes the heatmap invisible
**Medium · Bug · [Heatmap.ts:141](packages/mochart/src/data/Heatmap.ts#L141), [:158](packages/mochart/src/data/Heatmap.ts#L158)** — **Open**

Documented as "The fraction (0 - 0.5)…" but never range-checked:

- `0.5` (the documented maximum) → band `1.5 → 1.5`, zero height; config validates, chart renders empty.
- `0.6` → `categoryPaddingFraction.inner: 1.2` → validation error → config-error component.
- `-0.1` → inverted bands (rows overlap their neighbours) plus two validation errors.

**Fix:** throw unless `cellPadding ∈ [0, 0.5)`, and correct the JSDoc/recipe to the half-open range.

### HELP-6 — `cumulative` + `normalize: 'density'` produces a curve topping out at `1 / binWidth`
**Medium · Bug · [Histogram.ts:136-148](packages/mochart/src/data/Histogram.ts#L136)** — **Open**

The cumulative pass accumulates whatever `normalize` produced. For `'probability'` that is the
CDF (correct, and the only combination tested). For `'density'` it sums densities instead of
density × width:

```
cumulative + probability → 0.2 0.4 0.6 0.8 1     (correct CDF)
cumulative + density     → 0.1 0.2 0.3 0.4 0.5   (should also end at 1)
```

The JSDoc promises density "integrates to 1"; neither it nor the recipe says the combination is
meaningless. Matplotlib's `hist(density=True, cumulative=True)` normalizes the last bin to 1.

**Fix:** when `cumulative` is set, accumulate `count / total` regardless of `normalize`, note it
in the JSDoc, and add the missing test case.

### HELP-7 — doji candles (open === close) draw no body at all
**Medium · Missing feature · [Candlestick.ts:342-368](packages/mochart/src/data/Candlestick.ts#L342)** — **Open**

`bodyConfigs` never sets `barMinExtent` (default 0), and the bar renderer's default normal-state
`strokeWidth` is also 0 — so when `open === close` the body's `property` and `rangeProperty`
resolve to the same value, the zero-extent path in
[SeriesShapes.ts:322](packages/mochart/src/utils/SeriesShapes.ts#L322) is left unexpanded, and
the candle shows only its wick. `createOhlc` already solves exactly this with
`barMinExtent: tickExtent` ([Ohlc.ts:186](packages/mochart/src/data/Ohlc.ts#L186)) — the
machinery exists and is simply not applied to candlestick bodies. A doji is a standard,
meaningful pattern; it currently reads as a missing candle.

**Fix:** add a `bodyMinExtent?: number` option (default 1) emitted as `barMinExtent` on both
`bodyConfigs` entries; document it next to `bodyWidthFraction`.

### HELP-8 — `createWaterfall` makes the caller hand-mirror a `base` it already knows
**Medium · Missing feature · [Waterfall.ts:35-43](packages/mochart/src/data/Waterfall.ts#L35), [:156](packages/mochart/src/data/Waterfall.ts#L156)** — **Open**

`createWaterfall` returns `{ steps, data, categoryAxis, series }` only. Its own JSDoc and
[recipes/waterfall.md:36](packages/mochart-docs/recipes/waterfall.md#L36) instruct the reader to
copy `base` onto the value axis by hand. Forget it and the axis `base` default is `NONE` for a
stackless axis, so bars grow from and animate to the domain minimum instead of the waterfall's
base — silently, with subtly wrong enter/leave animation and label placement. `createHeatmap`
already returns a `valueAxisConfig` fragment; `createCandlestick`/`createOhlc` return `valueAxes`.

**Fix:** return `valueAxisConfig: { base }`, document it, and change the recipe to "spread the
returned fragment". Also reconcile the JSDoc (advises it unconditionally) with the recipe
(advises it only when `base !== 0`).

### HELP-9 — the heatmap `missingColor` option is entirely undocumented
**Medium · Doc gap · [Heatmap.ts:59-65](packages/mochart/src/data/Heatmap.ts#L59) vs [recipes/heatmap.md:46](packages/mochart-docs/recipes/heatmap.md#L46)** — **Open**

`missingColor` turns missing cells from grid gaps into full bands painted with the row series'
`colorScale.missing`. The string appears nowhere in `packages/mochart-docs` — not the recipe,
not `reference/api.md`, not the example. The recipe presents the gap as the sole behaviour. The
"no data ≠ low value" distinction — the whole reason the option exists — is invisible to readers.

**Fix:** extend the missing-cells bullet with `missingColor` (including the "pick a colour
clearly off the ramp" guidance already in the JSDoc) and add it to `reference/api.md`.

### HELP-10 — sibling helpers disagree on the value-axis fragment's name and shape
**Low · Inconsistency · [Heatmap.ts:83](packages/mochart/src/data/Heatmap.ts#L83) vs [Candlestick.ts:130](packages/mochart/src/data/Candlestick.ts#L130)** — **Open**

`HeatmapData` exposes `valueAxisConfig: Partial<ValueAxisConfig>` (singular);
`CandlestickData`/`OhlcData` expose `valueAxes?: Partial<ValueAxisConfig>[]` (array). Two names
and two shapes for the same concept across four sibling helpers.
[reference/api.md:153](packages/mochart-docs/reference/api.md#L153) lists both without comment.

**Fix:** settle on the array form `valueAxes` everywhere (it is the config key's own name and
handles one- and two-axis cases identically); keep `valueAxisConfig` as a deprecated alias for
one release.

### HELP-11 — `reference/api.md` overstates the helper type surface
**Low · Doc inconsistency · [reference/api.md:154](packages/mochart-docs/reference/api.md#L154), [:190](packages/mochart-docs/reference/api.md#L190)** — **Open**

Two slips: the return-shape comments for `createCandlestick`/`createOhlc` omit the optional
`valueAxes` the `volume` option adds (which the prose three lines below describes); and "every
helper's item, option, and result shapes are exported as named types" is untrue —
`CreatePieOptions.tooltipValues` is typed `PieTooltipLabelType` and
`CreateHeatmapColorScaleOptions.colorInterpolation` is typed `ColorInterpolation`, neither
reachable from the package entry. Literal option values still work via contextual typing, but a
TS host cannot type a wrapper prop that forwards them.

**Fix:** add `valueAxes?` to the two comments; export `ColorInterpolation`, `PieLabelType` and
`PieTooltipLabelType` from `src/index.ts` (see [API-3](#api-3--21-config-union-types-are-named-in-the-public-types-but-cannot-be-imported)).

### HELP-12 — two valid large pie values overflow the total and collapse every slice
**Low · Bug · [Pie.ts:64](packages/mochart/src/data/Pie.ts#L64), [PieData.ts:26](packages/mochart/src/data/PieData.ts#L26)** **[from SOL review]** — **Open**

Both pie-normalisation paths — the public `computePieFractions` helper and the duplicate inside
`PieData` that feeds rendered slices and tooltips — sum finite positive values straight into an
accumulator with no overflow guard. Two `Number.MAX_VALUE` values total to `Infinity`, so every
`value / total` evaluates to `0`: fractions `[0, 0]`, zero-angle slices, a blank pie and no error.
Reproduced through the built public helper.

The existing coverage at [Pie.test.ts:15](packages/mochart/test/data/Pie.test.ts#L15) rejects
negative and non-finite *inputs*, so the case that survives is exactly the one where every input is
individually valid.

**Fix:** scale by the maximum before ratioing — divide each value by `max` and sum in that space —
and define what the returned `total` means once the mathematical sum exceeds `Number.MAX_VALUE`.
Keep the two paths in step, or better, have `PieData` call the public helper instead of
re-implementing it.

---

# 5. Core — config system and validation

The five parallel config surfaces (types, defaults, validation, docs, migration) were diffed
mechanically. **They are in excellent shape:** `integrityErrors` is 0, `generateJsdoc --check`
passes, every default passes its own validator across xy/pie/inverted/stacked/date/gradient
variants, every enum value and every `min`/`max` endpoint is accepted with `±1e-6` outside
rejected, `deepMerge` matches its documented contract including `__proto__` safety, and the
naming conventions are clean (no `*Percent` config props, no "paint", no "suppress", no "group
axis" anywhere in `packages/mochart/src`). The findings below are what survived that sweep.

### CONFIG-1 — `validators.color()` rejects most valid CSS/SVG colours
**High · Bug · [movalid/validators.ts:130-179](packages/movalid/src/validators.ts#L130); message authored at [validation/validators.ts:18](packages/mochart/src/config/validation/validators.ts#L18)** **[verified]** — **Fixed** in mochart; movalid left as-is, see VAL-1

The colour predicate is a three-regex whitelist: `#rgb`, `#rrggbb`, `rgb(a,b,c)`, `rgba(a,b,c,d)`.
Everything else is rejected — while the message says `should be a valid svg color`, which `red`
demonstrably is. Probed through `enhanceConfig` on `series[0].shapeStyle.normal.fillColor`:

```
FAIL "red"                 FAIL "hsl(200,50%,50%)"     OK "#f00"
FAIL "#ff000080"           FAIL "oklch(0.7 0.1 200)"   OK "#ff0000"
FAIL "rgb(255 0 0)"        FAIL "transparent"          OK "currentColor"
FAIL "rgb(100%,0%,0%)"                                 OK "none"
```

In strict mode (the default) any of these invalidates the whole config, so the chart renders
its config-error state. The restriction protects nothing: SVG resolves named colours natively,
[utils/style.ts:1](packages/mochart/src/utils/style.ts#L1) parses with `d3-color` (which handles
named/hsl/hex8), and `SeriesColors` interpolates via `d3-interpolate`. Same failure on
`chart.backgroundStyle`, `colorPalette.series.normal.fillColors`, `tooltip.dropShadowColor` and
gradient `stops`. Nothing in the docs states the accepted formats.

**Fix:** widen `color` in movalid — cheapest correct implementation is to delegate to
`d3-color`'s `color()` parse (mochart already depends on it). If the narrow set is genuinely
intended, change the message to name the accepted forms and document them in
[guide/config-model.md](packages/mochart-docs/guide/config-model.md).

**Fixed automatically, on the mochart side.** The one-line `color` override in `configValidators`
(`Object.assign` already shadows movalid's) reaches all eleven call sites. It is now **two
contracts, not one**, because the finding's own evidence shows the fields differ:

- **Colors mochart interpolates itself** — `colorScale.min`/`max`/`missing`/`base.*` and
  `colorPalette` entries — delegate to `d3-color`'s parse, exactly as recommended. That is the
  real contract: what d3 can parse is what `SeriesColors` can interpolate. `red`,
  `rebeccapurple`, `hsl(…)`, `#ff000080` and `transparent` now pass; `currentColor` and `var()`
  still fail, which preserves the invariant that a keyword must never reach a d3 color ramp and
  interpolate to NaN.
- **Colors written straight to the DOM** — every `shapeStyle`/`backgroundStyle` member, gradient
  stops, tooltip colors — also accept CSS color functions `d3-color` predates. Delegating to d3
  alone would *not* have been enough here: `rgb(255 0 0)` and `hsl(200 50% 50%)` (space syntax)
  and `oklch(…)` all fail d3's parser but render fine, since the browser resolves the attribute.

Every entry in the finding's failing table now validates, and `notacolor`/`''`/non-strings still
do not. `guide/config-model.md` documents both tiers. `movalid` itself is untouched — see
[VAL-1](#val-1--color-rejects-most-valid-csssvg-colours) for the open question about that. The
existing `validators.test.ts` case that asserted `red` is invalid is updated; it was pinning the
bug. Full core suite passes (1393 tests), movalid 383, typecheck across all 20 workspaces, lint
and deadcode clean.

### CONFIG-2 — `valueAxisDefaults` is silently ignored when no `valueAxes` entry is declared
**High · Bug · [core/mochartConfig.ts:168,173,176](packages/mochart/src/config/core/mochartConfig.ts#L168)** — **Fixed**

`valueAxes` is the one list section with an implicit entry (`singleDefaultIfEmpty`). When the
user declares no `valueAxes`, `applyDefaults` installs the default list verbatim via
`copyDefaultsList` and never merges `allSection` into it, so `valueAxisDefaults` becomes a
complete no-op. `applyAllConfig` cannot rescue it — it merges the all-config *under* the
already-defaulted entry, so every key is shadowed.

```
enhanceConfig({ …, valueAxisDefaults: { visible: false, title: 'T' } })
  → valueAxes: [{ id:'VA0', visible: true,  title: null }]   valid: true   ← ignored
add valueAxes: [{}]
  → valueAxes: [{ id:'VA0', visible: false, title: 'T'  }]                 ← honoured
```

No error, no warning. [guide/config-model.md:42](packages/mochart-docs/guide/config-model.md#L42)
says otherwise. The library already trips over this internally:
[helper/sparkline.ts:41](packages/mochart/src/config/helper/sparkline.ts#L41) carries the comment
*"\*Defaults sections only reach declared entries, so declare the default axis"* and works around
it with `valueAxes: config.valueAxes ?? [{}]`.

**Fix:** merge `allSection` over each defaults entry on the no-config-section paths —
`defaultsSection.map(entry => isObject(entry) ? deepMerge(entry, allSection) : entry)`. Safe for
the other list sections, whose defaults list is empty when nothing is declared. Then drop the
sparkline workaround.

**Fixed automatically.** Applied as recommended: `copyDefaultsList` now takes `allSection` and
deep-merges it over each entry, which covers all three paths that install the defaults list
(section undefined, section present but every entry ignored, and a non-object section) rather
than only the first — so `valueAxes: [{ignore: true}]` now behaves like `valueAxes` absent,
matching what "treat it as though it were not specified" already promises. The other five list
sections are unaffected: their defaults list is empty when nothing is declared, so the merge has
nothing to map over. The sparkline workaround (`valueAxes: config.valueAxes ?? [{}]`) and its
explanatory comment are gone. Three regression tests in `test/config/core.test.ts`, two of which
fail on the unpatched source. Full core suite passes (1396 tests), typecheck and lint clean.

### CONFIG-3 — `ignore: true` entries are still cross-reference-validated
**High · Bug · [validation/mochartConfig.ts:474](packages/mochart/src/config/validation/mochartConfig.ts#L474)** **[verified]** — **Fixed**

`validateReferences` runs over `configWithoutDefaults[targetSectionKey]` — the *unfiltered* raw
list — so entries carrying `ignore: true` (documented as "treat it as though it were not
specified") still have their `axis`/`stack`/`group`/`gradient` references checked. Every other
cross-check (`validateUnique`, `validateFollowSeries`, `validateCommonReferences`) works off the
already-filtered built config.

```
series: [{ property: 'v', axis: 'main' }, { property: 'w', ignore: true, axis: 'nope' }]
→ built series: ["v"]   valid: false
→ 'series[1] - axis - should equal the id property of one of the valueAxes: "nope"'
```

The chart renders the config-error state — for a series that was explicitly disabled. Shape
validation on the same entry *is* correctly skipped, which shows the intent.

**Fix:** filter the raw target list with `filterConfigs` before passing it to
`validateReferencesInternal`, reporting against the raw index via the same `rawIndices` mapping
the other three validators use.

**Fixed automatically.** Applied exactly as recommended. `validateReferences` filters the raw
target list before passing it on, and `validateReferencesInternal` takes an optional `rawIndices`
mapping so a genuine dangling reference is still reported at its position in the *user's* array —
`series[1]` stays `series[1]` even when `series[0]` is ignored, which is what the other three
cross-checks already do. The non-array (single-object) target path is left untouched, since
`filterConfigs` would turn it into an empty list and skip validation altogether. Two regression
tests in `test/config/config.test.ts`, alongside the existing ignored-entry block. Full core suite
passes (1398 tests), typecheck and lint clean.

### CONFIG-4 — `tooltip.backgroundStyle.strokeDashArray` type-checks but invalidates the config
**Medium · Inconsistency · [types/config.ts:1235](packages/mochart/src/types/config.ts#L1235) vs [validation/tooltipConfig.ts:27](packages/mochart/src/config/validation/tooltipConfig.ts#L27)** **[verified]** — **Open**

This is the **only** key in the whole config that the TS types declare and the other three
surfaces do not. Defaults, validation and docs deliberately model the tooltip box as a
five-member CSS style; the type reuses the six-member SVG `Style`.

```ts
tooltip: { backgroundStyle: { strokeDashArray: '5, 5' } }   // compiles
→ valid: false, 'tooltip - backgroundStyle - had 1 invalid properties: strokeDashArray'
```

**Fix:** give it its own type — `export type CssStyle = Omit<Style, 'strokeDashArray'>`. Adding
`strokeDashArray` to `cssStyle()` instead would be wrong: the tooltip border is a CSS `border`.

### CONFIG-5 — six places where the types and the runtime contract disagree
**Medium · Inconsistency** — **Open**

| key | types say | runtime accepts | effect |
|---|---|---|---|
| `categoryAxis.min`/`max` [:1529](packages/mochart/src/types/config.ts#L1529) | `number \| Auto` | `datePrimitive().orEqual(AUTO)` on a linear date axis | `{type:'date',scale:'linear',min:'2020-01-01'}` works but TS rejects it — **too narrow** |
| `categoryAxis.softMin`/`softMax` [:1606](packages/mochart/src/types/config.ts#L1606) | `number \| null` | same date branch | the documented ISO-string form is untypable |
| `ValueAxisConfig.scale` [:2103](packages/mochart/src/types/config.ts#L2103) | `Scale` | `equal(SCALE_LINEAR)` | `scale:'ordinal'` compiles, then errors — **too wide** |
| `ValueAxisConfig.type` [:2122](packages/mochart/src/types/config.ts#L2122) | `DataType` | `equal(TYPE_NUMBER)` | `type:'string'` compiles, then errors |
| `TooltipConfig.filteredValueCharacter` [:1315](packages/mochart/src/types/config.ts#L1315) | `string` | `stringWithLength(1).orEqual(NONE)`; docs say "use null for none" | the documented `null` is rejected by TS |
| `LinearGradientConfig.stops` [:2935](packages/mochart/src/types/config.ts#L2935) | optional | no default; non-empty array required | `[{id:'G'}]` compiles, then errors — `stops` is effectively required |

**Fix:** narrow `scale`/`type` to the literal types; widen the category-axis bounds to
`number | string | Auto` / `number | string | null` (matching `ThresholdConfig.value`, which
already gets this right); make `filteredValueCharacter: string | null`; make `stops` required.
Add a types-vs-model check to `checkKeyIntegrity` so all six cannot recur.

### CONFIG-6 — the documented migration path is never wired into any entry point
**Medium · Doc gap · [helper/index.ts:6-11](packages/mochart/src/config/helper/index.ts#L6), [DefaultChartInput.ts:69](packages/mochart/src/chart/DefaultChartInput.ts#L69)** — **Open**

The docs tell users to store `version` "so `migrateConfig` can upgrade them if the format
changes", and describe `createDefaultChart` as one that "validates and defaults the raw config
for you on every update". Neither `enhanceConfig` nor `DefaultChartInput` calls `migrateConfig` —
the only in-repo callers are the demos. No doc page says the user must call it.

Latent today (`CONFIG_VERSION` is the initial `'1.0.0'` and there are no steps), but the moment a
step is added, a stored `version: '1.0.0'` config passed to `createDefaultChart` fails validation
instead of migrating — exactly the scenario the docs promise is handled.

**Fix:** either call `migrateConfig` at the head of `enhanceConfig`, or state plainly in
`guide/config-model.md` and `reference/api.md` that stored configs must be passed through
`migrateConfig` first.

### CONFIG-7 — array-element shapes have no documentation in the config reference
**Medium · Doc gap · [configReferenceModel.ts:660-675](packages/mochart/scripts/configReferenceModel.ts#L660), [renderSection.ts:75](packages/mochart-docs/.vitepress/lib/renderSection.ts#L75)** — **Open**

Both walk `validator.nestedValues` only, never `itemValidator`. `checkLevelIntegrity` therefore
protects nested *objects* but exempts array-element shapes — so `ThresholdConfig`'s eleven
members, `ValueAxisTick`'s two and `GradientStop`'s three have hand-written JSDoc that never
reaches the reference site. The `valueAxes.thresholds` page's entire per-member documentation is
one ~2,000-character inline code span with no descriptions, defaults or anchors. Related:
`renderSection.ts:107` prints "Every property is optional and falls back to its default" on the
gradient pages, which is false for `stops` (CONFIG-5).

**Fix:** walk `validator.itemValidator?.nestedValues` into `property.properties` (rendered as
`thresholds[].title`), add the matching `docs/` description maps, and extend `checkLevelIntegrity`
to cover them. Drive the "every property is optional except…" sentence off `missingDefaultWhitelist`
rather than a hard-coded pair of section ids.

### CONFIG-8 — `ignore` works on five list sections but is typed, validated and documented on one
**Low · Inconsistency · [core/mochartConfig.ts:138](packages/mochart/src/config/core/mochartConfig.ts#L138)** **[verified]** — **Open**

`applyDefaults` runs `filterConfigs` (`config.ignore !== true`) over *every* array section —
`valueAxes`, `seriesGroups`, `seriesStacks`, `linearGradients`, `radialGradients` as well as
`series` — but `ignore` is declared only on `SeriesConfig`, validated only in `seriesConfig.ts`,
and documented only in `docs/seriesConfig.ts`. `valueAxes: [{id:'a'},{id:'b',ignore:true}]`
works at runtime (verified: built config has only `a`) but `MochartInputConfig` rejects it at
compile time, and `seriesStacks: [{id:'s', ignore:false}]` produces a spurious "had 1 invalid
properties" warning.

**Fix:** either add `ignore` to the other five entry types (types + `validators.boolean()` +
docs), or restrict `filterConfig` to the `series` section.

### CONFIG-9 — `validateConfig`'s `strict` parameter is undocumented
**Low · Doc gap · [validation/mochartConfig.ts:196](packages/mochart/src/config/validation/mochartConfig.ts#L196) vs [reference/api.md:113](packages/mochart-docs/reference/api.md#L113)** — **Open**

Both exported validators take a third `strict = true` argument that flips whether warnings
invalidate the config. The reference shows only the two-argument form.
[guide/config-model.md:160](packages/mochart-docs/guide/config-model.md#L160) says "a config with
warnings is rejected in strict mode" without saying the mode is switchable — so a host that wants
to tolerate unknown keys (a live-preview config editor, say) has no way to discover
`validateConfig(config, defaults, false)` short of reading the `.d.ts`.

**Fix:** add the parameter to the `reference/api.md` signature block and one line to the guide bullet.

---

# 6. Core — public API, types and utils

### API-1 — 21 config union types are named in the public types but cannot be imported
**High · Missing feature · [types/config.ts:1](packages/mochart/src/types/config.ts#L1)** — **Fixed**

`types/config.ts` imports `Auto, Align, AxisSide, MissingValues, VerticalAlign, Anchor, Position,
Scale, DataType, RendererType, ThresholdTitleSide, CurveType, CapType, LabelPosition, ColorMode,
ColorInterpolation, MarkerShape, MarkerSizeScale, ChartType, PieLabelType, PieTooltipLabelType`
from `config/core/constants.ts` and uses them as the types of public config members — but never
re-exports them, `src/index.ts` doesn't either, and the `exports` map blocks the deep path.
Verified with a simulated consumer package: 21 × `TS2305 has no exported member`.

[reference/api.md:202](packages/mochart-docs/reference/api.md#L202) says the constants are
exported "so configs built in code can avoid string literals", yet a TS host cannot write
`function addSeries(renderer: RendererType)` — only `SeriesConfig['renderer']`. The *value*
constants for renderers, positions, aligns, curves, caps, marker shapes, label positions and pie
label types are not exported either (only `NONE`, `AUTO`, `TYPE_*`, `SCALE_*`, `CHART_TYPE_*`),
nor is `CONFIG_VERSION` — every demo config hardcodes `version: '1.0.0'`.

**Fix:** `export type { … } from '../config/core/constants'` in `src/index.ts`, plus the remaining
literal constants and `CONFIG_VERSION`.

**Fixed automatically.** Applied as recommended: `src/index.ts` now re-exports all 21 union types
plus `CONFIG_VERSION` and the ~50 remaining value constants (`ALIGN_*`, `VERTICAL_ALIGN_*`,
`ANCHOR_*`, `POSITION_*`, `SIDE_*`, `TITLE_SIDE_*`, `MISSING_VALUES_*`, `RENDERER_*`,
`CURVE_TYPE_*`, `CAP_TYPE_*`, `LABEL_POSITION_*`, `COLOR_*`, `COLOR_INTERPOLATION_*`,
`MARKER_SHAPE_*`, `MARKER_SIZE_SCALE_*`, `PIE_LABEL_TYPE_*`). `reference/api.md`'s Constants
section is rewritten to list both families. The new `test/config/publicTypes.test.ts` pins the
surface from both directions: the union types are named in a host-style signature so that
`npm run typecheck` fails if any export is dropped, and the constants are checked by name and
value at runtime. `HELP-11`'s request for `ColorInterpolation`, `PieLabelType` and
`PieTooltipLabelType` is satisfied by the same change. Full core suite passes (1400 tests),
typecheck, lint and deadcode clean.

### API-2 — ~55 layout/animation/data internals ship as public types
**Medium · Inconsistency · [types/index.ts:1](packages/mochart/src/types/index.ts#L1)** — **Open**

`export type * from './layout'` publishes all 14 layout types; the explicit animation list
publishes 31 tween internals (`CompleteNumericArrayDelta`, `OuterChangeCounts`,
`SeriesValueDeltaMap`, …); `data.ts` adds `SeriesDataSet`, `StackData`, `SeriesPositionData`,
`CategorySpacingInfo` and friends. None is documented in `reference/api.md`, and grepping every
non-core package finds zero uses. Meanwhile
[types/enhanced.ts:12](packages/mochart/src/types/enhanced.ts#L12) explicitly states "Never
exported from the package index" — the intent to keep internals private exists, but
layout/animation/data were exported wholesale. Any refactor of the tween or layout pipeline is
now a published type-surface break.

**Fix:** drop `export type * from './layout'` and the animation block (keep `FocusData`/
`FocusPercentage` if `ChartDataSource` needs them); narrow `data.ts` to what `DataProvider`
consumers actually need.

### API-3 — crosshair elements get unnamespaced CSS classes
**Medium · Bug · [ChartDom.ts:69](packages/mochart/src/utils/ChartDom.ts#L69)** — **Open**

`crosshairCategoryLines: 'crosshair-category-lines'`, `crosshairSeriesLines`, `crosshairLine` —
the only three of ~90 entries without the `mochart-` prefix. `Crosshair.ts` writes them straight
onto the rendered SVG, so a host page with any rule matching `.crosshair-line` restyles the chart.
The e2e suite already has to qualify them
([interactions.spec.ts:26](packages/mochart-demo-basic/e2e/interactions.spec.ts#L26)).

**Fix:** rename to `mochart-crosshair-*`, update the three core tests and two e2e selectors, and
regenerate goldens.

### API-4 — `mochartCssClasses` values are not all class names, contradicting the API reference
**Medium · Doc gap · [reference/api.md:212](packages/mochart-docs/reference/api.md#L212)** — **Open**

api.md says the map gives "the CSS class the renderer puts on it … useful for targeted CSS
overrides and DOM queries". In fact 16 entries are a base class *plus an id prefix* in one string:
`series: 'mochart-series mochart-series-'`. So `'.' + mochartCssClasses.series` yields the
selector `.mochart-series mochart-series-`, which silently matches nothing. Core itself works
around this with `.split(' ')[0]`, and so does the shipped `@mochart/export`.

**Fix:** document the two-part convention explicitly with a composition example, or split the map
into `{ base, prefix }` entries so no value is a compound string.

### API-5 — the core README omits all seven chart-shape helpers and the pie chart type
**Medium · Doc gap · [packages/mochart/README.md:12](packages/mochart/README.md#L12)** — **Open**

The npm landing page never mentions `createHistogram`, `createWaterfall`, `createHeatmap`,
`createCandlestick`, `createOhlc`, `createPie`, `createSparklineConfig` or the five lower-level
companions — 12 public exports and an entire section of `reference/api.md`. The Features list
still says "**Renderers**: `bar`, `line`, and `area` series", with no mention that pie/donut is a
supported chart type. READMEs are the one documentation surface with no CI ratchet
([checkApiCoverage.ts:57](packages/mochart-docs/scripts/checkApiCoverage.ts#L57) scans only
`index.md`, `guide/`, `reference/`, `recipes/`).

**Fix:** add a "Chart helpers" section mirroring `api.md:142-200`, and add pie/donut to Features.

### API-6 — `MochartConfig` omits `version`, which the built config carries at runtime
**Medium · Inconsistency · [types/config.ts:3009](packages/mochart/src/types/config.ts#L3009)** — **Open**

`MochartInputConfig.version?: string` exists but `MochartConfig` has no `version`. `applyDefaults`
spreads the input config, so `enhanceConfig({version:'1.0.0', …}).version === '1.0.0'` at runtime
while TypeScript says the property does not exist. Round-tripping an enhanced config back out —
what the editor and demo "config JSON" tabs do — loses the version in typed code or needs a cast.

**Fix:** add `version?: string` to `MochartConfig` with the same JSDoc.

### API-7 — text truncation splits surrogate pairs, emitting lone surrogates
**Low · Bug · [TextTruncation.ts:127](packages/mochart/src/utils/TextTruncation.ts#L127)** — **Open**

`truncateSVGText` slices with `substr` and narrows one UTF-16 code unit at a time, so astral
characters get cut in half. Probed with a stubbed `getComputedTextLength`: `"😀😀😀😀😀"` at 65px
→ `"😀😀\ud83d"` (lone high surrogate, renders as U+FFFD before the ellipsis); `"🇺🇸 flag"` →
`"🇺"`, splitting the flag into a bare regional indicator. Affects axis tick labels, chart/axis
titles and legend items.

**Fix:** slice on code-point boundaries — use `Array.from(text)` for the length and index
arithmetic, or back off one more unit while the last code unit is a high surrogate.

### API-8 — `cssStyleColor` silently drops the configured opacity for `currentColor`
**Low · Bug · [utils/style.ts:35](packages/mochart/src/utils/style.ts#L35)** — **Open**

When `styleOpacity` is a number and `color(styleColor)` returns `null` — exactly what d3 does for
the `currentColor` keyword `cssColorValidator` explicitly accepts — the function returns
`styleColor` unchanged, discarding the opacity. `tooltip.backgroundStyle.normal = { fillColor:
'currentColor', fillOpacity: 0.9 }` validates but renders fully opaque, and the HTML tooltip has
no separate opacity attribute to fall back on.

**Fix:** emit `color-mix(in srgb, <color> <opacity*100>%, transparent)` for an unparseable colour
with a non-null opacity, or reject the combination in `cssStyleKeyMap` so it is a validation error.

### API-9 — state-factory context members arrive inconsistently; the README implies otherwise
**Low · Doc gap · [packages/mochart/README.md:238](packages/mochart/README.md#L238)** — **Open**

README says all six factories are "each called with a context object
(`{ width, height, mochartConfig, dataProvider, error, hasData }`)". Actually:
`getNoSizeComponent`/`getConfigErrorComponent` → `{mochartConfig, width, height}`;
`getLoadingComponent` → `{width, height}` in the pre-config path but the full object in the body
path; `getNoSeriesComponent` → `{width, height}` only; `getErrorComponent` → two different
shapes. `hasData` reaches *only* `getLoadingComponent`; `error` only `getErrorComponent`. A
consumer writing `getNoDataComponent: ({ hasData }) => …` gets `undefined` with no warning.

Two further members are documented as one thing and delivered as another (from the SOL pass; the
public JSDoc lives at [types/chart.ts:64](packages/mochart/src/types/chart.ts#L64)):

- **`width`/`height` change meaning per state.** They are documented as the chart dimensions, and
  the early states get them — [Chart.ts:995](packages/mochart/src/components/Chart.ts#L995) — but
  the no-series factory at [:1234](packages/mochart/src/components/Chart.ts#L1234) and the in-chart
  loading, error and no-data content at [:1266](packages/mochart/src/components/Chart.ts#L1266)
  receive **plot-area** dimensions instead. A factory sizing its placeholder to the numbers it is
  handed gets a different box depending on which state invoked it.
- **`mochartConfig` is not null when validation fails.** The doc says it is; the config-error
  factory is passed the *invalid* config
  ([Chart.ts:995](packages/mochart/src/components/Chart.ts#L995)) — which is arguably the more
  useful value, since it is what the factory would want to report on, but it is the opposite of
  what is written. [chart-states.md:70](packages/mochart-docs/guide/chart-states.md#L70) repeats
  the same ambiguous contract.

**Fix:** replace the flat list with a per-factory table, and mirror it in the JSDoc in
[types/chart.ts:64](packages/mochart/src/types/chart.ts#L64) (which feeds the generated
`/reference/props#factoryContext`) and in `chart-states.md`. Document `width`/`height` as
state-dependent slot dimensions and `mochartConfig` as the config as supplied, valid or not — or,
for a cleaner API, expose unambiguous `chartWidth`/`chartHeight`/`plotBounds` fields and deprecate
the overloaded pair.

### API-10 — `ChartEventPayload.categoryPercentage`/`valuePercentage` violate the `Fraction` convention
**Low · Inconsistency · [types/chart.ts:16-20](packages/mochart/src/types/chart.ts#L16)** **[verified]** — **Open**

Both fields are documented — in the JSDoc, the shipped `.d.ts`, and the generated
`/reference/callbacks` page — as "as a **0–1 fraction** of the plot", yet carry a `Percentage`
suffix. Every 0–1 config property uses `Fraction` (`barWidthFraction`, `innerRadiusFraction`,
`labelMinRangeFraction`, `centerOffsetYFraction`, …). These two are the only `*Percent*` names
left in the documented public API; the rest are internal `deltaPercentage` fields in
`types/animation.ts`. A reader may reasonably pass the value to a `%` formatter.

**Fix:** rename to `categoryFraction`/`valueFraction` (pre-1.0, so a clean rename), or note the
deliberate exception where the convention is stated.

### API-11 — `apiReferenceModel.ts` calls `InternalFocus` internal, but it is an explicit public export
**Low · Doc inconsistency · [apiReferenceModel.ts:82](packages/mochart/scripts/apiReferenceModel.ts#L82)** — **Open**

`internalInterfaces` excludes it with the reason "never crosses the public boundary". It is
exported by name from [index.ts:15](packages/mochart/src/index.ts#L15) and documented in
`reference/api.md:232`. The stated invariant that gates the generator's integrity check is false,
so the check cannot catch a genuinely leaked type later.

**Fix:** give it a group in `pageSources`, or correct the reason string.

### API-12 — `generate-docs` writes its output before reporting integrity errors
**Low · Bug · [generator.ts:179](packages/mochart/scripts/generator.ts#L179)** — **Open**

`generateDocs` writes `config-reference.json`, `mochart-docs.html` and `api-reference.json` and
only afterwards checks `integrityErrors` to set the exit code — so a failing run leaves
regenerated artifacts on disk. Separately, the README says the command "writes mochart-docs.html
plus generated/config-reference.json" and never mentions `generated/api-reference.json`, which
the docs site's props/callbacks pages consume.

**Fix:** collect both models first, bail before writing when `integrityErrors.length > 0`, and add
the third artifact to both README mentions.

### API-13 — the advanced public input types are non-nullable and the controller casts around it
**Low · Inconsistency · [ChartDataSource.ts:8](packages/mochart/src/chart/ChartDataSource.ts#L8), [Chart.ts:43](packages/mochart/src/components/Chart.ts#L43), [ChartController.ts:110](packages/mochart/src/chart/ChartController.ts#L110)** **[from SOL review]** — **Open**

`ManagedChartProps` correctly allows a null `config` and `dataProvider` while the chart is loading,
but the two types advertised alongside it as public extension contracts — `ChartDataSourceInput`
and the renderer's `ChartProps` — require both. `ChartController` bridges the gap with unsafe
casts, which its own comment at [:110](packages/mochart/src/chart/ChartController.ts#L110)
documents, forwarding values that are genuinely null at runtime through types declaring they cannot
be. [reference/api.md:220](packages/mochart-docs/reference/api.md#L220) presents both as supported
advanced surfaces, so a host implementing `ChartDataSource` against the published types gets a
contract the library itself does not honour.

`REVIEW-FINDINGS.md` is internally inconsistent about this one: it reports zero open findings at
[:14](REVIEW-FINDINGS.md#L14) while recording this same issue as an open follow-up at
[:216](REVIEW-FINDINGS.md#L216).

**Fix:** widen the types at the actual control-flow boundary — nullable until the first successful
load, non-null after — and delete the casts; or stop presenting `ChartDataSourceInput` as a
supported public extension contract. Either way, correct the `REVIEW-FINDINGS.md` summary.

---

# 7. Accessibility

### A11Y-1 — a linked title stays focusable inside an `aria-hidden` decorative chart
**High · Bug · WCAG 4.1.2 (axe `aria-hidden-focus`) · [Title.ts:159-162](packages/mochart/src/components/Title.ts#L159), [Chart.ts:1051](packages/mochart/src/components/Chart.ts#L1051)** — **Fixed**

`accessibility.hidden: true` puts `aria-hidden="true"` on the root and removes every
mochart-authored tab stop — except the SVG `<a href>` that `title.link` renders. It gets no
`tabindex="-1"` and no `aria-hidden`, and SVG anchors with `href` are in the sequential focus
order in every browser. A keyboard/screen-reader user tabs onto a link the AT cannot see or name.

The existing test ([ChartAria.test.ts:143](packages/mochart/test/components/ChartAria.test.ts#L143))
asserts `querySelectorAll('[tabindex]').length === 0`, which passes because the anchor is
*natively* focusable — the assertion cannot catch this class of bug. Host content injected through
`getNoDataComponent`/`getErrorComponent`/`getLoadingComponent` has the same hole.

**Fix:** set `tabindex: '-1'` on the anchor when `accessibility.hidden` (mirroring
[TooltipControls.ts:122](packages/mochart/src/components/TooltipControls.ts#L122)). Change the
test to assert against natively focusable selectors (`a[href], button, [tabindex]:not([tabindex="-1"])`),
and soften the "every keyboard tab stop is removed" claim to name what the library controls.

**Fixed automatically.** All three parts. The title anchor takes `tabindex="-1"` when
`accessibility.hidden`; the decorative-chart tests now assert against a natively-focusable
selector list, with `:not([tabindex="-1"])` applied to *every* member — `a[href]` alone still
matches an anchor that has been opted out, which is the same blind spot in a different place; and
`guide/accessibility.md` now says "every tab stop the chart itself renders", enumerates them, and
points out that content injected through the state factories is the host's to make non-focusable.
Two new tests, one of which fails on the unpatched source. Full core suite passes (1402 tests),
typecheck and lint clean.

### A11Y-2 — `onTitleClick` is a mouse-only control
**High · Bug · WCAG 2.1.1 (Level A) · [Title.ts:155](packages/mochart/src/components/Title.ts#L155), [Chart.ts:973](packages/mochart/src/components/Chart.ts#L973)** **[verified]** — **Fixed**

The title `<g>` gets `onClick: this.chartTitleClick` unconditionally, with no `tabindex`, no
`role`, no key handler — and it is not gated by the `accessibility` section at all. `onTitleClick`
is a public prop on all five bindings. Keyboard and switch users cannot fire it; screen-reader
users get no indication the title is actionable. `title.link` is the only keyboard-reachable
title affordance.

**Fix:** when `accessibilityActive(...)` and an `onClick` prop is present, give the title `<g>`
`tabindex="0"`, `role="button"`, an `aria-label` from the title text, and an Enter/Space handler —
the same treatment [Series.ts:357](packages/mochart/src/components/Series.ts#L357) already applies.

**Fixed automatically.** Applied as recommended, plus the prerequisite the fix depends on: `Chart`
passed `onClick: this.onTitleClick` *unconditionally*, so `Title` could not tell a host callback
from none — it now passes `undefined` unless `props.onTitleClick` is set, which also stops
installing a click handler nothing listens to. The title `<g>` then takes `tabindex="0"`,
`role="button"`, an `aria-label` built from prefix + text + suffix (so the name matches what is
visible), an Enter/Space handler and `cursor: pointer`. A **linked** title is deliberately excluded:
the anchor is already a keyboard-reachable control, and nesting `role="button"` around it would
announce two controls for one target. Four regression tests in `ChartAria.test.ts`; the guide and
the interaction docs both describe the new semantics. Full core suite passes (1406 tests),
typecheck and lint clean.

This also covers the SOL pass's "A callback-only title is inaccessible by keyboard", which was
skipped as a duplicate of this finding.

### A11Y-3 — keyboard focus is dropped to `<body>` when the plot or tooltip tab stops are torn down
**Medium · Bug · WCAG 2.4.3 · [Chart.ts:1192-1257](packages/mochart/src/components/Chart.ts#L1192), [:731](packages/mochart/src/components/Chart.ts#L731)** — **Open**

[Chart.ts:1198](packages/mochart/src/components/Chart.ts#L1198) documents that the plot tab stop
is deliberately kept during *loading* so focus is not dumped to `<body>` — but the same teardown
happens on any refresh that drops to zero categories or raises an error, and `closeTooltip`
(unlike `escapeTooltip`) never restores focus. Verified: focus the plot rect, then
`update({data: []})` → rect disconnected, `activeElement === body`. Open the tooltip, Tab onto a
control, close from the plot → `activeElement === body`. Any keyboard user of a polling chart
loses their place.

**Fix:** in `syncBody`, capture whether `document.activeElement` is inside the plot before
replacing it and re-focus a surviving stop; have `closeTooltip` do what `escapeTooltip` does.

### A11Y-4 — export stamps `role="img"` on charts that carry no accessible name
**Medium · Bug + doc inconsistency · WCAG 1.1.1 · [export/index.ts:182-189](packages/mochart-export/src/index.ts#L182)** **[verified]** — **Open**

`cloneChartSvg` sets `role="img"` unconditionally, but `aria-label` is only written when
`accessibilityActive(...)` ([Chart.ts:1176](packages/mochart/src/components/Chart.ts#L1176)). So
exporting a chart with `accessibility.enabled: false` or `hidden: true` produces `<svg role="img">`
with no accessible name — an unnamed image, a harder failure than the unroled svg it came from.
The guide claims the exported image "is still announced by the chart's name", true only in the
default configuration.

**Fix:** set `role="img"` only when the clone has an `aria-label`/`aria-labelledby`; otherwise set
`aria-hidden="true"` (or accept an `ariaLabel` export option). Correct the guide's Exports paragraph.

### A11Y-5 — `accessibility.enabled: true` removes more text from the a11y tree than it adds
**Medium · Bug · WCAG 1.3.1 / 1.1.1 · [Plot.ts:65-66](packages/mochart/src/components/Plot.ts#L65), [Series.ts:360](packages/mochart/src/components/Series.ts#L360)** — **Open**

`PlotFrontBack` (which owns `AxisContainer` → all tick labels and axis titles) and every
non-interactive series `<g>` (which owns `SeriesLabels`, the visible data-value labels) are
`aria-hidden="true"` whenever accessibility is active. Measured on a default two-series chart with
a title: 19 `<text>` nodes, only 6 outside an `aria-hidden` subtree — the title and the legend
labels. No axis tick label and no data label survives. A screen-reader user who *reads* rather
than operates the chart gets strictly **less** from `enabled: true` than from `enabled: false`.
This is the opposite direction from the known-open data-table item.

**Fix:** hide only the geometry (`AxisGridContainer`, `AxisBaseContainer`,
`AxisThresholdContainer`, tick marks) and leave tick-label and axis-title `<text>` exposed; same
for `SeriesLabels` when visible. Failing that, say so explicitly in
[guide/accessibility.md](packages/mochart-docs/guide/accessibility.md).

### A11Y-6 — default encoding is colour-only, on a palette that is not CVD-checked
**Medium · Bug + doc gap · WCAG 1.4.1 (Level A) · [colorPaletteConfig.ts:1](packages/mochart/src/config/defaults/colorPaletteConfig.ts#L1), [seriesConfig.ts:237](packages/mochart/src/config/defaults/seriesConfig.ts#L237)** — **Open**

The default palette is d3 `category10` + the `category20` tail, which is not CVD-safe
(`#2ca02c`/`#d62728` and `#1f77b4`/`#9467bd` collapse under deuteranopia/protanopia).
`markerShape` defaults to `circle` for *every* line/area series and `strokeDashArray` defaults to
`NONE`, so series are distinguished by hue alone and the legend maps hue→name with a matching hue
swatch. The repo does have CVD-validated colour work, but only inside the waterfall/candlestick
helpers — it was never applied to the base palette. `guide/accessibility.md` has no colour section
at all, and no guide mentions colour-blindness or contrast.

**Fix:** ship a CVD-checked default palette (Okabe–Ito), or at minimum vary `markerShape` per
series index by default the way colours vary. Add a "Colour" section to the accessibility guide
pointing at `series.markerShape`, `series.shapeStyle.*.strokeDashArray` and `series.labels` as
redundant encodings, and state the contrast expectation against the plot background.

### A11Y-7 — no 24 × 24 minimum for any interactive target
**Medium · Missing feature · WCAG 2.5.8 (AA, new in 2.2) · [legendConfig.ts:24](packages/mochart/src/config/defaults/legendConfig.ts#L24), [TooltipControls.ts:22](packages/mochart/src/components/TooltipControls.ts#L22), [TooltipContent.ts:85](packages/mochart/src/components/TooltipContent.ts#L85)** — **Open**

Nothing enforces a minimum hit area. Legend items are ≈22 px tall at a 16 px host font; tooltip
control buttons ≈22 px tall; interactive tooltip rows have `padding: 2`. All are laid out adjacent
(1 px legend margin, 3 px control gap), so the SC's spacing exception only rescues single-row
horizontal layouts. Motor-impaired and touch users mis-hit the toggle next to the one they wanted —
which filters the wrong series.

**Fix:** give the legend item background and the tooltip controls a configurable minimum extent
(default 24) applied to the interactive box rather than the text.

### A11Y-8 — arrow-key convention differs between the plot rect and every other roving group
**Low · Inconsistency · [Chart.ts:948-970](packages/mochart/src/components/Chart.ts#L948) vs [SeriesContainer.ts:85](packages/mochart/src/components/SeriesContainer.ts#L85), [Legend.ts:104](packages/mochart/src/components/Legend.ts#L104), [TooltipContent.ts:281](packages/mochart/src/components/TooltipContent.ts#L281)** — **Open**

All five groups use the same key set, but the plot rect's arrows step **categories** while arrows
on a series, slice, legend item or tooltip row move **between siblings** — and both live in the
same plot area, one Tab apart. Tab to a series and press Enter: the tooltip opens at the
*remembered* category, unrelated to the series activated, and the same keypress also fires
`onSeriesClick`. Press → and the tooltip stays put while focus jumps to the next series; there is
no way to step categories without Tabbing back to the plot rect.

**Fix:** pick one convention — forward `Arrow*` from a focused series to `onPlotKeyDown` (matching
the Enter/Space/Escape forwarding already there) and move sibling navigation to Tab, or stop
opening the tooltip on Enter-over-a-series. At minimum, document the dual action.

### A11Y-9 — the live region has no explicit `aria-live` and no de-duplication or throttle
**Low · Bug · WCAG 4.1.3 · [Chart.ts:1178-1181](packages/mochart/src/components/Chart.ts#L1178), [:888](packages/mochart/src/components/Chart.ts#L888)** — **Open**

The announcer is `<div role="status">` with no `aria-live`, no `aria-atomic`, and
`announceTooltipCategory` replaces `textContent` on every arrow keypress with no comparison against
the previous string. Holding → across 50 categories queues 50 polite announcements. Stepping to a
category whose formatted values are identical writes the same string, which several screen readers
silently drop. (Content is otherwise correct and uses the configured value formats; hover
deliberately does not announce, so the spam is keyboard-repeat only.)

**Fix:** add `aria-live="polite"` and `aria-atomic="true"` explicitly, skip the write when unchanged,
and debounce so a held arrow key announces only the settled category.

### A11Y-10 — `outline: none` leaves programmatically restored focus with no indicator
**Low · Bug · WCAG 2.4.7 · [css/mochart.css:81-88](packages/mochart/css/mochart.css#L81)** — **Open**

`.mochart-chart.mochart-accessible :focus { outline: none }` strips the indicator from every
descendant and `:focus-visible` restores it — correct for keyboard-driven focus, but the library
also moves focus programmatically from **pointer**-driven paths
([TooltipContent.ts:311](packages/mochart/src/components/TooltipContent.ts#L311), reached by
clicking a row that filters with `hideFiltered`; `SeriesContainer.sync`/`PieSeriesContainer.sync`,
reached by a legend *click*). After a mouse interaction `:focus-visible` does not match, so focus
lands somewhere with no ring and the next Tab starts from an invisible position. (The ring itself
is otherwise sound: `currentColor` survives the dark theme, and forced-colors forces `outline-color`.)

**Fix:** scope the reset to the elements the library actually re-styles, or add
`:focus-visible`-independent styling on the three elements it focuses programmatically.

### A11Y-11 — no forced-colors / Windows High Contrast handling
**Low · Missing feature · [css/mochart.css](packages/mochart/css/mochart.css)** — **Open**

There is no `@media (forced-colors: active)` block anywhere in the repo. Chart chrome is
`currentColor` and follows the forced text colour, but series fills/strokes are SVG presentation
attributes from the palette — so the chrome flips to the forced palette while the series keep their
original hues, or collapse, with nothing in the code deciding which. The tooltip's `color-mix`
hover tints become invisible.

**Fix:** add a `@media (forced-colors: active)` block restoring the tooltip control affordances
(`forced-color-adjust`, `border-color: ButtonBorder`, a `Highlight` focus ring) and document what
series colours do in that mode.

### A11Y-12 — series and tooltip roving groups lack the group semantics the legend has
**Low · Inconsistency · [SeriesContainer.ts:145](packages/mochart/src/components/SeriesContainer.ts#L145), [PieSeriesContainer.ts:164](packages/mochart/src/components/PieSeriesContainer.ts#L164), [TooltipContent.ts:570](packages/mochart/src/components/TooltipContent.ts#L570) vs [Legend.ts:183](packages/mochart/src/components/Legend.ts#L183)** — **Open**

The legend's roving container gets `role="group"` + `aria-label` from `accessibility.legendLabel`;
the identical containers for cartesian series, pie slices and tooltip rows get only a class and key
handlers, and there is no config key to name them. Tab into a pie's slices and the AT announces
"Sales, 42%, button" with no enclosing group; the legend one Tab later announces "Legend, group".

**Fix:** add `role="group"` + `aria-label` to the three containers and matching config keys
(`seriesLabel`, `tooltipLabel`) to the accessibility defaults/validation/docs.

---

# 8. Framework bindings, export and editor

The prop and callback surface itself is **symmetric across all five bindings** — config,
data/dataProvider, class, style, `dataTestId`, `loading`/`error`, all four controlled focus/filter
props, all ten callbacks, the six placeholder slots, chart-instance access, `refresh()`,
auto-resize, dispose-on-unmount, SSR guards, and `@mochart/core` as peer + dev (never a regular
dep). Every asymmetry below is in typing, placeholder lifecycle, or docs.

### BIND-1 — Vue's `refresh()` is unreachable from the component's public type
**High · Bug · [mochart-vue/src/Chart.ts:23](packages/mochart-vue/src/Chart.ts#L23), [DefaultChart.ts:24](packages/mochart-vue/src/DefaultChart.ts#L24)** — **Fixed**

`setup()` calls `expose({ refresh })`, but Vue's `SetupContext.expose` does not feed the
component's instance type. Compiling against the built `dist`:

```
t.ts(7,12): error TS2339: Property 'refresh' does not exist on type
'CreateComponentPublicInstanceWithMixins<...>'
```

The only documented way to call `refresh()` (a template ref) does not typecheck in a TS host.
React (`forwardRef<ChartRef,…>`), Svelte (`Component<Props, {refresh:()=>void}, "">`), Lit
(`chartRef` callback) and Angular (public method) all type it correctly — Vue is the only binding
where the escape hatch needs an `as any`.

**Fix:** cast the exports so the exposed surface lands in the instance type —
`export default Chart as typeof Chart & { new (...args: any[]): ChartRef }` — in both files, and
add a `tsc`/`expect-type` assertion so it cannot regress.

**Fixed automatically.** Applied as recommended in both `Chart.ts` and `DefaultChart.ts`, using
`never[]` rather than `any[]` for the constructor args so the package's strict lint stays clean —
the parameter type is never read, only the return. The regression guard is a test typed the way a
TS host actually writes it, `ref<InstanceType<typeof DefaultChart> | null>(null)`, which is the
form that had no `refresh` at all; the existing test used an explicit `ref<ChartRef | null>`, so
it could never have caught this. `npm run typecheck` fails on the unpatched source. Vue tests
pass (11), typecheck, build and lint clean.

### BIND-2 — the generated reference publishes a private helper as the type of all ten Angular outputs
**High · Bug (docs generator) · [bindingReferenceModel.ts:299-302](packages/mochart-docs/scripts/bindingReferenceModel.ts#L299)** — **Fixed**

Angular outputs carry no type annotation, so the generator falls back to the initializer text.
The initializers are `this.chartOutput<T>()`
([base-chart.ts:67](packages/mochart-angular/src/base-chart.ts#L67)), so the model stores
`this.chartOutput<ChartEventPayload>` and prints it verbatim. All ten `angular.callback` entries
in `generated/binding-reference.json`:

```
chartClick   | this.chartOutput<ChartEventPayload>
titleClick   | this.chartOutput<void>
focusChange  | this.chartOutput<ChartFocus>
```

`chartOutput` is `private`. `/reference/framework-props#angular.callback` — the canonical prop
reference — therefore names a non-existent public type in every Angular callback row. The entries
are also emitted `"optional": false`, wrong for outputs.

**Fix:** when `kindHint === 'callback'` and the initializer is a call expression, emit
`EventEmitter<` + the call's type arguments + `>`, and force `optional: true`. Alternatively
annotate the outputs in `base-chart.ts`, which makes `declaredType` non-`unknown` and needs no
generator change.

**Fixed automatically.** Took the generator fix rather than annotating `base-chart.ts`: the
generator's fallback is wrong for *any* factory-initialized output, so fixing it there stops the
next binding from reintroducing the same bug, and it keeps `base-chart.ts` free of type
annotations that only exist to feed a docs script. A new `outputTypeFromInitializer` maps both
`this.chartOutput<T>()` and `new EventEmitter<T>()` to `EventEmitter<T>`, and outputs are forced
`optional: true` — subscribing to an `@Output` is opt-in by definition. All ten Angular callback
rows now read `EventEmitter<ChartEventPayload>` and friends. Note the `optional` correction is
model-only: `renderBindingPage` prints Prop / Type / Core prop / Description and never renders it,
so only the `type` change is visible on `/reference/framework-props`. Docs suite passes (37
examples, 230 exports, 17 sections, 152 props across 5 bindings), typecheck and lint clean.

### BIND-3 — every published package resolves to raw source under the `development` condition
**Medium · Bug (packaging) · [mochart-react/package.json:33](packages/mochart-react/package.json#L33) and the six siblings** **[verified]** — **Open**

Each `exports["."]` lists `"development": "./src/index.ts"` **first**, and `files` ships `src`, so
untranspiled source is in the published tarball and wins whenever the `development` condition is
active. Confirmed against the installed Vite:

```
vite 8.1.5 | defaultClientConditions = ["module","browser","development|production"]
```

So any downstream app on `vite dev` resolves `@mochart/svelte` to `src/index.ts` → `./Chart.svelte`,
and `@mochart/angular` to decorator-bearing `src/*.ts` from `node_modules` — pipelines that
normally exclude `node_modules` from Svelte/Angular compilation. The condition exists for this
monorepo's tsx scripts, not for consumers. `@mochart/core` has the same shape.

**Fix:** keep `development` locally but strip it from what ships, via `publishConfig.exports`
(npm ≥ 9 replaces top-level fields at publish time) listing only `types` then `default` (plus
`svelte` for `@mochart/svelte`). If it must stay, put `types` first and document it in each README.

### BIND-4 — Angular placeholders keep stale inputs when core omits a context key
**Medium · Bug · [mochart-angular/src/placeholders.ts:56-60](packages/mochart-angular/src/placeholders.ts#L56)** — **Open**

`renderSlot` iterates `Object.keys(context)` and calls `setInput` only for keys present, so a key
dropped by a later call retains its previous value. Core calls one slot with different key sets —
[Chart.ts:1034](packages/mochart/src/components/Chart.ts#L1034) `loadingFactory({width, height})`
vs [:1311](packages/mochart/src/components/Chart.ts#L1311) with five keys — so going from the
second state to the first leaves a stale `hasData`/`mochartConfig`/`dataProvider`. React, Vue, Lit
and Svelte all reset (Svelte explicitly deletes absent keys).

**Fix:** before applying, `setInput(key, undefined)` for every name in `slot.inputNames` that is a
`PlaceholderProps` key and absent from `context`.

### BIND-5 — placeholder instances leak when the placeholder prop is removed (Vue, Svelte, Lit, Angular)
**Medium · Bug · [vue/placeholders.ts:61](packages/mochart-vue/src/placeholders.ts#L61), [lit:57](packages/mochart-lit/src/placeholders.ts#L57), [svelte:77](packages/mochart-svelte/src/placeholders.svelte.ts#L77), [angular:86](packages/mochart-angular/src/placeholders.ts#L86)** — **Open**

`transform()` deletes the prop key and installs a factory only when the component is truthy. There
is no `else` branch, so a slot whose prop was removed keeps its mounted instance alive in a
detached container until the whole chart is destroyed — with its timers, watchers and
subscriptions still running. React handles this correctly at
[react/placeholders.ts:90](packages/mochart-react/src/placeholders.ts#L90).

**Fix:** add the missing branch to the other four — Vue `render(null, slot.container)`, Svelte
`slot.destroy()`, Lit `render(nothing, slot.container)`, Angular `slot.ref?.destroy()` — and drop
the slot from the map.

### BIND-6 — the React guide claims placeholder-context parity that only Svelte has
**Medium · Doc inconsistency · [guide/frameworks/react.md:128](packages/mochart-docs/guide/frameworks/react.md#L128)** — **Open**

"Placeholder components render through portals … so they inherit the app's context providers …
**as in the other bindings**." Portals are React-only. Vue passes `vnode.appContext` — **app-level**
`provide()` only; a value provided by an ancestor *component* is not injectable. Angular passes
`this.environmentInjector` — environment providers only, not the element injector. Only Svelte
matches (`getAllContexts()`). A Vue or Angular user following this sentence writes a placeholder
that `inject()`s a component-provided value and gets `undefined`.

**Fix:** replace the parity clause with the per-binding truth, and mirror it in the Vue and Angular
guide pages.

### BIND-7 — exports lose web fonts, and nothing says so
**Medium · Doc gap · [export/index.ts:20-22](packages/mochart-export/src/index.ts#L20), [export README](packages/mochart-export/README.md#L5)** — **Open**

`inlineComputedStyles` inlines `font-family`/`font-size`/`font-weight`/`font-style` as *names*. No
`@font-face` rule or font data is embedded. Core sets no `fontFamily` default, so chart text
inherits the page's font — commonly a web font. `exportPNG` rasterizes through
`img.src = 'data:image/svg+xml,…'`, and an SVG loaded as an image cannot fetch external resources,
so the PNG silently falls back to a system font; a downloaded SVG opened outside the page does the
same. The README promises the serialized svg "renders the same outside the page's stylesheets",
untrue for typography.

**Fix:** document the limitation, and offer a `fontFaceCss?: string` (or `embedFonts`) option that
injects a `<style>` with base64 `@font-face` rules into the clone before serialization.

### BIND-8 — `@mochart/editor`'s config model is a build-time snapshot of a peer-ranged core
**Medium · Inconsistency · [editor/mochartSupport.ts:3-5](packages/mochart-editor/src/mochartSupport.ts#L3), [package.json:31](packages/mochart-editor/package.json#L31)** — **Open**

Diagnostics come from the **live** peer core, but completions and hover come from
`mochartConfigModel.generated.ts`, baked in at build time. The peer range is `^1.0.0`. Inside the
monorepo it cannot drift (gitignored, regenerated by `prebuild`/`test`/`typecheck`/`dev`), but a
consumer on `@mochart/editor@1.0.0` with `@mochart/core@1.1.0` gets a section that validates
cleanly while `sectionForPath` returns `null` and completions silently stop inside it — no
diagnostic, no hover. (Unknown/newer `version` values are handled acceptably.)

**Fix:** narrow the peer range to `~1.0.0`, or stamp the generating core version into the model and
warn once at `createMochartConfigSupport()` when `getVersionString()` disagrees.

### BIND-9 — both Vue `refresh()` examples throw `ref is not defined`
**Low · Doc gap · [mochart-vue/README.md:105](packages/mochart-vue/README.md#L105), [guide/frameworks/vue.md:116](packages/mochart-docs/guide/frameworks/vue.md#L116)** — **Open**

The `<script setup>` snippets use `const chart = ref(null);` with no `import { ref } from 'vue'`.
`ref` is not auto-imported in a plain Vue project, so copy-pasting the only documented `refresh()`
example throws at runtime. `vue.md:98` has the same gap.

**Fix:** add the import to both snippets.

### BIND-10 — `dataTestId` is documented in every guide page and no README
**Low · Doc gap · all five binding READMEs** — **Open**

All five bindings expose `dataTestId`; it appears in all five
`guide/frameworks/*.md` pages and the generated framework-props reference, and in **zero** package
READMEs — which are the npm package pages and otherwise enumerate the prop surface exhaustively.
The Angular README also drops the guide's "Explicit `width`/`height` inputs win over conflicting
`style` values" line.

**Fix:** add the one-sentence paragraph from each guide to the matching README.

### BIND-11 — `@mochart/angular` pins its peer to Angular 22 despite building partial-Ivy
**Low · Inconsistency · [mochart-angular/package.json:43](packages/mochart-angular/package.json#L43)** — **Open**

`"@angular/core": "^22.0.0"` while `tsconfig.build.json` sets `"compilationMode": "partial"` — the
mode whose whole purpose is forward compatibility via the linker. The day Angular 23 ships, every
consumer gets a peer conflict for a build that would have worked. It is also by far the tightest
peer range in the set (React `>=18`, Vue `^3.3.0`, Svelte `^5.0.0`, lit-html `^3.0.0`).

**Fix:** widen to `">=22.0.0"`.

### BIND-12 — assorted example and type-export nits
**Low · Doc gap** — **Open**

(a) The React and Angular quick-starts use TS fences with an unannotated `const config = {…}`;
`categoryAxis.type`/`scale` and `seriesDefaults.renderer` are literal unions that widen to `string`,
so the snippet does not compile as shown — the docs' own example modules annotate.
(b) The Svelte data-mutation snippets are tagged ```` ```svelte ```` but contain bare JS.
(c) Lit's directives throw `'mochart-lit chart directives can only be used in child position'`
([directives.ts:26](packages/mochart-lit/src/directives.ts#L26)); neither the README nor `lit.md`
mentions the constraint.
(d) `@mochart/svelte` is the only binding with no `ChartRef` interface, so it cannot be used as a
shared prop type in a Svelte host.

**Fix:** annotate `config: MochartInputConfig` in the two quick-starts; retag the Svelte fences;
document Lit's child-position requirement; export a `ChartRef` alias from `@mochart/svelte`.

---

# 9. Documentation

Coverage checks that came back clean, so the gaps below are the whole set: 223 `/reference/…`
anchors resolve against the generated models, every internal guide/recipe link and heading anchor
resolves, no orphan pages (all 38 are in the sidebar), every relative link in all 21 READMEs plus
CONTRIBUTING resolves, all 37 CI-validated `examples/*.ts` pass `validateConfig`/`getDataErrors`,
the quickstart works end to end, and there are no vocabulary violations anywhere.

### DOC-1 — `series.valueLabel` is documented as "use null for none"; `null` is the default and yields the title
**High · Doc inconsistency · [docs/seriesConfig.ts:87](packages/mochart/src/config/docs/seriesConfig.ts#L87) → [types/config.ts:2515](packages/mochart/src/types/config.ts#L2515) → the generated reference page and [recipes/tooltip-formatting.md:26](packages/mochart-docs/recipes/tooltip-formatting.md#L26)** — **Fixed**

The description reads "the label to show before a series value in the tooltip (use null for none)"
with `@default null` directly beneath it. `getSeriesLabel`
([SeriesTitle.ts:11](packages/mochart/src/utils/SeriesTitle.ts#L11)) does
`valueLabel !== NONE ? valueLabel : useTitleForValueLabel ? getSeriesTitle(…) : noLabel` — so
`null` means "fall back to the title". `null` never produces "none". The self-contradiction is
visible on a single page.

**Fix:** change the description to "…; null falls back to `useTitleForValueLabel`", regenerate
(`generate-docs` + `generate-jsdoc`), and change the recipe to "set `valueLabel` to override it, or
`useTitleForValueLabel: false` for no label". Note `categoryAxis.valueLabel` genuinely *does* mean
"null = none" — only the series one is wrong.

**Fixed automatically.** Applied as recommended, regenerated through both `generate-jsdoc` and
`generate-docs` so the `.d.ts`, the reference page and the recipe all agree.
`categoryAxis.valueLabel` is left alone — it really does mean "null = none".

### DOC-2 — `color-by-value.md` says `min`/`max` are "ignored" with a `base.value`; they are a validation error
**High · Doc inconsistency · [recipes/color-by-value.md:63](packages/mochart-docs/recipes/color-by-value.md#L63) vs [validation/seriesConfig.ts:144](packages/mochart/src/config/validation/seriesConfig.ts#L144)** — **Fixed**

The doc says "With `base.value` set, `min`/`max` are ignored". The validator attaches
`validators.equal(NONE)` to both under that condition:

```
series[0] - colorScale.min - should be equal to null when colorProperty is not null
  and colorScale.base.value is not null: "#cde2fb"
```

A reader adding a diverging base to an existing single-ramp series naturally leaves `min`/`max` in
place; the chart renders its config-error state.

**Fix:** "With `base.value` set, `min`/`max` must be `null` (their conditional default) — the four
`base` colors take over. Leaving them set is a validation error."

**Fixed automatically.** Applied as recommended, with one addition: the recipe now names the
migration case its old wording invited — a single-ramp series gaining a diverging base has to drop
`min`/`max`, which is exactly when a reader would have trusted "ignored".

### DOC-3 — the "null is a real value" rule is illustrated with a style state, where `null` is rejected
**High · Doc inconsistency · [guide/config-model.md:105-107](packages/mochart-docs/guide/config-model.md#L105)** **[verified]** — **Fixed**

The bullet reads "**`null` is a real value, not a hole.** `{ strokeColor: null }` overrides a
non-null default and leaves the SVG attribute unset so CSS can supply it" — true for a plain
`Style`, false for the three-state styles the section's own worked example uses. Probed:

```
OK    plot.backgroundStyle.strokeColor = null
FAIL  series[].shapeStyle.normal.strokeColor = null    → should be a valid svg color…: null
FAIL  series[].shapeStyle.normal.strokeOpacity = null  → should be a number >= 0 and <= 1: null
OK    series[].shapeStyle.normal.strokeWidth = null
```

[types/config.ts:63-70](packages/mochart/src/types/config.ts#L63) states the rule explicitly: a
style state "always writes its color and opacity attributes … which is why the colors and
opacities are never null".

**Fix:** scope the bullet — `null` is accepted on plain styles and, inside
`normal`/`focused`/`defocused`, only on `strokeWidth`/`strokeDashArray`; colours and opacities must
be concrete (use `'none'` to switch a half off).

**Fixed automatically.** Applied as recommended: the bullet keeps the plain-style rule and gains
a second paragraph scoping it inside a style state, with the reason (a state always writes its
colour and opacity attributes) and the `'none'` alternative.

### DOC-4 — `theming.md` names the colour-scale bounds `colorMin`/`colorMax`
**Medium · Doc inconsistency · [guide/theming.md:98](packages/mochart-docs/guide/theming.md#L98)** — **Open**

"The one place it is rejected is the series color-scale bounds (`colorMin` / `colorMax` and
friends)". The config properties are `colorScale.min`, `colorScale.max`, and
`colorScale.base.{aboveMin,aboveMax,belowMin,belowMax}`. `colorMin`/`colorMax` exist only as
`CreateHeatmapOptions` fields — a different API. Every other page uses the `colorScale.*` names.
A reader greps their config for `colorMin`, finds nothing, and concludes it doesn't apply.

**Fix:** rename to `` `colorScale.min` / `colorScale.max` and the `colorScale.base` colors ``. The
same stale names sit in the code comment at
[validation/validators.ts:16](packages/mochart/src/config/validation/validators.ts#L16).

### DOC-5 — "Bar fills default to half opacity" — the default is `0.8`
**Medium · Doc inconsistency · [recipes/color-by-value.md:35](packages/mochart-docs/recipes/color-by-value.md#L35) and [examples/colorByValue.ts:18](packages/mochart-docs/examples/colorByValue.ts#L18)** — **Open**

Both `shapeStyle.normal.fillOpacity` and `strokeOpacity` default to `0.8` for `bar` (0.9 line/none,
0.8 area). Nothing defaults to 0.5. It is the stated justification for the example overriding both
to `1`, and a reader computing expected colours from "half opacity" gets the wrong answer. The
duplicate wording in the example file is why the CI example check can't catch it — the check
validates configs, not comments.

**Fix:** "Bar fills and strokes default to `0.8` opacity…" in both places.

### DOC-6 — the object-sections list in the config guide is missing `accessibility` and `pie`
**Medium · Doc gap · [guide/config-model.md:31](packages/mochart-docs/guide/config-model.md#L31)** — **Open**

The guide enumerates 9 of the 11 object sections the enhancer emits. The authoritative set
(verified by `checkSectionCoverage.ts`) also contains `accessibility` and `pie`. The list-sections
bullet immediately below *is* complete, so the object list reads as exhaustive too — and both
omitted sections are first-class with dedicated pages.

**Fix:** add both to the bullet.

### DOC-7 — pie keyboard activation is described as "a click at the slice's center"
**Medium · Doc inconsistency · [guide/accessibility.md:81](packages/mochart-docs/guide/accessibility.md#L81) vs [PieSeries.ts:116](packages/mochart/src/components/PieSeries.ts#L116)** — **Open**

Enter/Space calls `this.state.onSeriesClick()` directly. The code comment explicitly *rejects*
positional synthesis: "a synthesized click's coordinates can land outside the chart rect on an
exploded edge slice and get swallowed there". `ChartSliceClickPayload` carries only `seriesId` —
there are no coordinates to place at a centre. The neighbouring cartesian sentence *is* precise, so
a reader reasonably reads this one as equally precise and looks for coordinates that never arrive.

**Fix:** "…Enter/Space performing the same slice click a pointer click does (focus toggle plus
`onSliceClick`), with no synthesized pointer position."

### DOC-8 — contributor docs omit the generated API/props/framework-props pipeline and its CI ratchets
**Medium · Doc gap · [CONTRIBUTING.md:26-81](CONTRIBUTING.md#L26), [:140](CONTRIBUTING.md#L140); [mochart-docs/README.md:6](packages/mochart-docs/README.md#L6)** — **Open**

A second generator pipeline exists alongside the config one: `apiReferenceModel.ts` reads the prop
interfaces in `types/chart.ts` into `generated/api-reference.json`, and `generateBindings.ts` reads
the five bindings' `types.ts` into `binding-reference.json`. Both fail hard —
`apiReferenceModel.ts:215` errors with "`X` is exported from types/chart.ts but has no reference
page group", `:238` with "`X.y` has no JSDoc description" — and `checkApiCoverage.ts` fails when
any export is unmentioned in a docs page. None of it appears in CONTRIBUTING; the guardrail table
lists 6 rows and omits API coverage and section coverage; `docs/documentation-plan.md:111` still
calls the API reference "handwritten"; and the docs README describes `npm test -w @mochart/docs`
as only "validate the example configs" when it runs three checks.

Adding a chart prop, a callback payload field, or a binding prop breaks the docs build with an
error whose remedy is documented nowhere — while the config side has a careful end-to-end checklist.

**Fix:** add an "Adding a chart prop or payload" section mirroring the config checklist; add
API-coverage and section-coverage rows to the guardrail table; widen the docs README.

### DOC-9 — `documentation-plan.md` describes the pre-delivery state in the present tense
**Medium · Doc inconsistency · [docs/documentation-plan.md:3](docs/documentation-plan.md#L3) vs [:27-47](docs/documentation-plan.md#L27)** — **Open**

Line 3 says "Status: delivered (August 2026) — every non-optional item is checked off" (true).
Lines 27-47 then assert, unqualified: "**No docs site.**", "**The config reference is a dead
end.**", "**No IDE hover docs.**", "**No task-oriented guides.**", "**No API reference**" — each
directly contradicted by a checked item further down the same file. Separately, `:108-110` records
"strict validation requires `version` — every README quick start was broken", while `version` is
now optional and the quick starts deliberately omit it. This is the named plan of record; anyone
opening it reads five flat statements that the work does not exist.

**Fix:** retitle "Where we are today" → "Where we were (pre-plan snapshot, July 2026)" and put the
gaps in the past tense; note that `version` later became optional; add the delivered-but-unlisted
API/props/framework-props generator work as a Phase 2 bullet.

### DOC-10 — the movalid README's validator and chain lists are each missing one member
**Low · Doc gap · [movalid/README.md:48](packages/movalid/README.md#L48), [:64](packages/movalid/README.md#L64)** — **Open**

Enumerated against the real export: the "Objects" bullet omits `partialObjectWithShape` — the one
`@mochart/core` actually uses for nested config objects — and the chainable-extension list omits
`withCustomName`, the 8th method on every validator, also used throughout core. Both lists
otherwise match the implementation exactly (45/45 validators present) and read as complete
inventories, so the two missing members are precisely the ones a reader meets first.

**Fix:** add both.

### DOC-11 — `date-axis.md` says an area fills to "the value axis base", which is unset by default
**Low · Doc inconsistency · [recipes/date-axis.md:26](packages/mochart-docs/recipes/date-axis.md#L26)** — **Open**

`valueAxes.base` defaults to `null` for an unstacked axis — which the date-axis example is — and
`SeriesPositions` then falls back to `valueAxisScale.range()[0]`, the axis's lower edge. On an axis
whose minimum is negative the two differ visibly: the reader expects the fill to stop at 0 and it
reaches the bottom of the plot.

**Fix:** "The `area` renderer fills down to the axis base when one is set (`valueAxes.base`), and
otherwise to the bottom of the axis."

### DOC-12 — two small factual slips in the recipes
**Low · Doc inconsistency · [recipes/bar-caps.md:32](packages/mochart-docs/recipes/bar-caps.md#L32); [candlestick.md:36](packages/mochart-docs/recipes/candlestick.md#L36), [ohlc.md:40](packages/mochart-docs/recipes/ohlc.md#L40), [waterfall.md:31](packages/mochart-docs/recipes/waterfall.md#L31)** — **Open**

(a) "The **Capped Bars** demo in the gallery" — the demo is titled `"Capped"`.
(b) "The default direction colors are **aqua**/red" — the up/increase colour is `#1baf7a`
(hue ≈ 158°), a green-teal. The sentence's own point is "rather than the conventional green/red",
which the actual colour undercuts. The source comments say "Aqua" too, so the docs faithfully
mirror a naming choice made in code.

**Fix:** use "Capped"; and either re-describe the colour ("teal-green/red, chosen to stay
distinguishable under red-green colour blindness") in the three recipes plus the two source
comments, or shift the hue toward the name.

*(Also in this section: [API-5](#api-5--the-core-readme-omits-all-seven-chart-shape-helpers-and-the-pie-chart-type),
[API-9](#api-9--state-factory-context-members-arrive-inconsistently-the-readme-implies-otherwise),
[CONFIG-9](#config-9--validateconfigs-strict-parameter-is-undocumented),
[BIND-10](#bind-10--datatestid-is-documented-in-every-guide-page-and-no-readme).)*

### DOC-13 — filtering every series does not activate the documented no-series state
**Medium · Doc gap · [chart-states.md:60](packages/mochart-docs/guide/chart-states.md#L60) vs [Chart.ts:1234](packages/mochart/src/components/Chart.ts#L1234)** **[from SOL review]** — **Open**

`chart-states.md` tells readers that turning every series off through the legend produces the
no-series placeholder. The runtime gate is `mochartConfig.series.length === 0` and nothing else:
legend filtering sets `filteredSeriesFlags` and re-derives the data, but leaves the configured
series list intact — so filtering everything yields an empty plot with axes still drawn and no
message at all.

Neither state is exercised by a test — see
[TEST-3](#test-3--the-no-data-and-no-series-chart-states-are-never-rendered) — so nothing holds the
guide and the gate together.

**Fix:** decide which one is true. Either extend the gate to "no series *visible*" — the count
returned by `getSeriesContainerFilteredSeriesCounts`
([DATA-6](#data-6--getseriescontainerfilteredseriescounts-counts-unfiltered-series)) is already
computed and is exactly this number — or drop the claim from the guide. Add the all-filtered case
to the empty-states test TEST-3 proposes.

---

# 10. Demo applications

Six galleries are meant to be feature-equivalent ports. Parity is **good** — every mode, tab,
showcase, editor control, unused-property filter, export/share menu, dark-mode toggle, pie panel,
chart-type generator, random generator and mobile overflow menu is present in all six, all six are
built by CI and deployed, no demo reaches past core's public API, `demos.json` has no missing files
or orphans, all `demoText` keys are consumed, and menu dismissal/disclosure ARIA/focus-return is
complete and consistent. The divergences below are the whole set.

### DEMO-1 — `build:pages` never rebuilds `@mochart/editor`, so the site can ship a stale editor
**High · Bug · [scripts/build-pages.mjs:24](scripts/build-pages.mjs#L24)** **[verified]** — **Fixed**

`libDirs` lists eight packages; `mochart-editor` is missing, yet it uses the same
`development`→`src` / `default`→`dist` export conditions and is a dependency of all six galleries.
A demo/docs build resolves the editor through `default` → `dist/index.js`, so editing only
`packages/mochart-editor/src` and running `build:pages` silently bundles the *previous* editor
build into all six deployed JSON tabs. CI hides it because `npm ci` runs `prepare` → `build:libs`,
so this bites only locally and only intermittently — the worst failure mode.

**Fix:** add `'mochart-editor'` to `libDirs`.

**Fixed automatically.** One-line addition, as recommended.

### DEMO-2 — applying a structurally invalid config produces a blank chart with no message
**High · Bug · [vanilla ConfigTab.ts:122](packages/mochart-demo-vanilla/src/components/single/ConfigTab.ts#L122) and the five ports** — **Fixed**

`applyConfig()` calls `parseConfig(getConfigText())`, which only checks JSON *syntax*. Downstream,
`getConfigDataError` returns `false` for an invalid config and `EditableChart` sets
`dataProvider = null` when the config is invalid with no data error. Apply a config with a numeric
`series[0].property` and the chart pane goes empty, every control in the strip is disabled, and no
error text appears anywhere — the only signal is a `console.warn`. The Defaults/Invert/Slow buttons
*do* reject the same config with `demoText.errors.invalidChartConfig`, so Apply is the one path
that fails silently.

**Fix:** build and validate before calling `onConfigChange` (reuse the `toggleConfigFromText`
validity branch) and set `errorMessage` when invalid; apply in all six ports.

**Fixed automatically.** Rather than repeat the validity branch six times, the branch was
*extracted*: `toggleConfigFromText`'s parse-and-build head is now `parseConfigFromText(text)`
returning `{ config, error }`, `toggleConfigFromText` calls it, and all six `applyConfig`
implementations do too — so Apply and the toggles cannot drift apart again, which is how they
diverged in the first place. Each port already had an `errorMessage` slot wired to its footer, so
the fix is three lines per port. `parseConfig` is no longer exported from `@mochart/demo-common`
(nothing outside it used it once Apply switched over). Typecheck across 20 workspaces, lint,
deadcode and demo-common's 243 tests all pass, and demo-vanilla builds.

### DEMO-3 — showing the 2nd chart duplicates 22 DOM ids
**High · Bug · [vanilla EditableChart.ts:682](packages/mochart-demo-vanilla/src/components/single/EditableChart.ts#L682) and ~15 more sites, all six ports** — **Open**

`ChartTab` mounts one `EditableChart` per chart, and every instance renders the full control strip
with fixed ids (`edit-mode`, `edit-reset-categories`, `edit-apply-series`, `edit-play-slices`, …).
Only `showChartCountControls` and `showShareButton` are per-instance. With the "2nd Chart" toggle
on, ~22 ids exist twice — invalid HTML; `getElementById`/`#id` selectors and any `aria-controls`
resolve to the first chart only, and AT sees two identically-identified control sets.

**Fix:** suffix ids per chart instance (thread the index into an `idPrefix`, as `ExportShareMenu`
already does), or drop the ids where nothing consumes them.

### DEMO-4 — all six deployed galleries ship `<html>` with no `lang`
**High · Bug · WCAG 3.1.1 (Level A) · [vanilla index.html:2](packages/mochart-demo-vanilla/index.html#L2) and the five siblings** **[verified]** — **Fixed**

Confirmed across all seven demo packages: the six *deployed* galleries emit a bare `<html>`, while
the non-deployed `demo-basic` harness and `mochart-benchmark` both use `<html lang="en">` and the
docs root emits `<html lang="en-US" dir="ltr">`. Screen readers fall back to the user's default
voice, mispronouncing the entire UI — on the accessibility showcase for a charting library that
ships an `accessibility` config section.

**Fix:** `<html lang="en">` in all six.

**Fixed automatically.** All six now match `demo-basic` and `mochart-benchmark`.

### DEMO-5 — vanilla: the "2nd Chart" button never appears or disappears on resize
**High · Bug · [vanilla ChartTab.ts:118](packages/mochart-demo-vanilla/src/components/single/ChartTab.ts#L118)** — **Open**

`showChartCountControls` is computed only inside the *creation* loop; the update loop omits it,
`EditableChartUpdate` has no such field, and the component captures it as a `const`. Open a demo
below ~962px and widen: the toggle stays hidden and the feature is unreachable until reload. Open
wide and narrow: the toggle stays visible on a viewport that cannot fit two charts. The five
framework ports recompute it every render.

**Fix:** add `showChartCountControls` to `EditableChartUpdate`, pass it from the update loop, and
make the button's presence part of `sync()`.

### DEMO-6 — Config tab's Invert/Slow state and Reference links go stale after any edit
**Medium · Bug · [vanilla ConfigTab.ts:280](packages/mochart-demo-vanilla/src/components/single/ConfigTab.ts#L280), [:186](packages/mochart-demo-vanilla/src/components/single/ConfigTab.ts#L186), all six ports** — **Open**

The Invert/Slow pressed states and `getReferenceSectionIds(...)` both read `demoConfig`, refreshed
only by `setConfig` or a successful `applyConfigToggle` — never by `onTextChange` and never by
Apply. `DemoSingle` keeps the ConfigTab's `config` prop unchanged on Apply, so the prop-driven
refresh never fires either. Type `"plot": { "inverted": true }` and press Apply: the chart inverts
but the Invert button stays un-pressed with the wrong icon, and adding a `legend`/`tooltip` section
never adds its Reference link.

**Fix:** rebuild `demoConfig` from the current text in the change handler (or at minimum on Apply),
reusing `toggleConfigFromText`'s parse-and-build path with a no-op transform.

### DEMO-7 — vanilla leaks a theme subscription and the whole gallery DOM on every visit
**Medium · Bug · [vanilla ModeSwitcher.ts:154](packages/mochart-demo-vanilla/src/components/misc/ModeSwitcher.ts#L154)** — **Open**

`themeToggleButton()` returns `themeToggle().el` and discards the `theme.onChange` unsubscribe. Its
only caller is the gallery header, and `mountApp`'s `clearView()` has no `gallery` branch while
`showGallery()` mints a fresh gallery on every visit. Every demo → gallery round trip adds one live
listener on the module-level theme controller, and each listener's closure retains the detached
button and, through it, the discarded gallery DOM. The five framework galleries mount an
unsubscribing component instead.

**Fix:** give `galleryPage` a `destroy()` that calls the theme toggle handle's `destroy`, and add a
`gallery` branch to `clearView()`.

### DEMO-8 — vanilla `chartHost` can mount a chart after it has been destroyed
**Medium · Bug · [vanilla chartHost.ts:56](packages/mochart-demo-vanilla/src/components/misc/chartHost.ts#L56)** — **Open**

The mount is deferred with `queueMicrotask(() => { chart = create(...) })` and `destroy()` only
destroys `chart` if already set. A destroy in the same tick leaves `chart === null`, then the
microtask creates a chart nobody holds a handle to — keeping its listeners and animation state
alive for the page's lifetime. The binding this file explicitly mirrors guards exactly this case
([lit directives.ts:88](packages/mochart-lit/src/directives.ts#L88)).

**Fix:** track a `destroyed` flag (or cancel the queued mount) and bail inside the microtask.

### DEMO-9 — tab strips carry no tab semantics, and Multi renders a dead tab button
**Medium · Bug (a11y) · [vanilla DemoSingle.ts:115](packages/mochart-demo-vanilla/src/components/single/DemoSingle.ts#L115), [DemoMulti.ts:37](packages/mochart-demo-vanilla/src/components/multi/DemoMulti.ts#L37), all six ports** — **Open**

The Chart/Config/Data strip is `<ul><li><button class="demo-tab active">` with no
`role="tablist"`/`role="tab"`, no `aria-selected`, no `aria-controls`, no `aria-current` —
selection is conveyed by the `.active` class alone. In Multi mode the single "Chart" button has no
click handler at all. The pending-changes badge is `aria-hidden="true"` with the explanation only
in a `title`, so that signal is inaudible too.

**Fix:** add `role="tablist"`/`role="tab"` + `aria-selected` + `aria-controls` and `role="tabpanel"`
on the container; render Multi's single tab as non-interactive; expose the pending state via
`aria-describedby` or visually-hidden text.

### DEMO-10 — 115 `role="toolbar"` containers, none with an accessible name
**Medium · Bug (a11y) · [vanilla ModeSwitcher.ts:30](packages/mochart-demo-vanilla/src/components/misc/ModeSwitcher.ts#L30) and 114 more sites** — **Open**

Every control strip declares `role="toolbar"` and none is labelled. The mode switcher's visible
`Mode:` label is never wired via `aria-labelledby`, and `demo.css` `display:none`s it at ≤900px.
Two or three unnamed toolbars are on screen at once in every mode. Related: the current mode is
marked with `aria-current` only on phones, so at desktop widths the active segment announces as
"dimmed" with no "current" state.

**Fix:** give each toolbar an `aria-label` from a new `demoText` entry, and set
`aria-current="page"` on the current mode at all widths.

### DEMO-11 — route error copy is hardcoded in all six demos, and React's is unstyled
**Medium · Bug · 18 sites across the six demos** — **Open**

`"No route found matching …"`, `"No demo found for id: …"` and `"Bad random id: …"` are literal
strings in all six — the only user-facing copy in the whole demo suite not sourced from `demoText`.
React's not-found is additionally a bare `<div>` without `mochart-demo-message` /
`demo-alert demo-alert-error` and without `role="alert"`, unlike the other five and unlike React's
own two sibling messages.

**Fix:** add a `demoText.routeErrors` group and consume it in all six; give React's `RouteNotFound`
the same markup as its siblings.

### DEMO-12 — framework-agnostic helpers are duplicated verbatim in all six demos
**Medium · Inconsistency · [vanilla RandomContent.ts:72](packages/mochart-demo-vanilla/src/components/random/RandomContent.ts#L72) and ~10 more** — **Open**

Pure, framework-free logic exists once per demo instead of once in `@mochart/demo-common`:
`getData` (~20 lines × 6), `getSeriesValuesText` (~25 lines, byte-identical × 6),
`getDebugSiteRootUrl` (× 6), `clampGrid` (× 6 — while the sibling clamps for `interval`/`step`
already live centrally in `shareState.ts`), plus `modeIcons`, `copiedFeedbackMs = 1500`, the
notes/nav/export `MenuPlacement` literals, the clipboard-copy + `window.prompt` fallback +
revert-timer routine, the `canFold` rule, the `onPanelClick` handler, and `minWidth = 400` for the
rotation grid (with three ports carrying a 3-line re-export shim). The notes placement literal even
hardcodes `340` to match `.demo-menu-notes` in `demo.css` — one stylesheet-coupled number stored
six times.

**Fix:** move each into `packages/mochart-demo-common/src` and import it.

### DEMO-13 — "Link copied" is never announced
**Medium · Bug (a11y) · [react ExportShareMenu.tsx:109](packages/mochart-demo-react/src/components/misc/ExportShareMenu.tsx#L109) and the five ports** — **Open**

The Share item swaps its visible label to `demoText.shareButton.tooltipCopied`, but the button's
`aria-label` is pinned to `demoText.shareButton.aria` ("Copy Share Link"). An `aria-label` overrides
the visible text, and there is no `role="status"`/`aria-live` region — so the only confirmation
that the link reached the clipboard is invisible to screen-reader users, in all six demos.

**Fix:** drop the static `aria-label` (the visible text is a sufficient name) or swap it with the
label, and wrap the swap in `role="status"`.

### DEMO-14 — core has no inverse of `applyDefaults`, so the demos re-implement it
**Medium · Missing feature · [demo-common/mochartDemoConfig.ts:94](packages/mochart-demo-common/src/mochartDemoConfig.ts#L94)** — **Open**

`withoutDefaults` (~45 lines) plus a hand-rolled deep-equal and `removeSectionDefaults` reconstruct
"config minus its defaults" from `sectionKeyAllMap` and `getDefaults`. Core exports `applyDefaults`
but nothing that undoes it. The same file documents a second core sharp edge: `buildMochartConfig`
writes back-references into the section objects it is handed, so the caller must build a *second*
defaults graph or `configWithDefaults` becomes circular and non-serializable. The Defaults toggle
is a first-class feature of every demo and of `@mochart/editor`; any consumer building a config
editor has to rediscover both the algorithm and the mutation footgun.

**Fix:** export `withoutDefaults(config, defaults)` (and ideally a non-mutating
`buildMochartConfig`) from `@mochart/core`, and have `buildMochartDemoConfig` call it.

### DEMO-15 — `@mochart/demo-common`'s README documents 10 of its 23 modules
**Medium · Doc gap · [demo-common/README.md:23](packages/mochart-demo-common/README.md#L23)** — **Open**

Undocumented: `demoText`, `theme`, `viewport`, `menu`, `gallery`, `shareState`, `pieDemo`,
`sparklines`, `chartTypeGenerators`, `docsLinks`, `errorDataProvider`, `jsonEditorContent` — plus
the `./demo.css` / `./chart-dark.css` exports and the `generate-demos` script. `demoText.ts` is the
home of the project's "all demo copy lives here" rule, and the README meant to teach that rule does
not mention it.

**Fix:** extend the table to every module in `src/`, plus rows for the CSS exports and the script.

### DEMO-16 — docs claim the test demos are "intentionally invalid"; they are not
**Low · Doc gap · [demo-data/README.md:28](packages/mochart-demo-data/README.md#L28)** — **Open**

The 21 `testDemos` entries are ordinary valid configs, and the gallery describes them correctly as
"Feature-coverage demos exercising less common config options". The stale claim also drives a
weaker e2e assertion at [demos.spec.ts:17](packages/mochart-demo-basic/e2e/demos.spec.ts#L17),
where test demos are only mounted and never checked for a rendered series. `README.md:44`'s
`{ id, title, config, data, random }` also omits `description`, `notes` and `generator`.

**Fix:** correct the wording, complete the `Demo` shape example, and tighten `demos.spec.ts`.

### DEMO-17 — the series editor cannot show or edit error-bar values
**Low · Missing feature · [vanilla EditableChart.ts:565](packages/mochart-demo-vanilla/src/components/single/EditableChart.ts#L565), all six ports** — **Open**

`getSeriesValuesText`/`applySeriesChanges` handle `property`, `rangeProperty`, `markerProperty`,
`labelProperty` and `colorProperty` only. `errorLowProperty`/`errorHighProperty` are absent, though
the shipped `error-bars` demo uses them on all three series — so on that demo the whiskers cannot
be inspected or edited from Single mode, and the demo cannot demonstrate the feature it exists for.
`collectUsedDataProperties` already handles both keys, so the omission is isolated to the editor.

**Fix:** add `el`/`eh` entries for both keys in both functions (ideally after extracting them to
demo-common per DEMO-12).

### DEMO-18 — ~100 markup sites carry class names no stylesheet or script uses
**Low · Inconsistency · [vanilla ChartsControls.ts:120](packages/mochart-demo-vanilla/src/components/multi/ChartsControls.ts#L120)** — **Open**

`demo-form-row` (54 sites), `mochart-menu-item-label` (24), `button-with-tooltip` (6),
`demo-menu-up` (6), `mochart-demo-notes-item` (6) and `mochart-demo-notes-trigger` (6) appear in the
six demos' markup but in no `.css` file in the repo and are queried in no JS. `demo.css:783` shows
the form-row layout actually hangs off `form .demo-field`. Bootstrap-era leftovers that read as
styling hooks — the next person restyling a control strip will target `.demo-form-row` and see
nothing happen.

**Fix:** delete them from the markup, or add the rules they imply.

### DEMO-19 — Lit's `ExportShareMenu` defaults `idPrefix` to `'edit'`
**Low · Bug · [lit export-share-menu.ts:33](packages/mochart-demo-lit/src/components/misc/export-share-menu.ts#L33)** — **Open**

Every other port makes it required (Angular uses `@Input({ required: true })`). A Lit caller that
omits it silently mints a second `#edit-export-share` in the document instead of failing. All three
current call sites pass it, so this is latent.

**Fix:** drop the default and make it required.

### DEMO-20 — port-level divergences with no behavioural difference today
**Low · Inconsistency** — **Open**

Several same-named symbols mean different things per port: Vue's `sliceControlsDisabled` omits the
`error` term the other five fold in (and re-adds `error ||` at each of its five call sites);
Angular's `ngOnChanges` bails on *any* first-change input, not just the initial batch; Lit's
`isLastCategory` reads an un-error-guarded category count; vanilla's `chartHost` measures with
`getBoundingClientRect()` where the binding it mirrors deliberately uses `offsetWidth/offsetHeight`
to survive CSS transforms; Angular's `TopBar` requires callers to pass `hasTabs` and guard the
site-root link where the other five derive both; React lacks `ChartsControls`/`RandomContent` as
components; vanilla's `OverflowMenu` exposes unused `className`/`iconName` props; Vue and Angular's
`DocsLinks` emit `&nbsp;` and a `<span>`-wrapped separator where the other four emit plain text.

These are the seams where the next shared change will land in five ports and be quietly wrong in
the sixth.

**Fix:** align each on the majority form; where the divergence is deliberate (Angular's `hasTabs`),
encapsulate it so callers cannot get it wrong.

### DEMO-21 — Playwright's dev server takes the port `vite.config` reserves for preview
**Low · Inconsistency · [demo-basic/playwright.config.ts:17](packages/mochart-demo-basic/playwright.config.ts#L17) vs [vite.config.ts:5](packages/mochart-demo-basic/vite.config.ts#L5)** — **Open**

`command: 'npm run dev -- --port 4173 --strictPort'` while `vite.config.ts` assigns
`server: 5173` / `preview: 4173`, with a comment saying each gallery pins its own port so they can
run side by side. `npm run preview -w @mochart/demo-basic` and `npm run test:e2e` cannot run at the
same time, and `--strictPort` turns the clash into a hard failure.

**Fix:** run the e2e suite against `npm run preview` (which already owns 4173) — which also fixes
[TEST-9](#test-9--nothing-tests-the-published-build-every-test-and-the-e2e-suite-run-against-src) —
or move the dev server to 5173 and point `baseURL` there.

### DEMO-22 — deployed demos request a favicon that does not exist
**Low · Bug · [vanilla index.html:3](packages/mochart-demo-vanilla/index.html#L3) and the five siblings** — **Open**

None of the six gallery `index.html` files declares `<link rel="icon">`, so the browser falls back
to `/favicon.ico` at the *site* root. `demo-basic` and `mochart-benchmark` both set `href="data:,"`
to suppress exactly this. A 404 on every demo page load, and the browser's default icon rather than
the docs site's.

**Fix:** add the docs site's favicon link (or `href="data:,"`) to all six.

---

# 11. Tests and coverage

Measured this session — `@mochart/core`: 91 files, 1348 tests, 103.6 s, **97.2% statements /
90.59% branches / 97.7% functions / 97.2% lines**, thresholds met. No `.only`/`.skip`/`.todo`
anywhere, no test with zero assertions, and **no test-only escape hatch in any `src/`** (grepped
`NODE_ENV`, `process.env`, `import.meta.env`, `__TEST__`, `vitest` across core, export and editor —
zero hits).

Least-covered core files by branches: `LinearGradient.ts`/`RadialGradient.ts` 50%,
`AxisThreshold.ts` 69.6%, `Background.ts` 71.4%, `ChartAnimationData.ts`/`AxisContainer.ts`/
`PieCenter.ts`/`SeriesColorGradient.ts`/`ChartLayout.ts` 75%, `Crosshair.ts` 76.7%,
`TitleLayout.ts` 78.8%, `ChartAnimation.ts` 79.2%. By statements: `config/migration/mochartConfig.ts`
**71.4%**, `SeriesColorIcon.ts` 84.6%, `FocusAnimation.ts` 85.5%. Lowest function coverage:
`Chart.ts` **64/74**.

### TEST-1 — PNG export success paths have never been executed
**High · Test gap · [export/index.ts:336](packages/mochart-export/src/index.ts#L336), [:355](packages/mochart-export/src/index.ts#L355), [:388](packages/mochart-export/src/index.ts#L388)** — **Open**

`exportPNG` and `exportChartsPNG` are tested only for their *failure* paths. Coverage confirms the
`.then(blob => { saveBlob(...); return true; })` callbacks never run, and **`getStitchedSize` is
never called at all** — the regex that reads `width=`/`height=` off the stitched svg to size the
canvas. This is the exact function B1 broke: multi-chart PNG export shipped permanently
non-functional and no test noticed. Today a typo in that regex would rasterize every stitched
export at 1×1 and every test would still pass. The e2e suite covers single-chart PNG only.

**Fix:** in `export.test.ts`, reuse the existing `FakeImage` stub, stub
`HTMLCanvasElement.prototype.toBlob`, spy on `HTMLAnchorElement.prototype.click`, and assert
`await exportChartsPNG([a, b], {cols: 2})` is `true`, the anchor's `download` ends `.png`, and
`canvas.width === Math.round(stitchedWidth * 2)` — that last assertion is what pins
`getStitchedSize`. Add the single-chart equivalent.

### TEST-2 — no binding test asserts that any interaction callback reaches the chart
**High · Test gap · all five binding test files** — **Open**

Grepping the five for `onFocus|onChartClick|onSeriesClick|onSliceClick|onSeriesFilter|onTitleClick|
onSeriesLayoutBoundsChange` returns **0 hits in all five**. Angular has one indirect case that fires
`chartClick`; the other **nine** entries of its emitter→core-name table are unverified, as is Vue's
`callbackProp` map. These maps are pure string-to-string plumbing across five packages: a typo
(`'onTitleClicked'`) or a dropped row compiles, typechecks, lints, and ships — the callback simply
never fires for that framework. [base-chart.ts:130](packages/mochart-angular/src/base-chart.ts#L130)
notes that core behaviour (clickable-title styling) *switches on callback presence*, so a dropped
row also changes rendering.

**Fix:** one table-driven test per binding — mount with a `vi.fn()` for each of the ten props,
dispatch the triggering DOM event, assert each spy was called. For Angular/Vue, iterate the
emitter/event names so a new row cannot be added without a case.

### TEST-3 — the "No Data" and "No Series" chart states are never rendered
**High · Test gap · [Chart.ts:162](packages/mochart/src/components/Chart.ts#L162), [:1234](packages/mochart/src/components/Chart.ts#L1234), [:1281](packages/mochart/src/components/Chart.ts#L1281)** — **Open**

Coverage shows `getNoDataComponent`, `getNoSeriesComponent`, the whole `series.length === 0` overlay
block and the `categoryCount === 0` branch all uncovered. **Five of the six `ChartFactories` props
have zero references in the entire core suite** — only `getErrorComponent` appears, once. No test
ever mounts a chart with an empty row set or with `series: []`. These are documented, publicly
overridable states with their own CSS classes and their own props on all five bindings; the overlay
geometry positions itself from `seriesLayoutInfo`, so a layout regression puts the message outside
the plot with nothing failing.

**Fix:** new `test/components/EmptyStates.test.ts` — (a) zero-row provider, assert
`.mochart-no-data` text and that its inline `left`/`top` match the series layout bounds;
(b) `series: []`, assert `.mochart-no-series`; (c) for each of the six factory props, mount with a
factory returning a marker node and assert it replaces the default.

### TEST-4 — `migrateConfig` never runs its only behaviour
**Medium · Test gap · [migration/mochartConfig.ts:7-10](packages/mochart/src/config/migration/mochartConfig.ts#L7)** — **Open**

71.4% statements — the lowest of any real file in core — and the uncovered line is the
version-omitted normalization. Both existing tests pass a config that *has* a `version`, so the one
thing the function currently does is never executed. `migrateConfig` is a public export and the
documented front door for stored configs; if the normalization broke, a version-less config would
flow into future migration steps as `version: undefined` and every migration would misfire.

**Fix:** `expect(migrateConfig({foo: 1})).toEqual({foo: 1, version: CONFIG_VERSION})`, plus a
does-not-mutate case and a `migrateConfig(null)` non-throw case.

### TEST-5 — the title link and `onTitleClick` are entirely untested
**Medium · Test gap · [Title.ts:55](packages/mochart/src/components/Title.ts#L55), [:159](packages/mochart/src/components/Title.ts#L159), [Chart.ts:973](packages/mochart/src/components/Chart.ts#L973)** — **Open**

`Title.chartTitleClick`'s body, the `<a>` wrapper for `titleConfig.link`, and `Chart.onTitleClick`
are all uncovered; `onTitleClick` has **0** references in the core tests and `linkDisabled` is never
set anywhere. `title.link` renders a real `<a href>` inside the svg and `linkDisabled` suppresses
navigation — a regression silently turns a linked title into plain text, or lets a `linkDisabled`
title navigate away from the host page. (This is also the untested surface behind
[A11Y-2](#a11y-2--ontitleclick-is-a-mouse-only-control).)

**Fix:** in `ChartInteraction.test.ts` add link/`linkDisabled` assertions (`href` present;
`defaultPrevented` true/false) and an `onTitleClick` spy test.

### TEST-6 — the golden oracle renders every chart with zero-width text
**Medium · Weak test · [golden.test.ts:70](packages/mochart/test/golden/golden.test.ts#L70), [svgShims.ts:9](packages/mochart/test/components/svgShims.ts#L9)** — **Open**

The oracle compares normalized `innerHTML` against 421 checked-in `.html` files, so it does catch
structure, attributes and text exactly. But every golden runs with `getComputedTextLength` → `0`
and `getBBox` → `0×0`, which drives `getBounds` into `defaultBounds = {width: 20, height: 20}` for
*every* text element and leaves `chartTextBoundsData.hasDefault` permanently `true`. Concrete
proof: `truncated-text-config.json` — the demo built to exercise truncation, setting four
truncation flags — produces **zero ellipses** in its golden. The only `…` characters in all 421
goldens are inside the hidden measurement sizer. Only two files in the whole suite install
proportional metrics.

Title truncation, axis-title truncation, legend-item truncation and every layout decision
downstream of a measured width could break completely and the entire golden suite would stay
green — and the demo named after the feature would still "pass".

**Fix:** add `test/components/TextTruncationLayout.test.ts` using the `PX_PER_CHAR` shim already in
[TickLabelTruncation.test.ts:41](packages/mochart/test/components/TickLabelTruncation.test.ts#L41),
mounting `truncated-text-config.json` and asserting the title, category-axis title and a legend item
each end in `…` and are shorter than the source. Alternatively add a second `truncated-text` golden
stage rendered under proportional metrics.

### TEST-7 — group- and stack-wide focus propagation is uncovered
**Medium · Test gap · [FocusData.ts:197-209](packages/mochart/src/data/FocusData.ts#L197)** — **Open**

When the focused series belongs to a `seriesGroup` or `seriesStack`, `getFocusData` marks every
sibling as focused. Lines 199-201 (group) and 205-207 (stack) never execute — no test focuses a
grouped or stacked series, even though the `grouped` and `stacked` demos exist (goldens never set
focus). This is the visible behaviour of hovering one bar of a stack; if it regressed, only the
single segment would highlight and no golden or unit test would see it. It sits next to the
`followSeries` propagation that B15 showed is easy to get wrong.

**Fix:** in `FocusData.test.ts`, build two stacks of two series, focus one member, and assert
`seriesFocusPercentages` is at the focused level for both stack-mates and defocused for the other stack.

### TEST-8 — 72 of 349 documented config properties are never set in any test or demo
**Medium · Test gap** — **Open**

Cross-referencing every leaf property in `types/config.ts` against all of `packages/mochart/test/**`
*and* every JSON in `packages/mochart-demo-data/src` leaves 72 properties that are only ever their
default. Behavioural ones: `legend.position` (both branches in
[ChartLayout.ts:49-59](packages/mochart/src/layout/ChartLayout.ts#L49) are uncovered — **a legend at
the top has never been laid out**), `showBaseLine`, `missingValueMarkers`, `adjustSizeForFiltering`,
`maxTickCount`, `minTickSpacing`, `outerCapExpand`, `borderRadius`, `animateBaseFromAdjacent`,
`centerOffsetXFraction`, the six `*Front` z-order switches, the `focusTickMark*` group,
`showIconColors`/`showIconPlaceholders`/`showIconShapes`, and the accessibility localization strings
`chartLabel`, `chartRoleDescription`, `plotLabel`, `legendLabel`. The icon consequence is visible in
coverage: `SeriesColorIcon.ts:138-168` never runs, so a legend swatch for a gradient-filled series
is never rendered.

`apiReference.test.ts` guarantees every one of these is *documented*, so the docs promise behaviour
nothing verifies. The a11y strings are the sharpest case: their entire purpose is to be overridden
for localization, and no test proves an override is honoured.

**Fix:** two targeted files rather than 72 assertions — `test/layout/LegendPosition.test.ts`
(`legend: {position: 'top'}`, assert the legend group's `y` is above the plot, plus the
title-bottom + legend-top combination) and an addition to `ChartAria.test.ts` asserting all four
a11y overrides appear. Treat the rest as a backlog; the enumeration is reproducible from `types/config.ts`.

### TEST-9 — nothing tests the published build; every test and the e2e suite run against `src`
**Medium · Tooling gap · [demo-basic/playwright.config.ts:18](packages/mochart-demo-basic/playwright.config.ts#L18)** — **Open**

Playwright's `webServer` starts the Vite **dev** server, which resolves the `development` condition
→ `packages/*/src`. All vitest suites likewise import source. The only thing that ever touches
`dist/mochart.js` is `build:pages`, and that only proves the bundle *builds*, never that it *works*.
Anything that differs between source and the library build — the ES2020 downlevel target,
minification/name-mangling, the d3/movalid inlining, `import.meta` handling — is entirely untested.
A broken published bundle passes CI.

**Fix:** add a `CI`-only Playwright project whose `webServer` is `npm run build && npm run preview`
(which also resolves [DEMO-21](#demo-21--playwrights-dev-server-takes-the-port-viteconfig-reserves-for-preview)).

### TEST-10 — pie percentages in the screen-reader announcement are never produced
**Medium · Test gap · [TooltipFormat.ts:209-214](packages/mochart/src/utils/TooltipFormat.ts#L209)** — **Open**

In `getTooltipAnnouncement`, the whole `chart.type === 'pie' && pieLabelTypeUsesPercent(...)` block
is uncovered. The *visual* pie tooltip is tested and `getPieTooltipPercentFormat` is unit-tested in
isolation, but the two are never joined in the live-region path. Sighted users would see correct
percentages while the announcement fell back to raw values or `0%`, and the `adjustForFiltering`
renormalization could diverge from what is spoken — a silent accessibility regression.

**Fix:** in `ChartAria.test.ts`, mount a pie with `pie: {tooltipValues: 'valuePercent'}`, open the
tooltip, assert the live region's text contains the expected `%`, then filter a slice via a legend
click and assert the announced percentages renormalize as `PieRender.test.ts` already asserts for
the visible rows.

### TEST-11 — coverage is measured and gated in one of the nine published packages
**Low · Test gap · [mochart/vitest.config.ts:14](packages/mochart/vitest.config.ts#L14) is the only `coverage` block** — **Open**

Measured for the packages with no coverage config at all: `@mochart/export` 30 tests, **88.08%
stmts / 77.77% branches / 80.65% funcs**; `@mochart/editor` 25 tests, **85.84% stmts / 71.25%
branches**, with `src/support.ts` at **12.5% stmts / 0% branches / 0% funcs**. `movalid` (2,418 test
lines) and `demo-common` have no `vitest.config.*` at all. T5 recorded that thresholds were the
reason coverage had silently rotted in core; the same condition holds for eight other publishable
packages — including `@mochart/export`, where B1, B6 and B7 all shipped, now 10 points below core on
statements and 13 on branches with no floor.

**Fix:** add a `coverage` block with thresholds a whisker under today's numbers to `mochart-export`
(88/77/80/88) and `mochart-editor` (85/71/88/90), matching core's pattern. CI already runs
`npm test` across all workspaces, so no workflow change is needed.

### TEST-12 — B12's fix has no direct assertion, and the golden suite normalizes away the artifact
**Low · Weak test · [render/dom.ts:87](packages/mochart/src/render/dom.ts#L87); [render.test.ts:307](packages/mochart/test/render/render.test.ts#L307); [golden.test.ts:455](packages/mochart/test/golden/golden.test.ts#L455)** — **Open**

The `removeAttribute('style')` branch fires only when `!newValue`. The nearest test clears with
`{height: null}` — truthy — so it never reaches the branch and never asserts `hasAttribute('style')`.
Separately, `golden.test.ts:455` defines `stripEmptyStyles` to normalize ` style=""` out of *both*
sides of an equality assertion, with a comment saying "the goldens keep the artifact" — that comment
is now stale (zero of the 421 snapshots contain `style=""`), and the normalization would absorb a
partial B12 regression. B12 cost a 206-file, 1250-line golden regeneration; its protection today is
entirely indirect, and one assertion has been pre-neutralized against it.

**Fix:** extend the style test with `setProperty(div, 'style', {height: 5}, null, false);
expect(div.hasAttribute('style')).toBe(false);` and the string-form equivalent, then drop or
re-comment `stripEmptyStyles`.

### TEST-13 — mid-animation assertions that can silently not run
**Low · Weak test · [FollowerAnimation.test.ts:165-183](packages/mochart/test/components/FollowerAnimation.test.ts#L165)** — **Open**

Both wick-glue loops guard their assertion on a DOM query: the filtering loop `break`s the first
frame `barRects(container, 'up')` is empty, and the restore loop only asserts `if (… .length > 0)`.
Nothing records that the assertion ran. Every other loop-with-`expect` in the suite asserts a length
first — these two are the exception. The comment says these mid-animation frames are the whole point,
so a timing change could reduce the loop to zero assertions and keep only the settled-state check
that the bug never affected.

**Fix:** count the assertions and add `expect(checked).toBeGreaterThanOrEqual(2)` after each loop.

### TEST-14 — e2e covers one minimal harness; the shipped gallery, editor, share menu and mobile layout have none
**Low · Test gap · [demo-basic/e2e/](packages/mochart-demo-basic/e2e/) (5 files, 429 lines)** — **Open**

The suite runs against `demo-basic`, a single-chart harness. Not covered anywhere: the deployed
`@mochart/demo-vanilla` gallery (0 test files, no `test` script), the `@mochart/editor` JSON tabs in
situ, the ExportShare dropdown and its compressed `ShareState` URL round-trip, multi-chart mode and
stitched export, the mobile overflow menus, and dark-mode restyling. The config declares a single
`Desktop Chrome` project, so no viewport below desktop is ever rendered. The share-link
encode/decode and the phone-fold DOM reparenting are exactly the logic jsdom cannot reach.

**Fix:** add a Playwright project pinned to `devices['iPhone 13']` and a
`packages/mochart-demo-vanilla/e2e/` suite with `share.spec.ts` (copy the link, navigate to it,
assert the restored mode and config), `editor.spec.ts`, and `mobile.spec.ts` (at 390px, assert the
control strip collapses and each control appears exactly once in the DOM).

### TEST-15 — the claimed three-engine browser support is only ever tested in Chromium
**Medium · Test gap · [packages/mochart/README.md:252](packages/mochart/README.md#L252), [demo-basic/playwright.config.ts:13](packages/mochart-demo-basic/playwright.config.ts#L13), [ci.yml:33](.github/workflows/ci.yml#L33)** **[from SOL review]** — **Open**

The core README states a support policy covering Chrome/Edge, Firefox and Safari. The Playwright
config declares exactly one project, `Desktop Chrome`, and CI runs
`npx playwright install --with-deps chromium` — so two of the three named engines have never
executed a line of this library in CI. The exposure is not theoretical: SVG text measurement
(`getComputedTextLength`, and with it the whole truncation and tick-fitting path), focus and
keyboard behaviour on SVG elements, and `canvas.toBlob`/`XMLSerializer` in `@mochart/export` are
precisely where Gecko and WebKit diverge from Blink.

Distinct from [TEST-14](#test-14--e2e-covers-one-minimal-harness-the-shipped-gallery-editor-share-menu-and-mobile-layout-have-none),
which is about *what* the single Chromium project covers; this is about *which engines* run at all.

**Fix:** add `firefox` and `webkit` projects and install all three browsers in CI, scoped to a smoke
subset — one render, one tooltip/crosshair interaction, one keyboard traversal, one SVG export and
one PNG export. Failing that, narrow the README's stated support to what is actually verified.

---

# 12. Build, tooling, packaging and CI

### TOOL-1 — only `build:pages` guards against a stale library `dist`
**High · Bug · [scripts/build-pages.mjs:18-51](scripts/build-pages.mjs#L18), [package.json:31](package.json#L31)** — **Open**

`build-pages.mjs` carries a hand-rolled mtime staleness check that reruns `build:libs`, because (its
own comment) demo builds resolve the `default` condition → `dist`, "so a dist left over from before
a source edit silently ships stale code". **No other entry point has that guard**: root
`npm run build`, `npm run build -w @mochart/demo-*`, `npm run build -w @mochart/docs` and
`npm run preview` all resolve `default` → `dist`. The `prepare` → `build:libs` hook only fires on
`npm install`.

Verified live on this checkout: **6 of the 9 library `dist/`s are currently stale** relative to
their `src` — `movalid`, `mochart-export`, `mochart-react`, `mochart-vue`, `mochart-lit`,
`mochart-angular`, `mochart-editor`. Anyone running `npm run build` today ships library code from
before the last edit, with no warning. (See also [DEMO-1](#demo-1--buildpages-never-rebuilds-mochartaeditor-so-the-site-can-ship-a-stale-editor):
the one guard that exists omits the editor.)

**Fix:** extract the check into a shared `scripts/ensure-libs-fresh.mjs` run as a `prebuild` on the
root `build` and on each demo/docs package's `build`, or replace the mtime heuristic with real build
orchestration (turbo/nx/wireit) so `dist` freshness is a dependency-graph fact.

### TOOL-2 — no release pipeline, no CHANGELOG, and no version tooling for 9 public packages
**High · Missing feature · [.github/workflows/](.github/workflows/) (only `ci.yml`)** — **Open**

Nine packages carry `publishConfig: {access: "public"}` and `prepack` build hooks, all pinned at
`1.0.0` with cross-package `^1.0.0` ranges. There is no publish workflow, no
changesets/lerna/`npm version` tooling, no CHANGELOG at root or in any package, and no `npm pack`
verification in CI. Releasing means nine manual coordinated `npm publish` runs from a laptop, with
no gate that `dist` was rebuilt, no npm provenance, no record of what changed, and a real chance of
publishing `@mochart/react@1.0.1` against a `@mochart/core@1.0.1` that was never pushed.

**Fix:** add `.github/workflows/release.yml` (tag- or changesets-triggered) running the full CI gate
then `npm publish --workspaces --provenance`; adopt Changesets for coordinated bumps and generated
CHANGELOGs; add an `npm pack --dry-run` tarball-contents check so `files` regressions fail before a
release.

### TOOL-3 — no dependency audit anywhere, and 9 known vulnerabilities are present
**High · Tooling gap · [ci.yml:20-33](.github/workflows/ci.yml#L20); no `dependabot.yml`, no `renovate.json`** — **Open**

CI runs lint/deadcode/typecheck/test/e2e/build but never `npm audit`. `npm audit` reports **9
vulnerabilities (3 moderate, 6 high)** today: `react-router 7.12.0–7.18.1` (high, CSRF bypass —
a direct dependency of `@mochart/demo-react`, so it ships in the deployed Pages/Cloudflare site),
`undici 7.0.0–7.28.0` (high ×5), `postcss <=8.5.22` (moderate).

**Fix:** add `npm audit --audit-level=high` to the `build-test` job (or a scheduled job so a new
advisory doesn't block unrelated PRs), and add `.github/dependabot.yml` with a weekly grouped npm check.

### TOOL-4 — `npm run deadcode` filters out knip's dependency and duplicate-export checks
**Medium · Tooling gap · [package.json:41](package.json#L41) — `knip --include exports,types,files`** — **Open**

The filter discards `dependencies`, `unlisted`, `binaries`, `unresolved`, `duplicates`,
`classMembers` and `enumMembers`. CI runs the filtered command, so it is green while an unfiltered
`npx knip` reports 2 unused dependencies (`@codemirror/commands`, `@codemirror/search` in
`mochart-editor`) and 1 duplicate export
(`TOP_RIGHT_BOTTOM_LEFT|MARGIN_KEYS|PADDING_KEYS` in `config/core/constants.ts`). The current
dependency hits are benign, but nothing would catch a genuinely orphaned runtime dependency shipped
to consumers of a public package.

**Fix:** change the script to plain `knip` and fix or explicitly `ignoreDependencies` the current
hits; at minimum add `dependencies,unlisted,duplicates` to the include list.

### TOOL-5 — `@mochart/core` inlines its runtime dependencies but still declares them; nothing declares `sideEffects`
**Medium · Inconsistency · [mochart/vite.config.ts:3-5](packages/mochart/vite.config.ts#L3), [mochart/package.json:44](packages/mochart/package.json#L44)** **[verified]** — **Open**

The library build bundles everything: `dist/mochart.js` (500 KB) contains zero external `import`
statements, with d3 and movalid source inlined. Yet `package.json` lists 7 `d3-*` packages plus
`@mochart/movalid` as runtime `dependencies` — reachable only through the `development` condition,
a repo-internal convenience. Every `npm i @mochart/core` downloads 8 packages the default entry
never loads, and a consumer who also uses `d3-scale` ships two copies. Separately, **none of the 9
published packages declares `sideEffects`**, so no bundler can tree-shake the 500 KB bundle or drop
unused binding code.

**Fix:** either externalize `d3-*`/`@mochart/movalid` in `vite.config.ts` (keeping them real
dependencies) or move them to `devDependencies` and drop them from the published manifest. Add
`"sideEffects": ["*.css"]` (or `false` for the JS-only packages) to every published package.

### TOOL-6 — the documented IIFE build is shipped but unreachable through `exports`
**Medium · Bug · [mochart/package.json:34-40](packages/mochart/package.json#L34); documented at [getting-started.md:131](packages/mochart-docs/guide/getting-started.md#L131)** — **Open**

The docs state "an IIFE bundle for script tags, `dist/mochart.iife.js`, exposing the global
`mochart`". The file is built and included via `files`, but `exports` defines only `"."` and
`"./mochart.css"`:

```
ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './dist/mochart.iife.js' is not defined by "exports"
```

A documented published artifact cannot be reached by Node, by any bundler, or by an import map —
only by a raw CDN URL that bypasses `exports`. `packages/mochart/example/example.html` gets away with
it only because it uses a relative path inside the repo.

**Fix:** add `"./mochart.iife.js": "./dist/mochart.iife.js"` (and, if wanted,
`"./package.json": "./package.json"`) to the map.

### TOOL-7 — `lint` and `deadcode` gate every PR but are documented nowhere
**Medium · Doc gap · [CONTRIBUTING.md:12](CONTRIBUTING.md#L12), [:150](CONTRIBUTING.md#L150); [README.md:78](README.md#L78)** — **Open**

CI runs `lint`, `deadcode` and `typecheck` before anything else. CONTRIBUTING's Getting-started
block lists `npm test`, `npm run typecheck` and `npm run test:e2e` but not lint or deadcode; its
"CI guardrails, in one place" table — whose stated purpose is exactly that — lists six content
checks and omits all three. The root README's Scripts section likewise omits `lint`, `deadcode`,
`build:pages`, `test:e2e` and `screenshots`. A contributor following the documented workflow to the
letter pushes and gets a CI failure from a check no document mentioned.

**Fix:** add both to the quickstart, add Lint / Dead code / Typecheck rows to the guardrails table,
and sync the README Scripts block with `package.json`.

### TOOL-8 — no `engines` field on any package, and CI tests exactly one Node version
**Medium · Missing feature · all 21 `package.json` files; [ci.yml:12](.github/workflows/ci.yml#L12)** — **Open**

No package declares a supported Node range, there is no `.nvmrc`, and CI hardcodes a single Node 22
runner with no matrix (local development here is on Node 26.5.0). Consumers get no install-time
signal about the Node floor; contributors get no version pin; and a feature that works on Node 26
locally but not on the CI runner is only discovered by accident. The `@angular/*` 22 toolchain in
particular has a narrow supported range.

**Fix:** add `"engines": {"node": ">=20.19"}` (or the real floor) to the 9 published packages and
the root, add `.nvmrc`, and give `build-test` a `strategy.matrix.node-version: [22, 24]`.

### TOOL-9 — no SECURITY.md, issue/PR templates, `.editorconfig`, CODEOWNERS, or `bugs` field
**Medium · Missing feature · [.github/](.github/) contains only `workflows/`** — **Open**

Verified absent: `SECURITY.md`, `CODE_OF_CONDUCT.md`, `.editorconfig`, `.nvmrc`,
`.github/ISSUE_TEMPLATE/`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/CODEOWNERS`,
`.github/dependabot.yml`. None of the 9 published packages declares a `bugs` field, so npm renders
no "issues" link for any of them. The repo is being prepared to go public (the deploy jobs are gated
on that) — without a vulnerability-reporting channel, a security report arrives as a public issue.

**Fix:** add `SECURITY.md` with a private reporting address (and enable GitHub private vulnerability
reporting), a PR template mirroring the CONTRIBUTING checklist,
`"bugs": {"url": "https://github.com/jharris4/mochart/issues"}` to all 9 published manifests, and
`.editorconfig` matching the repo's 2-space style.

### TOOL-10 — `prebuild` writes into a tracked source file on every install
**Low · Inconsistency · [mochart/package.json:54](packages/mochart/package.json#L54) → [stampVersion.ts:18](packages/mochart/scripts/stampVersion.ts#L18); target [src/version.ts](packages/mochart/src/version.ts) is git-tracked** — **Open**

`stampVersion.ts` rewrites the tracked `src/version.ts` whenever it differs from `package.json`. It
runs as `prebuild`, which runs under `prepack` **and** under the root `prepare` → `build:libs`
chain — i.e. on every `npm install` and every CI `npm ci`. The moment `version` is bumped, a plain
`npm install` leaves the working tree dirty with a file the author did not edit. Nothing gates the
file's freshness the way `jsdocSync.test.ts` gates the generated JSDoc.

**Fix:** emit `version.ts` into the gitignored `generated/` directory, or add a `--check` mode plus
a test that fails when the tracked file is out of sync (mirroring the `jsdocSync` pattern).

### TOOL-11 — CI hygiene: duplicated site build, uncached browsers, discarded failure traces
**Low · Tooling gap · [ci.yml:26-42](.github/workflows/ci.yml#L26)** — **Open**

(1) `npm run build:pages` runs **twice** with different `PAGES_BASE` values — 2 VitePress builds
plus 12 demo Vite builds on every PR, even when neither deploy variable is set.
(2) `npx playwright install --with-deps chromium` downloads the browser on every run; `cache: npm`
covers only the npm cache.
(3) Playwright is configured with `retries: 2` and `trace: 'on-first-retry'` but no
`upload-artifact` step captures `test-results/` or `playwright-report/` — so the traces designed for
debugging a CI-only failure are discarded when the runner terminates.

**Fix:** gate the two `build:pages` invocations behind their `vars.ENABLE_*_DEPLOY` conditions;
cache `~/.cache/ms-playwright` keyed on the `@playwright/test` version; add an `if: failure()`
artifact upload.

### TOOL-12 — ESLint's type-aware rules are silently off for two workspaces and all `*.config.ts`
**Low · Tooling gap · [eslint.config.mjs:56-62](eslint.config.mjs#L56)** — **Open**

The type-aware block (`no-floating-promises`, `no-misused-promises`, `await-thenable`,
`unbound-method`) carries `ignores: ['**/*.config.ts', 'packages/mochart-docs/**',
'packages/mochart-demo-common/scripts/**']` because those files "belong to no tsconfig". The
config's own header calls `no-floating-promises` "the highest-value rule in the config", and it is
disabled across the entire docs package — which contains the `checkExamples`/`checkApiCoverage`/
`checkSectionCoverage` async scripts that gate the docs build. A dropped `await` there fails open.

**Fix:** give `packages/mochart-docs` and `packages/mochart-demo-common/scripts` a tsconfig that
includes their scripts (widening `include` may be enough) so `projectService: true` can type them,
then remove them from the ignore list.

### TOOL-13 — minor manifest and config drift
**Low · Inconsistency** — **Open**

- `svelte-check` is `^4.7.3` in `mochart-demo-svelte` but `^4.1.4` in `mochart-svelte`; `vue` is
  `^3.5.40` in `mochart-vue`/`mochart-demo-vue` but `^3.5.13` in `mochart-docs`. Both floating
  ranges mean the packages can resolve to different installed versions after a lockfile refresh.
- `mochart-editor` is the only workspace with no `lint` script; the other 19 all have one.
- [eslint.config.mjs:1](eslint.config.mjs#L1) and `:46` both say "19 workspaces"; there are 20.
- `MARGIN_KEYS` and `PADDING_KEYS` in
  [constants.ts:13](packages/mochart/src/config/core/constants.ts#L13) are both bare aliases of
  `TOP_RIGHT_BOTTOM_LEFT` (knip's duplicate-export hit).

**Fix:** align the two ranges (or adopt `syncpack`/npm `overrides` for shared tool versions), add a
`lint` script to the editor, correct the workspace count, and either collapse the three aliases or
add the intentional pair to `knip.json`'s ignores with a comment.

---

# 13. movalid

### VAL-1 — `color()` rejects most valid CSS/SVG colours
**High** — see [CONFIG-1](#config-1--validatorscolor-rejects-most-valid-csssvg-colours), which is
the same defect seen from the mochart side. Fix belongs here, in
[validators.ts:130-179](packages/movalid/src/validators.ts#L130). — **Open**, needs an answer

CONFIG-1 is fixed in mochart, so no mochart config is affected any more. movalid's own `color()`
is unchanged.

> **QUESTION (needs an answer):** movalid has **zero dependencies** today, which looks
> deliberate, and the recommended fix (delegate to `d3-color`) would end that. **Which do you
> want:** (a) **[recommended]** leave `color()` as-is and rename it to say what it does
> (`hexOrRgbColor`), since mochart — its only in-repo consumer — no longer uses it; (b) add
> `d3-color` as a movalid dependency and delegate; or (c) hand-roll a wider CSS-color predicate
> in movalid, keeping it dependency-free at the cost of ~150 lines of named-color table plus
> function-syntax regexes.
>
> *Recommendation: (a).* movalid is a general-purpose validation library whose value is being
> dependency-free; a validator named for the formats it actually accepts is honest, and the
> "what can I interpolate?" question that motivated the widening is a d3 question, so it belongs
> in the package that already depends on d3.

### VAL-2 — `conditional()` returns a validator missing three methods its own type declares
**Medium · Bug · [validators.ts:763](packages/movalid/src/validators.ts#L763) vs the `Validator` interface at [:33](packages/movalid/src/validators.ts#L33)** — **Open**

`Validator` declares `orEqual`, `orOneOf` and `or` as **required** members, but `conditional()`
calls `addExtensions` with `extensions = false`, so none is attached:

```
conditional has orEqual? undefined     → 'c.orEqual is not a function'
```

`validators.conditional(rules, obj).orEqual(undefined)` typechecks cleanly and then throws at
runtime. The gap is noted only in a source comment, not in the README and not in the type — the type
system is actively lying about the API.

**Fix:** split the return type — a named `ConditionalValidator = Omit<Validator, 'orEqual' |
'orOneOf' | 'or'>` — so the compiler rejects the call, or attach the three extensions.

### VAL-3 — the `numeric` family accepts single-element arrays
**Medium · Bug · [validators.ts:123](packages/movalid/src/validators.ts#L123)** **[verified]** — **Open**

`v => !isNaN(parseFloat(v)) && isFinite(v)` uses the *global* `isFinite`, which coerces:

```
numeric([5])       → true      integer()([5])  → false
numericMin(0)([5]) → true      numeric({})     → false
```

`parseFloat([5])` → `5` and `isFinite([5])` → `true`, so an array passes. `integer` uses
`typeValidators.number` and correctly rejects the same input, so sibling families disagree. In
core's config validation this is a JSON-shaped input hole: a user who writes `[5]` where a numeric
scalar is expected gets no error, and the value flows into `>=`/`<=` comparisons that also coerce.

**Fix:** gate on the scalar type first —
`v => (typeof v === 'string' || typeof v === 'number') && Number.isFinite(Number(v))`.

### VAL-4 — `regexp()` is stateful when handed a global-flagged regex
**Medium · Bug · [validators.ts:259](packages/movalid/src/validators.ts#L259)** **[verified]** — **Open**

`(regex: RegExp) => v => regex.test(v)` closes over the caller's `RegExp`. With a `/g` (or `/y`)
flag, `test` advances `lastIndex`, so the same validator alternates results on identical input:

```
regexp(/a/g) repeated: true false true
```

Core's own two uses are flagless, so this is latent — but a public validator that returns a
different answer each call for identical input is essentially undebuggable from the outside.

**Fix:** reset `regex.lastIndex = 0` before each test, or clone without the stateful flags at
construction: `new RegExp(regex.source, regex.flags.replace(/[gy]/g, ''))`.

### VAL-5 — `instanceOf`'s error message inlines the entire class source
**Medium · Bug · [validators.ts:211](packages/movalid/src/validators.ts#L211)** **[verified]** — **Open**

`message: (type) => "should be an instanceof " + type` string-coerces the constructor:

```
"should be an instanceof class MyThing{static{__name(this,\"MyThing\")}greet(){return\"hi\"}}"
"should be an instanceof function Date() { [native code] }"
```

The package's headline claim is "human-readable error messages"; here the whole (possibly minified)
class body ends up in a user-facing string.

**Fix:** `"should be an instanceof " + (type.name || 'the given class')`.

### VAL-6 — `equal()` renders functions and symbols as "undefined"
**Low · Bug · [validators.ts:94](packages/movalid/src/validators.ts#L94)** — **Open**

`printAny` falls through to `JSON.stringify`, which returns `undefined` for functions and
drops symbols: `equal(fn).errorMessage` → `"should be equal to undefined"`. Misleading rather than
merely terse.

**Fix:** add a `typeof value === 'function' || typeof value === 'symbol'` branch returning
`String(value)` (or the function's `name`).

*(README gaps: see [DOC-10](#doc-10--the-movalid-readmes-validator-and-chain-lists-are-each-missing-one-member).)*

---

## Suggested order of attack

1. **[ANIM-1](#anim-1--an-infinity-phase-duration-wedges-the-chart-in-a-permanent-raf-loop)** — the
   only finding that hangs the page. Ships with the `min < max` validation gap.
2. **[DATA-1](#data-1--null-in-the-data-collapses-the-value-axis-to-a-single-point)** +
   **[DATA-2](#data-2--one-non-finite-value-wipes-out-the-later-series-in-a-stack)** — one fix at
   the `getSeriesValuesForProperty` read boundary covers both, and `null` in data is the single most
   likely thing a real consumer hits.
3. **[CONFIG-1](#config-1--validatorscolor-rejects-most-valid-csssvg-colours)** — `red` failing
   validation is the most visible correctness gap in the public config surface.
4. **[COMP-1](#comp-1--pointer-enterleave-toggles-the-tooltip-instead-of-openingclosing-it)** +
   **[COMP-2](#comp-2--onserieslayoutboundschange-fires-from-inside-derive-before-props-commit)** —
   both are wrong-by-construction rather than edge cases.
5. **[CONFIG-2](#config-2--valueaxisdefaults-is-silently-ignored-when-no-valueaxes-entry-is-declared)**
   + **[CONFIG-3](#config-3--ignore-true-entries-are-still-cross-reference-validated)** — two silent
   config no-ops with in-repo workarounds already written around them.
6. **[TOOL-1](#tool-1--only-buildpages-guards-against-a-stale-library-dist)** +
   **[DEMO-1](#demo-1--buildpages-never-rebuilds-mochartaeditor-so-the-site-can-ship-a-stale-editor)**
   — 6 of 9 `dist/`s are stale right now; every other finding is harder to trust while that is true.
7. The three chart-helper input-contract holes
   ([HELP-1](#help-1--volume-pane-fractions-at-their-documented-range-ends-emit-an-invalid-config)–[HELP-3](#help-3--computecandlesticks-accepts-nan-and-missing-ohlc-fields-silently)),
   which are all the same missing-guard pattern.
8. **[A11Y-1](#a11y-1--a-linked-title-stays-focusable-inside-an-aria-hidden-decorative-chart)** +
   **[A11Y-2](#a11y-2--ontitleclick-is-a-mouse-only-control)** +
   **[DEMO-4](#demo-4--all-six-deployed-galleries-ship-html-with-no-lang)** — three Level-A failures,
   all small fixes.
9. Everything else, by section.
