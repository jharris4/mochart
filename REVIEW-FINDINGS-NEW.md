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

**170 findings: 1 critical, 34 high, 74 medium, 61 low.** (145 from the Opus pass,
5 from the SOL pass, 20 found while implementing.)

**Status: 148 fixed, 22 open** (8 medium, 12 low, and 2 high).
Six of the open findings are blocked on a decision rather than on work — **COMP-8**, **BIND-3**, **TOOL-2**,
**VAL-1**, **API-13** and **DEMO-23** — and each has its question, options and a recommendation written up in
`REVIEW-QUESTIONS.md`. The other 16 are unstarted work.

BIND-3 is the one finding deliberately left open with work committed against it: its safe half — `types`
before `development` in nine export maps, plus README documentation — has landed, while the consumer exposure
it names is documented rather than removed, because removing it is the decision in the questions file.

ANIM-1's and ANIM-2's follow-ups are both **implemented** — see their entries for what landed and where the
build revised each design. TOOL-2 is additionally recorded as deferred to release time by decision.

This line is regenerated from the per-finding markers, not maintained by hand; recount at any
time with `python3 ~/.claude/scripts/review-findings.py` from the repo root.

Findings marked **[verified]** were independently re-confirmed with a runnable probe
or direct source read during assembly, over and above the auditing agent's own work.

---

## Contents

| § | Section | C | H | M | L | Total |
|---|---|---|---|---|---|---|
| [1](#1-core--data-pipeline) | Core — data pipeline | – | 2 | 2 | 3 | 7 |
| [2](#2-core--animation-and-layout) | Core — animation & layout | **1** | 2 | 3 | 3 | 9 |
| [3](#3-core--components-renderer-and-interaction) | Core — components, renderer & interaction | – | 3 | 4 | 4 | 11 |
| [4](#4-core--chart-type-helpers) | Core — chart-type helpers | – | 3 | 6 | 3 | 12 |
| [5](#5-core--config-system-and-validation) | Core — config system & validation | – | 3 | 4 | 3 | 10 |
| [6](#6-core--public-api-types-and-utils) | Core — public API, types & utils | – | 1 | 6 | 7 | 14 |
| [7](#7-accessibility) | Accessibility | – | 2 | 5 | 5 | 12 |
| [8](#8-framework-bindings-export-and-editor) | Bindings, export & editor | – | 2 | 6 | 4 | 12 |
| [9](#9-documentation) | Documentation | – | 3 | 7 | 3 | 13 |
| [10](#10-demo-applications) | Demo applications | – | 5 | 10 | 7 | 22 |
| [11](#11-tests-and-coverage) | Tests & coverage | – | 4 | 8 | 6 | 18 |
| [12](#12-build-tooling-packaging-and-ci) | Build, tooling, packaging & CI | – | 3 | 7 | 6 | 16 |
| [13](#13-movalid) | movalid | – | – | 4 | 1 | 5 |
| | **Total** | **1** | **33** | **72** | **55** | **161** |

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
**Medium · Bug · [FocusData.ts:37-40](packages/mochart/src/data/FocusData.ts#L37)** — **Fixed**

The guard clamps only the upper bound, and `isFocused` treats *only* `-1` as unfocused.
`getFocusData(config, chartData, -2, …)` on a two-category chart returns
`categoryFocusPercentages: [-1, -1]` with own keys `["0","1","-2"]` — every category
styled defocused, none focused, plus a non-index property written onto an array. `1.5`
and `NaN` behave the same. The guard's own comment claims the opposite. Adjacent to the
already-fixed B9, which hardened only the id paths.

**Fix:** normalize once — `Number.isInteger(i) && i >= 0 && i < categoryValues.length ? i : -1`.

**Fixed.** The guard now rejects any index that is not a real slot, rather than only those past the
end. Reproduced first, on a two-category chart, as `categoryFocusPercentages` values and own keys:

| index | before | after |
|---|---|---|
| `-2` | `[-1,-1]` keys `0,1,-2` | `[null,null]` keys `0,1` |
| `1.5` | `[-1,-1]` keys `0,1,1.5` | `[null,null]` keys `0,1` |
| `NaN` | `[-1,-1]` keys `0,1,NaN` | `[null,null]` keys `0,1` |
| `-1`, `2` | already unfocused | unchanged |
| `0` | `[1,-1]` | unchanged |

Regression test covers all three bad inputs and asserts the array keeps exactly its index keys; it
fails three ways on the unpatched source.

### DATA-4 — date category axes never preserve `axisData` identity
**Medium · Bug · [AxisData.ts:33-45](packages/mochart/src/data/AxisData.ts#L33)** — **Fixed**

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

**Fixed.** `scaleMutator` now compares domains with a date-aware check local to `AxisData.ts`
rather than the shared `areArraysAndEqual`. A date scale rebuilds its `Date` objects on every
`domain()` call, so the identity comparison never matched and the axis scale was replaced on every
frame — which also defeated the `oldAxisData !== axisData` check that skips re-measuring axis text
([Chart.ts:728](packages/mochart/src/components/Chart.ts#L728)).

Two corrections to the finding. The neighbouring function it cites as already documenting this no
longer exists. And its suggested fix — coercing with `+` inside `areArraysAndEqual` — would break
that helper's other caller in `Series.ts`, because two equal string arrays would coerce to `NaN`
and compare unequal. The comparison is therefore local, and `areArraysAndEqual` is untouched.

Tests cover an unchanged date domain (keeps the old scale), a changed one, a changed range, and a
numeric scale; the first fails on the unpatched source.

### DATA-5 — `groupSeriesCounts`/`stackSeriesCounts` are computed everywhere, read nowhere
**Low · Inconsistency · [SeriesData.ts:26-27](packages/mochart/src/data/SeriesData.ts#L26)** — **Fixed**

Both are written, copied through `getSeriesDataWithSeriesCounts`, re-derived per animation
frame, and re-exported into every per-category tooltip value object — with no consumer.
Only `axisSeriesCounts` is read. Meanwhile [SeriesPositions.ts:68](packages/mochart/src/utils/SeriesPositions.ts#L68)
divides the slot by the *static* group length, so filtering one series out of a group
leaves its slot empty rather than widening the survivors — which is exactly what
`groupSeriesCounts` would be for.

**Fix:** decide one way — consume them in `getSeriesPositionData` so grouped bars reclaim
a filtered slot, or delete both fields from the five places that produce them.

**Fixed by deletion.** Neither field had a consumer, so both are gone from the five places that
produced them: the `SeriesData` type, `getSeriesData`, `getSeriesDataWithSeriesCounts` (which now
takes only the axis counts), `getSeriesValueObjects`, and `getFilterDeltaData`. `axisSeriesCounts`,
the one that is read, is untouched. No behaviour change and no test changes; core's 1594 tests,
typecheck and lint pass.

The finding's other option — making `getSeriesPositionData` divide a group's slot by its *filtered*
length, so surviving bars widen when one is toggled off — is deliberately not taken here. That is a
visible change to how grouped bars respond to the legend rather than a dead-code cleanup, and it
should be chosen rather than arrive as a side effect of this finding. It is a small change at
[SeriesPositions.ts:68](packages/mochart/src/utils/SeriesPositions.ts#L68) if you want it.

### DATA-6 — `getSeriesContainerFilteredSeriesCounts` counts *unfiltered* series
**Low · Inconsistency · [SeriesData.ts:460-474](packages/mochart/src/data/SeriesData.ts#L460)** — **Fixed**

It increments when `filteredSeriesFlags[id] === false` — i.e. it returns the number still
shown. After the suppress→filter rename, "filtered" means legend-toggled-off, so the name
states the opposite of the value. [AxisData.ts:314](packages/mochart/src/data/AxisData.ts#L314)
reads `if (axisConfig.visibleWhenAllFiltered || filteredSeriesCount > 0)`, which parses as
a contradiction.

**Fix:** rename to `getSeriesContainerVisibleSeriesCounts` / `visibleSeriesCount` across
the six call sites. Behaviour unchanged.

**Fixed as recommended.** `getSeriesContainerFilteredSeriesCounts` →
`getSeriesContainerVisibleSeriesCounts` (and its private singular helper), the `filteredSeriesCount`
parameter threaded into `getValueAxisTickDataObject` → `visibleSeriesCount`, and PlotLayout's
`valueAxisFilteredSeriesCounts` locals → `valueAxisVisibleSeriesCounts`. `AxisData.ts` now reads
`if (axisConfig.visibleWhenAllFiltered || visibleSeriesCount > 0)`, which says what it does.

The `filteredSeriesFlags` parameter keeps its name: that map really is the filtered flags, and the
count is derived by testing `=== false`. Behaviour unchanged, no test changes; 1594 tests, typecheck
and lint pass.

### DATA-7 — six near-copies of "coerce a Date to a comparable number"
**Low · Inconsistency · [DomainData.ts:6](packages/mochart/src/data/DomainData.ts#L6), [AxisDomainData.ts:80](packages/mochart/src/data/AxisDomainData.ts#L80), [CategoryValue.ts:6](packages/mochart/src/data/CategoryValue.ts#L6), [CategoryData.ts:111](packages/mochart/src/data/CategoryData.ts#L111), [DataValidator.ts:28](packages/mochart/src/data/DataValidator.ts#L28)** — **Fixed**

*Found while implementing ANIM-1 part 1, not by either review pass.*

The same idea — turn a value that may be a `Date` into something comparable — is written six times,
and the copies are not equivalent:

| Site | Handles a date *string*? | Returns |
|---|---|---|
| `DomainData.numericValue` | no | `number` |
| `AxisDomainData.comparableValue` | no | `number` |
| `CategoryValue.getCategoryValueKey` | no | `string` |
| `CategoryData.ts:111` | no (casts to `Date`) | `number` |
| `DataValidator.ts:28` | **yes** | `number` |
| `validation/mochartConfig.boundValue` | **yes** | `number \| null` |

`numericValue` and `comparableValue` are **byte-identical** — same body, same signature, different
names, each private to its own module. The rest are near-variants, which is the more dangerous
shape: whether a `'2020-01-01'` string is understood differs between them, and that is exactly the
distinction a caller is least likely to check.

Not a bug today — each call site gets the variant it needs. The risk is a seventh copy, or a fix
applied to one and not its twin.

**Fix:** collapse at least `numericValue`/`comparableValue`, which are the same function. A full
consolidation is constrained by layering: five of the six live in `src/data/`, and `src/config/`
imports nothing from the data layer (verified — zero imports), so a single shared helper would
either live in `src/utils/` or the config copy would stay separate. The config-side one is best
placed in `config/validation/validators.ts`, beside the existing non-validator predicates, where
the coming `softMin`/`softMax`, threshold-value and `ticks[].value` checks can reuse it.

**Fixed for the identical pair; the four near-variants are left alone deliberately.**
`AxisDomainData.comparableValue` is gone and its seven call sites now use `numericValue`, exported
from `DomainData` — which `AxisDomainData` already imported from, so no new import edge and no
`src/utils/` hop was needed. Six copies are now four. Behaviour unchanged; 1594 tests, typecheck and
lint pass.

The other four are *not* collapsed, because they are not the same function:

* `CategoryValue.getCategoryValueKey` returns a `string` lookup key, not a comparable number.
* `CategoryData.ts:111` casts to `Date` and would *throw* on a stray string; `numericValue` would
  instead return that string typed as a `number`. Substituting the shared helper here trades a loud
  failure for a silent one, so the cast stays.
* `DataValidator.ts:28` deliberately parses date *strings*, which the shared helper does not.
* `validation/mochartConfig.boundValue` returns `number | null` and sits in `src/config/`, which
  imports nothing from `src/data/` (still true). Its home, when `softMin`/`softMax`, threshold and
  `ticks[].value` checks want it, is `config/validation/validators.ts` as the finding suggests.

---

# 2. Core — animation and layout

### ANIM-1 — an `Infinity` phase duration wedges the chart in a permanent rAF loop
**Critical · Bug · [DomainAnimationData.ts:75](packages/mochart/src/animation/DomainAnimationData.ts#L75)** **[verified]** — **Fixed**; axis-bounds follow-up also implemented

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

#### Follow-up: axis bounds — **implemented**

Built in seven reviewable units, in the order the notes below require:

| Unit | Commit | What landed |
|---|---|---|
| 1 | `140c9d09` | `axis.reversed` on every axis, ordinal included, by flipping the range |
| 2 | `80f61027` | `min <= max` enforced as a validation error |
| 3 | `2af9cf99`, `e5c5b91e` | series clipped to the plot on xy charts, with `plot.clipOverflow` |
| 4 | `e79fd3d9` | `getClippedEdges` — which screen edges have data behind them |
| 5 | `7fe01c8a` | the `ClipIndicator` band and its config |
| 6 | `7ae472a0` | label, `auto` sizing, `<title>`, mitred corners, hatch fill, own config section |
| 7 | uncommitted | [`recipes/axis-bounds.md`](packages/mochart-docs/recipes/axis-bounds.md) |

Three parts of the design below were revised while building it:

- **The derived marker allowance was dropped.** Inflating the clip by the largest `markerSize`
  was the design; it was replaced by `plot.clipOverflow`, a `margin()`-shaped config the caller
  sets per side. The derived version guessed at one case (markers) and could not cover labels or
  thick strokes, and a chart with no clipping paid for it anyway.
- **The config moved off `plot` into a `clipIndicator` section.** The design rejected a section
  because "four properties do not justify the section registries" — it reached nine. Members are
  unprefixed, matching `tooltip`/`crosshair`/`legend`:
  `visible`, `size`, `padding`, `label`, `textStyle`, `style`, `hatch`, `showInFront`.
- **The band is hatched, not tinted.** `hatch: {spacing, width}` draws an SVG `<pattern>` from
  `style.fillColor`; `hatch: null` gives the flat fill, and `style`'s default is conditional on it
  so turning the hatch off also drops to the lighter unstroked weight. Bands are mitred `<path>`
  quadrilaterals rather than rects, so neighbouring edges share a diagonal instead of one covering
  the other's corner — which only matters because the band is now stroked.

Two design notes held up exactly as written: `reversed` had to land before `min > max` was
rejected, and `AUTO` sizing reused the `axis.titleSize` pattern. One did not survive contact:
the `<title>` is dropped along with a `null` label rather than "rendered always", since a title
with no visible label to recover is an accessible name for a shape that means nothing on its own.

The `min`/`max` cross-check was left out of the fix above and then discussed. The original
question offered "leave it accepted, an inverted domain is useful" — **that was wrong**, and the
investigation behind the decision is worth keeping:

- `min` is a **hard override**, not a clamp: [AxisDomainData.ts:38](packages/mochart/src/data/AxisDomainData.ts#L38)
  assigns it unconditionally. `softMin`/`softMax` are the bounds that never clip — their own
  docs say so. So `min: 0` on all-negative data does *not* pin the axis at zero; it throws the
  `-5` bar **170px above the top of a 255px plot**, and there is no clip path on the series area,
  so it paints over the axis and title.
- `softMax: 0` + `base: 0` is what actually produces "axis reaches zero, bars hang from it,
  nothing clipped" — measured, both bars land inside the plot. `min`/`max` have no role in it.
- `min: 100, max: 0` renders a *correct* descending axis today, so there is a real capability
  hiding behind the accident.
- But ordering is the wrong fault line: `min: 0, max: 10` — properly ordered — with a value of
  `50` escapes **1020px** above the plot in exactly the same way. The defect is an explicit bound
  with data outside it, not the bound order.

**Decided fix, in three parts:**

1. **Enforce `min <= max`** on every axis as a validation error.
2. **Add `axis.reversed`** (boolean, all axes) as the supported way to invert an axis.
3. **Clip values outside `min`/`max`** where those bounds are set, on all axes.

Four notes for whoever implements it:

- **Order matters.** `reversed` must land *before* `min > max` is rejected, or the capability is
  removed before its replacement exists.
- **`reversed`, not `inverted`.** [`plot.inverted`](/reference/plot#plot.inverted) already means
  "swap which screen axis the category runs along"; two `inverted`s would be a lasting trap.
  `reversed` also matches Highcharts, Chart.js and Vega.
- **Implement `reversed` by flipping the *range*, not the domain** — d3's own approach. It keeps
  the domain ascending, so base lines, thresholds, tick generation, stacking and the animation
  delta pipeline all keep working untouched. Flipping the domain would reintroduce the negative
  extent this finding is about.
- **Clip, don't drop.** A bar spanning base 0 → 50 on a `max: 10` axis must still show its 0→10
  portion; a vanished bar is indistinguishable from missing data, which is the same class of
  silent wrongness in a new place. What gets clipped, and how edge marks survive it, is settled
  under "Clip scope" below.

Parts 2 and 3 are new work rather than ANIM-1 repairs, so they will land as their own commits.
The committed `Math.max(domainExtent, 0)` clamp stays either way: once `min <= max` is enforced a
negative extent becomes unreachable, and the clamp becomes belt-and-braces rather than the thing
holding the rAF loop closed.

**`min === max` is deliberately legal** — the rule is `min <= max`, not `min < max`. Rejecting it
would mean the *same domain* is fine when `auto` derives it from flat data and a config error when
written down: measured, `{min: 5, max: 5}` with data `5, 5` renders byte-identically to `auto`
with the same data. It is also how computed configs land on flat data
(`min: Math.min(...values), max: Math.max(...values)`, or a date picker set to one day), which is
exactly when the config is *correct* — erroring there would blank a chart in production on the day
the data happened to be flat. How a collapsed domain **draws** is handled in
[ANIM-2](#anim-2--a-zero-span-domain-makes-every-update-flash-to-zero-then-to-full-height), which
covers the `auto` route too.

##### Part 3 design: clipping, and the clip indicator

**Behaviour.** Where an axis has an explicit `min`/`max`, marks are **clipped**, not dropped — a
bar spanning base 0 → 50 on a `max: 10` axis still shows its 0→10 portion. Dropping it would make
it indistinguishable from missing data, which is the same silent wrongness in a new place, and
this library already treats that distinction as load-bearing (`missingValues`,
`showMissingValues`, `colorScale.missing`). There is **no way to switch clipping off**: unclipped
overflow painting over the axes is the bug, not a mode.

**Clip scope: everything, with a derived allowance.** The clip covers the whole series group —
shapes, markers, labels, error bars — not just the geometry layer. An out-of-range *marker* is as
wrong as an out-of-range bar, so exempting the marker layer would leave the worst case unfixed.

That needs an allowance, because of a fact easy to miss: **margins are only applied to an end
whose bound is `AUTO`** ([AxisDomainData.ts:59](packages/mochart/src/data/AxisDomainData.ts#L59)).
Measured — `{min: 0, max: 10}` with `marginFraction: 0.1` gives the domain `[0, 10]`, unchanged;
the same margin on an auto end gives `[0, 11]`. So on an explicitly-bounded axis, data sitting
*exactly* on the bound sits exactly on the plot edge with no inset. Measured on a 255px plot: a
`markerSize: 10` circle at the axis max is centred at `y=0` and spans `-5.6 … 5.6`; at the axis
min it is centred at `y=255` and spans `249.4 … 260.6`. A plain clip would slice those in half in
charts where **nothing is out of range at all** — a line pinned to `min: 0` with a zero value is
the everyday case.

The allowance is therefore **derived, not configured**: inflate the clip rect by the largest
`markerSize` in the chart. It self-adjusts, needs no new config, and is `0` when the chart has no
markers, so a bar chart still clips exactly at the bound. `minMarginFraction` was considered and
rejected for this: besides being inert on explicit bounds, a margin *changes the domain* while an
allowance does not — reusing one property for both would mean "sometimes this moves your data,
sometimes it doesn't, depending on whether the other end is auto".

Two loose ends for implementation, deliberately not pre-decided here: whether this is **one**
inflated clip over the whole group (simplest — shapes may then poke past the bound by the marker
radius) or **two** clips (exact for shapes, inflated for markers/labels); and how **label** extent
factors in, since unlike `markerSize` it is only known after text measurement.

For scale: an unclipped mark does not escape onto the page — the outermost `<svg>` clips to its
own viewport, so today's overflow is confined to painting over the chart's own title and axes.

**Clipping is a viewport operation, not a data one.** A clipped mark still reports its true value
in the tooltip, in its value label, and in the aria-live announcement. This is the single most
valuable part of the fix and it is free — but it is exactly the sort of invariant a later
optimisation quietly breaks, so it wants a test.

**The visual: a clip indicator band.** A band along the affected plot edge, drawn on **any plot
edge where at least one axis has clipped values** — so up to four, and two value axes clipping at
the same end produce *one* band. Edges follow the axis direction, so `plot.inverted` remaps which
edge is the "high" end with no extra handling.

**Config lives on `plot`, not on the axes.** Two reasons, the second decisive: it renders in the
plot area rather than on an axis; and per-axis config has no answer for two value axes clipping at
the same end — two overlapping bands with different styles and sizes, or an arbitrary first-wins.
Gridlines are per-axis plot-area chrome and work fine, but only because each axis's gridlines
occupy *different positions*; a band is one piece of geometry per edge, so it cannot be owned by an
axis. A new top-level `clipping` section was also rejected: four properties do not justify the
section registries, the config-guide list and the reference-page generator.

| Property | Validator | Default |
|---|---|---|
| `plot.showClipIndicator` | `boolean` | `true` |
| `plot.clipIndicatorSize` | `numberMin(0).orEqual(AUTO)` | `AUTO` |
| `plot.clipIndicatorStyle` | `style()` | tinted fill |
| `plot.clipIndicatorFront` | `boolean` | `true` |
| `plot.clipIndicatorLabel` | `string` (or `NONE`) | a short string, **not** `null` |
| `plot.clipIndicatorTextStyle` | `style()` | — |

**It overlays the plot; it does not reserve space.** Reserving would make the band a layout
participant, so its text measurement would have to converge before layout settles — the corner
where the tick-truncation reentrancy bug lived, and not somewhere to add a fourth participant.
Overlaying also keeps it *in* the plot (reserving would put it between plot and axis, which is
axis chrome again), and the strip it covers is the ambiguous zone anyway, since every clipped mark
is already flat against that boundary. This is also what keeps `clipIndicatorFront` meaningful —
under a reserving design that property would be nonsense and should be dropped.

**`AUTO` sizing** measures the label and sizes the band to it; with `clipIndicatorLabel: null` it
falls back to a small fixed depth. One rule, both cases. This is not new machinery — it is the
validator and the pattern `axis.titleSize` and `axis.tickLabelSize` already use
([axisConfig.ts:104,126](packages/mochart/src/config/validation/axisConfig.ts#L104)).

**The label.** One string for every edge — so it cannot say "more above" / "more below", which is
the accepted cost of having no per-edge control. Rotation on the left/right edges must match what
[AxisTitle.ts:79](packages/mochart/src/components/AxisTitle.ts#L79) already does for vertical axis
titles, reusing `RotatedLayoutInfo`, so the two never disagree on a chart that has both. When the
label does not fit, **hide the label and keep the band** rather than truncating — a truncated
`Clip…` is worse than no text, and it avoids adding `truncation*` properties here.

The default is a **short string, not `null`**: a bare band is a shape-only cue that means nothing
on first sight, and core already ships configurable English defaults for visible chart text
(`tooltip.filterModeText`) for exactly this reason. Setting it to `null` opts out of the visible
text *and* the hover text together.

**An SVG `<title>`, rendered always**, mirroring `clipIndicatorLabel`. It gives the hover tooltip
that recovers a hidden label *and* serves as the band's accessible name, so one element covers
both. Two cautions: `aria-label` beats `<title>` for assistive tech, so set one or the other on
the band and never both; and there is **no `<title>` anywhere in `src` today** — everything is
named with `ariaLabel` — so this is a deliberate divergence and wants a comment saying why, or it
reads as an inconsistency to the next person.

**This closes the `console.warn` question.** With a visible, hoverable, screen-reader-named
indicator, clipped data is no longer silent, and a console warning would add noise without adding
information.

### ANIM-2 — a zero-span domain makes every update flash to zero, then to full height
**High · Bug · [DomainAnimationData.ts:72-80](packages/mochart/src/animation/DomainAnimationData.ts#L72), [SeriesAnimationData.ts:534](packages/mochart/src/animation/SeriesAnimationData.ts#L534)** — **Fixed**

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

~~One correction to the finding: the collapsed-domain half does not reproduce — a value axis
defaults its `base` to 0.~~ **That was wrong, twice over.** `base` defaults to `NONE`; only pie
mode and a stacked axis default it to 0
([valueAxisConfig.ts:55-62](packages/mochart/src/config/defaults/valueAxisConfig.ts#L55)).
Measured: `[{v:7},{v:7}]` on a plain bar series gives `axisDomain [7, 7]` — **the finding was
right, the domain really is collapsed.**

What is true is narrower and does not contradict the finding. The collapsed domain never reaches
the value-delta code, because `getTransitionValueChangeData` is handed `axisExpansionData.final`
— the domain *after* the expansion phase has already widened it to cover the new data. So the
`plain` delta for `7,7 → 9,9` is `1` both before and after the fix above, and the fix only ever
changed the **inverted** (negative-extent) case. The collapsed-domain cases in
`test/animation/CollapsedDomainDeltas.test.ts` therefore pass either way: they are guards against
a future regression, not regression tests for this one.

That is also the mechanism behind the flash the finding leads with — expansion widens the domain,
so mid-animation the same values sit at an extreme rather than at the midpoint. It is fixed by
widening the domain at its source, which is the decision recorded below.

The commit message on `2bceea43` carries the same wrong claim about `base`; this entry is the
correction of record.

#### Follow-up: collapsed-domain drawing — **implemented**

Landed in six commits (`acac2c13`..`8ee531ed`), and in two halves rather than the one the decision
below anticipated.

**Rendering: a separate render domain, widened proportionally.** `getRenderAxisDomain`
([AxisDomainData.ts](packages/mochart/src/data/AxisDomainData.ts)) returns a widened copy for a
collapsed domain, carried alongside the semantic one as `renderAxisDomain`. Scales and ticks read
the widened copy; anything that reads the domain as the configured bound — the axis base, clip
detection — keeps the semantic one, so an explicit `min: 5, max: 5` still renders ticks at 5.
The widening is `±5%` of the value put through d3's `.nice()`, not the fixed `±0.5` the decision
called for: a fixed span makes tick labels identical at large magnitudes, since a span of 1
against a value of 1,000,000 differs only in the seventh digit. Zero widens upward to `[0, 1]`.
Date axes widen by the finest unit their tick format implies, defaulting to one day.

**Animation: the union is now optional.** The flash was not caused by the collapsed domain at all
— it came from the animation expanding to the *union* of the old and new domains, moving the
values, then contracting. For a domain that translates rather than grows, the union dwarfs both
ends, so the two rescaling phases dominate. New config `animation.valueDomainChange` and
`animation.categoryDomainChange` (`staged` / `combined` / `auto`) choose between the union phases
and interpolating the domain together with the values in one phase. Value axes default to `auto`,
which combines only when a domain translates; category axes default to `staged`, because a
category domain change usually also changes the category set and the union shows where the data
moved.

**Measured after, as bar height in pixels on an 800×600 chart:**

| Case | Before | After |
|---|---|---|
| single value 3 → 5 | 278 → 96 → 456 → 278 | 278 throughout |
| single value 10 → 40 | 278 → 10 → 545 → 278 | 278 throughout |
| flat 10,10,10 → 40,40,40 | 278 → 10 → 545 → 278 | 278 throughout |
| flat 10,10,10 → 10,11,10 | 278 → 26 → 537 → 26 | 278 → 232 → 180 → 26 |
| all-zero tick label | `NaN` | `0.0` … `1.0` |
| frames in the initial animation | 2 (never played) | 33 |

Where the before and after frames are identical the mark now holds still, which is the honest
rendering: a single value always sits at the domain midpoint, so it has nowhere to go and only the
tick labels can carry the change. Where the data genuinely changes shape the mark moves
monotonically instead of collapsing and ballooning first.

The original decision, kept for the reasoning behind it:

**Decided: widen a zero-extent domain once, before it reaches the scale.** This is where a
collapsed domain gets handled for *every* route into it, not just the animation one — flat data
under `auto`, a single data point, and the explicitly legal `{min: 5, max: 5}` from
[ANIM-1](#anim-1--an-infinity-phase-duration-wedges-the-chart-in-a-permanent-raf-loop) all arrive
at the same place. Today all three render one tick reading `5.000000` with every value crushed
onto the midline, and animate through `h=81 → h=0 → h=161 → h=81`.

Widening was previously argued against here in favour of the smaller fix (hold the degenerate
domain through the animation phases). That reasoning does not survive the wider view: the smaller
fix addresses the flash only, and leaves the static rendering degenerate for all three routes.

Notes for whoever implements it:

- Widen to `[v - 0.5, v + 0.5]`, or `[0, 1]` when `v` is 0 — the shape `getSafeDomainExtent`
  already assumes.
- Do it **once, at the domain boundary**, so the scale, the ticks and the animation deltas all
  see a non-degenerate domain and none of them needs its own special case.
- It **changes where an all-equal chart draws** when nothing is animating, so the golden
  snapshots will churn. That is the intended outcome here, not a regression — but it is the
  reason this is its own commit with the snapshots regenerated deliberately.
- An explicit `{min: 5, max: 5}` must still *report* 5 as its bound; the widening is a rendering
  concern and must not leak back into anything that reads the configured value.

### LAYOUT-1 — negative `width`/`height` reach background rects on small or heavily spaced charts
**Medium · Bug · [PlotLayout.ts:91](packages/mochart/src/layout/PlotLayout.ts#L91), [SpacingLayoutInfo.ts:47-53](packages/mochart/src/layout/SpacingLayoutInfo.ts#L47), [LegendLayout.ts:113-121](packages/mochart/src/layout/LegendLayout.ts#L113)** — **Fixed**

`getPlotHeight` returns `innerHeight - titleHeight - legendHeight` unclamped;
`createSpacingLayoutInfo` guards only on `width > 0`, never height; `getLegendLayoutInfo`
clamps `legendItemTextWidth` but leaves per-item `itemWidth` unclamped. Prior finding B11
fixed only the top-level gate in `Chart.sync`, so any positive-but-small size still reaches this.

- `chart.padding {top:200,bottom:200}` at 300×200 → `<rect height="-204">` in `g.mochart-plot-background`
- `chart.margin` 120 all round at 300×200 → `height="-40"` and `height="-46"`
- title + legend at 20×20 → `height="-37"` and `width="-1"` on the legend-item background

Negative `width`/`height` is an SVG error value: browsers drop the element, so host-styled
backgrounds silently disappear, and strict SVG→PNG rasterisers reject the document.

**Fixed.** Clamped at the layout sources rather than at each drawing site, so the clip rects fed by
the same layout info are covered too: `getPlotHeight`, the legend item widths, and — the one the
finding missed — the inner bounds in `getSpacingInnerBounds`, which is where the chart-level
background got its negative height. `createSpacingLayoutInfo` also now guards on height as well as
width.

All three cases named above were reproduced first and all three now emit no negative rect. Note the
plot *contents* were already safe (the series extents are clamped to 1 elsewhere), so the visible
symptom was a missing background rather than a broken chart.

New test `test/layout/NegativeBounds.test.ts` renders the three cases and asserts no rect has a
negative width or height, plus one normal chart to show the clamps do not disturb ordinary layout.
Three of its four cases fail on the unpatched source. Golden snapshots unaffected — 130 pass
unchanged.

### ANIM-3 — a structural config change replays the full mount animation, undocumented
**Medium · Doc gap · [AnimatedDataSource.ts:112-114](packages/mochart/src/chart/AnimatedDataSource.ts#L112), [staged-animation.md:51](packages/mochart-docs/guide/staged-animation.md#L51)** — **Fixed** (documented)

`hasConfigStructureChange` routes to `start()`, which discards `chartData` and rebuilds with
`initialAnimation = true`. The chart collapses to the axis base and regrows at
`initialDuration`, not `valueChangeDuration`. The docs say `initialDuration` is "when the
chart mounts"; `ChartHandle.update`'s JSDoc says config changes "animate through the staged
animation phases".

Measured: `initialDuration: 1600` / `valueChangeDuration: 160`, settle, then remove one series
via `update({ config })` — first frame after the update has every segment 1-2 px tall at the
plot floor, taking 96 frames (~1.6 s) to settle. Any host with a live config editor — the six
shipped demos, for one — flashes the whole chart to zero on an edit that only removed a series.

**Fixed as a documentation gap — the behaviour is deliberately unchanged.** Rebuilding is correct
for edits that change what the chart is: the transition path assumes the old data still matches the
new config, which is false for a chart-type or category-property change. What was missing was any
mention of it.

Three places now say so: a new "Structural config changes rebuild the chart" section in the staged
animation guide listing every edit that qualifies, the `initialDuration` description (it also paces
the replay after a rebuild, not just mount), and the `update` doc comment on the chart handle, which
had claimed config changes animate through the staged phases with no exception.

The guide also states two things that were previously easy to get wrong: config edits are applied
instantly rather than animated — the phases animate *data* changes — and switching a series off by
clicking the legend is filtering, not a config edit, so it does not rebuild.

One entry in that list does not belong there and is worth changing rather than documenting:
[ANIM-7](#anim-7--showinlegend-rebuilds-the-whole-chart-and-replays-its-opening-animation).

### LAYOUT-2 — `keepInside` lets an oversized tooltip escape past the left/top edge
**Low · Bug · [TooltipLayout.ts:50-63](packages/mochart/src/layout/TooltipLayout.ts#L50)** — **Fixed**

The `x < bx` / `y < by` clamps run *before* the max-edge clamps, so when the tooltip is larger
than the bounding rect the max-edge clamp wins and pushes it out the opposite side:
`fitRectangleWithinRectangle({x:10,y:10,width:100,height:50}, {x:20,y:20,width:200,height:80})`
→ `{x:-90, y:-20}`. Reachable on a narrow chart with a multi-row tooltip.

**Fix:** clamp both ways with min last — `x = Math.max(bx, Math.min(x, bx + bwidth - width))`.

**Fixed as recommended.** `fitRectangleWithinRectangle` now clamps with min last —
`x = Math.max(bx, Math.min(x, bx + bwidth - width))` on both axes — so an oversized tooltip pins to
the near edge instead of being pushed out past the opposite one. The finding's case,
`fitRectangleWithinRectangle({x:10,y:10,width:100,height:50}, {x:20,y:20,width:200,height:80})`,
returns `{x:10,y:10}` rather than `{x:-90,y:-20}`.

The helper had no direct test, so `test/layout/TooltipLayout.test.ts` now covers it: fits-inside,
pulled-back-from-the-max-edges, and oversized in both directions and in one only. 1597 tests pass.

### ANIM-4 — dead store in `setKeyedSeriesDomainForDelta`
**Low · Bug · [ChartAnimation.ts:231-235](packages/mochart/src/animation/ChartAnimation.ts#L231)** — **Fixed**

The `if (domainDelta[valueKey].deltaPercentage < deltaPercentage)` branch assigns
`seriesDomainObject[valueKey]`, then line 235 unconditionally overwrites it. Harmless today
only because `getDomainForDelta` re-tests the same condition, but the code says something it
does not do.

**Fix:** delete lines 231-233, or make 235 the `else` branch.

**Fixed by deleting the dead store.** The `if (domainDelta[valueKey].deltaPercentage <
deltaPercentage)` branch assigned `endSeriesDomainObject[valueKey]` and was then overwritten
unconditionally by the `getDomainForDelta` call. `getDomainForDelta` re-tests exactly that condition
and returns `endDomain` for it ([ChartAnimation.ts:140](packages/mochart/src/animation/ChartAnimation.ts#L140)),
so the branch was doing the same work one line early and throwing it away.

`setKeyedSeriesDomainForDelta` is now the single assignment. No behaviour change; 1597 tests,
typecheck and lint pass.

### ANIM-5 — shared delta constants are mutated in place
**Low · Bug · [SeriesAnimationData.ts:843-844](packages/mochart/src/animation/SeriesAnimationData.ts#L843)** — **Fixed**

`getSeriesValuesDeltas` returns the module-level `emptyValueDelta` singleton for a zero delta;
the caller then writes `deltaCopied = false` onto it, stamping a constant shared by every chart
instance on the page. `setValueDeltaFactorForValues` likewise writes `deltaFactor` onto the
three shared constants. Latent — the writes currently store the value that slot would have had
anyway — but the surrounding `adjust*` functions carry explicit "never mutated" comments, so
the invariant is already understood to matter.

**Fix:** return a fresh object for the zero case, or `Object.freeze` the three constants.

**Fixed by returning fresh objects.** The three module-level constants are now factory functions —
`emptyValueDelta()`, `emptyCopiedValueDelta()`, `emptyNotCopiedValueDelta()` — so no caller can ever
write through to an object shared by every chart on the page. All five sites that handed one out are
updated, including `getSeriesValuesDeltas`'s zero-delta return, which is the one the finding traced:
`setFilteredSeriesValueDeltas` stamped `deltaCopied = false` onto it, and
`setValueDeltaFactorForValues` stamped `deltaFactor` onto all three.

`Object.freeze` was the finding's other suggestion and is the wrong one here: the writes are
legitimate — the objects are meant to carry `deltaCopied`/`deltaFactor` — so freezing would throw in
strict mode rather than fix anything. The allocation is once per key per series when delta data is
built, not per frame, and the non-zero path on the same line already allocates.

1597 tests, typecheck and lint pass.

### ANIM-6 — a value outside an explicit axis bound stretches the animation past its configured maximum
**Medium · Bug · [SeriesAnimationData.ts:763](packages/mochart/src/animation/SeriesAnimationData.ts#L763), [ChartTweens.ts:417](packages/mochart/src/animation/ChartTweens.ts#L417)** — **Fixed** **[verified]**

*Found while writing the axis-bounds recipe, not by either review pass.*

Phase durations are `configuredDuration * deltaPercentage`, and the weight is not clamped:

```ts
const deltaPercentage = valueAxisExtent > 0 ? getMaxAbsoluteValue(deltas) / valueAxisExtent : 0;
```

The numerator is a delta in **data units**; the denominator is the **visible** axis extent. An
explicit `min`/`max` decouples the two, so any value outside the bounds pushes the ratio above 1
and multiplies the duration. Measured, driving real frames on a fake clock, with
`initialDuration` at its `1000` default:

| Config | Settles in |
|---|---|
| spike `1408`, axis `0..200` (the [recipe](packages/mochart-docs/recipes/axis-bounds.md) example) | **7056ms** |
| spike `150` (in range), axis `0..200` | 768ms |
| spike `1408`, axis `auto` | 976ms |
| spike `14080`, axis `0..200` | **>48000ms**, still running at the 3000-frame cap |

It scales linearly with how far out of range the value is, with no ceiling; `safeDuration`
([ChartTweens.ts:376](packages/mochart/src/animation/ChartTweens.ts#L376)) only rejects
non-finite and negative values.

**Is it a bug?** Scaling duration by how far things move is plainly the design — the open question
is whether that scaling may exceed the configured value. Two things say no: the property is
documented as *"the **maximum** duration for the initial animation"*
([animationConfig.ts:4](packages/mochart/src/config/docs/animationConfig.ts#L4)), and past the
axis extent the extra time animates a mark that is behind the clip edge the whole way, so it buys
no visible motion. Left open rather than fixed, since the ratio also feeds relative pacing.

Predates the clipping work — `git log -L` shows the line unchanged since the `groupAxis` rename.
It used to be self-concealing: the out-of-range mark was drawn, overflowing the plot, so it really
did travel that far on screen. Now it is clipped, and the extra seconds are spent off-screen.

**Fixed: the weight is capped at 1 where it is calculated.**

The weight answers "how far does this move", so that bigger moves get more time — and what matters
is how far it moves *on screen*. A value ending outside an explicit `min`/`max` is clipped: the mark
travels to the edge of the plot and stops, however large the number gets. So it can never move more
than one axis extent, and a weight above 1 was claiming movement that does not happen.

That also settles where to cap it. Capping at the source rather than at the duration does flatten
the staggering between marks whose weights both exceed 1 — but those marks genuinely do travel the
same visible distance, so finishing together is correct.

A config property to choose between capped and uncapped was considered and rejected: the duration is
documented as a *maximum*, so a switch to disable that would make a contract violation into an
option, and no caller wants a 48-second animation. If out-of-range values should ever get *extra*
time deliberately, that is a differently-shaped property, not a capped/uncapped switch.

**Measured, with `initialDuration` at its 1000 default:**

| Config | Before | After |
|---|---|---|
| spike `1408`, axis `0..200` | 7056ms | **1024ms** |
| spike `14080`, axis `0..200` | >48000ms | **1024ms** |
| spike `150` (in range) | 768ms | 768ms |
| spike `1408`, axis `auto` | 976ms | 976ms |

Three golden snapshots moved, all mid-animation frames — one heatmap and two gauge filter frames.
No settled, initial or static snapshot changed, so every chart still ends in exactly the same place;
only the pacing to get there changed, which is the point.

The earlier note that the account of this finding was unconfirmed is resolved: the path is
`AxisDomainData` → the axis extent as the divisor → the value delta as the numerator → the multiplier
at `ChartTweens.ts:417`, and the arithmetic matches all four rows above.

### ANIM-7 — `showInLegend` rebuilds the whole chart and replays its opening animation
**High · Bug · [mochartConfig.ts:360](packages/mochart/src/config/core/mochartConfig.ts#L360)** **[verified]** — **Fixed**

`hasConfigStructureChange` treats a change to any series' `showInLegend` as structural, so the
chart is torn down and rebuilt, replaying the opening animation
([AnimatedDataSource.ts:108](packages/mochart/src/chart/AnimatedDataSource.ts#L108)). Every other
entry in that list changes what the chart *is* — the chart type, the category property, the series
set, which axis a series uses. This one only changes whether a series appears in the legend.

Outside the config files the flag has exactly three readers: which items the legend renders
([Legend.ts:174,206](packages/mochart/src/components/Legend.ts#L174)), which series get measured
for the legend ([TextMeasurement.ts:366](packages/mochart/src/utils/TextMeasurement.ts#L366)), and
one clamp comment in the legend layout. It touches no colours, no series rendering, no data. There
is no structural reason for the rebuild.

**Why it is currently necessary.** The legend's measured text sizes are an **array with one entry
per legend series, matched by position**, and it is always one frame behind because measuring
happens after drawing. A rebuild resets everything, so today the array is never out of step. Make
the flag non-structural and it goes out of step exactly when the flag flips: the stored array
describes the old set of legend items while the legend draws the new set. That is the same
mismatch behind the crash in
[TEST-17](#test-17--no-test-toggles-a-visibility-flag-on-a-mounted-chart-and-the-gap-hides-a-crash),
where an array of the wrong length made the renderer index past its end.

**Fix: stop matching by position.** Key the legend's measured sizes by series id rather than index.
A stale set is then harmless — it simply has no entry for a series that just joined, which falls
back to unmeasured for one frame and corrects on the next, exactly as first render already does.
Then remove `showInLegend` from the structural list. Roughly five files: the two legend measuring
functions in `TextMeasurement.ts`, their two fields in `types/layout.ts`, the two loops in
`LegendLayout.ts`, the item build in `Legend.ts`, and the one-line list change. No public API
change, and the rendered output should be identical, so golden snapshots should not move.

Worth a `ConfigUpdateSmoke` scenario toggling `showInLegend` with `structural: false`, which is
where the wrong-length array would show up.

**Fixed to the recommended strategy.** The legend's measured text sizes are keyed by series id
instead of by legend position, and `showInLegend` is out of the structural list, so flipping it now
takes the ordinary update path.

* `getLegendItemTextBounds`/`getLegendItemTextRawBounds` return `Record<string, TextBounds>`, built
  by zipping the measured elements against the `showInLegend` series that produced them.
* A new exported `getLegendItemBoundsList` turns that map back into a positional list *for the
  current* series set, falling back to `unmeasuredBounds` for a series with no entry. The two
  `LegendLayout` loops call it, so their arithmetic and their output arrays are unchanged in shape —
  the list now always describes the series being drawn.
* `legendItemMaxTextBounds` is taken over `Object.values`, and `hasDefault` already recursed through
  plain objects, so it needed no change.
* `hasConfigStructureChange` no longer tests `showInLegend`.

Golden snapshots did not move, as the finding predicted, and no public API changed.

Three tests moved with the behaviour: `core.test.ts` now asserts the flag reports *no* structural
change, and the two `TextMeasurement` legend tests assert the id-keyed shape. New coverage:
`getLegendItemBoundsList` for a series joining and a series leaving the legend, and
`test/components/LegendMembershipAnimation.test.ts`, which drives real frames on a fake clock and
checks the frame *straight after* the flip — the only frame where a rebuild is visible. Verified to
bite: with `showInLegend` put back in the structural list that test fails with bar heights
`[4, 9]` (restarted from the baseline) against the expected settled `[204, 503]`.

106 files / 1603 tests pass, whole-repo typecheck, lint and deadcode clean.


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
**Medium · Bug (a11y) · [Chart.ts:742](packages/mochart/src/components/Chart.ts#L742), used by [TooltipControls.ts:54](packages/mochart/src/components/TooltipControls.ts#L54)** — **Fixed**

`announceTooltipCategory` is called only from `onPlotKeyDown`. `updateTooltipCategoryIndex` —
the path the tooltip's Previous/Next buttons use — never touches the `role="status"` region,
and the tooltip body is not itself a live region. Open with Enter (live = `"Jan: …"`), press
ArrowRight (live = `"Feb: …"`), then click **Previous category**: the tooltip shows `Jan` but
the live region still reads `"Feb: Series S0: 20.00"` — the last announcement now contradicts
the visible tooltip.

**Fixed.** `updateTooltipCategoryIndex` now announces the category it moves to, so the tooltip's own
prev/next buttons read out rather than only the keyboard arrows.

One correction to the fix suggested above: only *one* of the three existing announce calls became
redundant. The other two sit on the tooltip-open path, which goes through `setTooltipOpen` rather
than this method, and removing them would have silenced the announcement when the tooltip first
opens. Only the arrow-key call was removed.

Checked that this cannot cause repeated announcements while the pointer moves: the follow-pointer
path writes state directly rather than calling this method, so the only callers are the step
buttons and the arrow keys.

Test opens the tooltip with the keyboard, clicks the next button, and asserts the live region moves
from the first category to the second; it fails on the unpatched source.

### COMP-4 — no coherent rule for pointer and keyboard interaction while loading
**Medium · Bug · [Chart.ts:348](packages/mochart/src/components/Chart.ts#L348), gated at [:1044](packages/mochart/src/components/Chart.ts#L1044)** — **Fixed**

`chartEventHandler` is swapped for `{}` whenever `loading` turns on or the chart loses data.
If the pointer is inside at that moment the real `mouseleave` is never observed and the flag
stays `true` forever. Measured: mouseenter (1 `onChartMouseEnter`) → `loading: true` then
`false` → mouseenter again → **0 callbacks**; the event is misread as a move. With
`followPointer` the tooltip opened before the flip also stays open across the whole loading
period. The host's enter/leave callbacks stay inverted until the pointer leaves once.

**Fix:** reset `this.isMouseWithinChart = false` on the branch that installs the empty handler
map, and in the no-size / no-config early returns.

**Discussed, and the scope widened. The one-line reset above is not the fix.**

The stuck flag is a symptom of dropping the pointer handlers during loading, and asking why they
are dropped turned up no recorded reason and a set of ad-hoc rules that disagree with each other.

**What the states actually do.** `hasChartDataContent` gates the whole plot — axes, series and
tooltip. So there are really only two situations:

| State | Plot / series / tooltip | Legend & title | Pointer handlers | Plot keyboard |
|---|---|---|---|---|
| Normal | rendered | rendered | attached | active |
| **Loading** (data present) | **rendered** | rendered | **dropped** | blocked except Escape |
| No data / 0 categories | not rendered | rendered | dropped | n/a |
| Error | not rendered | rendered | dropped | n/a |
| Config error / no size | nothing rendered | — | — | — |

Loading is the only state that draws a working chart and then disables parts of it. In the no-data
and error states the interactive parts do not exist, so there is nothing to decide. That also
narrows the keyboard gap: during loading the plot is gated but series, slices, legend and title are
not, so Enter on a series still fires its click callback.

**The strategy.** Two things a caller can be given: something keyed to a **series or axis id**,
which comes from the config and survives a data change intact; or something keyed to a **category
position**, which may point at nothing once the new data lands. Loading means the data on screen is
about to be replaced, so:

> While loading, the chart reports but does not commit. Anything keyed to a stable id keeps
> working, anything keyed to a category position is suppressed, and whatever is already open can
> still be dismissed.

| Surface | Keyed to | While loading | Today |
|---|---|---|---|
| Legend filter / focus | series id | keep | keep |
| Tooltip row filter / focus | series id | keep | keep |
| Axis hover focus | axis id | keep | **dropped** |
| Pointer enter / move / leave | transient report | keep | **dropped** |
| Plot click | category position | suppress | suppress |
| Plot arrows / Enter | category position | suppress | suppress |
| Series / slice Enter | payload carries a category index | suppress | **fires** |
| Opening a tooltip, including via `followPointer` | opens at a category | suppress | **opens on hover** |
| Dismissing a tooltip (Escape, close button) | — | keep | keep |
| Tooltip prev/next buttons | category position | keep — operating something already open | keep |
| Title click | nothing | keep | keep |

The existing plot-keyboard rule is already an instance of this: arrows and Enter move or open at a
category and are blocked, Escape dismisses and is allowed. The prev/next buttons are the one
deliberate exception — they move a category position, but on a tooltip that is already open, and
the index is clamped to range.

**Fixed, to the strategy above.** Four changes, all in `Chart.ts`:

- the three motion handlers stay attached while loading; only the click handler is dropped
- the `followPointer` tooltip open is guarded on loading, so hovering no longer opens one
- `onSeriesShapeClick` is guarded on loading — it is the single method both pointer and keyboard
  activation route through, so one guard covers both without threading a flag into the components
- `isMouseWithinChart` is cleared on the no-chart-data branch, which has no motion handlers to keep
  it honest

The stuck flag then fixes itself: with the motion handlers attached, a pointer that leaves during a
load is still seen, so the flag stays accurate instead of latching on.

**One row of the table above was wrong.** Axis hover focus was never dropped during loading — those
handlers live on the axis component, not the chart root, so the chart-root handler map never
governed them. Confirmed by test: that case passes on the unpatched source.

New `test/components/LoadingInteraction.test.ts` covers all three parts of the rule: motion still
reported and paired, a pointer leaving mid-load still seen, clicks and series activation ignored, no
follow-pointer tooltip opened, and axis focus still working. Three of its six fail on the unpatched
source.

Documented in the chart-states guide under "Interaction while loading", including the tooltip
step-button exception and the fact that the loading message itself takes the pointer.

### COMP-5 — leaving a *filtered* tooltip row clears the focused series
**Medium · Bug · [TooltipContent.ts:378](packages/mochart/src/components/TooltipContent.ts#L378)** — **Fixed**

`onSeriesMouseEnter` correctly skips filtered series ([:373](packages/mochart/src/components/TooltipContent.ts#L373)),
but `onSeriesMouseLeave` has no matching guard and unconditionally emits `onFocus({ seriesId: null })`.
The same handlers are wired to `focusin`/`focusout`, so keyboard traversal hits it too. Filter
`S1`, hover the `S0` row (focus `S0`), then move across the struck-through `S1` row: enter emits
nothing (correct) but leave drops `S0`'s focus. The legend gets this right via its `hoverActive`
guard ([Legend.ts:266](packages/mochart/src/components/Legend.ts#L266)).

**Fixed.** The leave now only clears focus when the matching enter actually applied it, using the
same `hoverActive` flag the legend already uses — including for the reason its comment gives: the
filtered flag can change mid-hover, so re-checking it on the way out would be wrong.

The finding overstates the symptom. In its own example the focus had already been cleared a moment
earlier by the previous row's own leave, so nothing extra was lost. The real cost is narrower but
still real: focus set some other way — a click, a plot interaction, or set by the host — was wiped
when the pointer merely crossed a switched-off row, and the host received a needless callback each
time, since nothing compares the new focus against the old.

Test enters and leaves a switched-off row and asserts no focus callback is sent at all; it fails on
the unpatched source.

### COMP-6 — Legend drops keyboard focus to `<body>` when its focused item disappears
**Medium · Bug (a11y) · [Legend.ts:176-220](packages/mochart/src/components/Legend.ts#L176)** — **Fixed**

`SeriesContainer` and `PieSeriesContainer` both snapshot `document.activeElement` before
`sync(...)` and re-focus the inheriting node afterwards. `Legend` computes `effectiveRovingId`
but never restores DOM focus, and its fallback is only `interactiveIds[0]` with no
nearest-neighbour inheritance. Focus item `S1` in a 3-series legend, then update with a config
that drops `S1` → `document.activeElement` becomes `BODY`. Fires on any dynamic series list or
`showInLegend` toggle.

**Fixed.** Copied wholesale from `SeriesContainer`, which already solved this: the tab stop passes
to the next item in config order (falling back to the last), and focus is captured before the item
list is rebuilt and restored afterwards — to the same node if it survived, otherwise to whichever
item inherited the tab stop.

Not merged with [A11Y-3](#a11y-3--keyboard-focus-is-dropped-to-body-when-the-plot-or-tooltip-tab-stops-are-torn-down),
which looks like the same bug. It is the same family but a different fix: that one lives in
`Chart.ts`, and there is often no surviving element to move focus to, so it needs a decision this
one does not.

Test focuses the middle legend item, removes it from the legend, and asserts focus and the tab stop
land on the next item rather than on the page body; it fails on the unpatched source.

### COMP-7 — negative `width`/`height` on the legend icon when `iconBorderSize` exceeds `iconSize`
**Low · Bug · [SeriesColorIcon.ts:193](packages/mochart/src/components/SeriesColorIcon.ts#L193)** — **Fixed**

Both validate as `numberMin(0)` independently, so `shapeSize = iconSize - iconBorderSize` can
go negative and is written straight to the rect: `legend: { iconSize: 4, iconBorderSize: 10,
showIconShapes: false }` renders `<rect width="-6" height="-6">`. Browsers log an error and drop
the element, so the icon vanishes with no diagnostic.

**Fix:** `Math.max(iconSize - iconBorderSize, 0)` (and clamp `symbolSize` likewise), or add a
cross-field validation warning.

**Fixed by clamping.** `shapeSize` is `Math.max(iconSize - iconBorderSize, 0)` and `symbolSize` is
clamped the same way, so `legend: { iconSize: 4, iconBorderSize: 10 }` now emits a zero-size rect
instead of `width="-6" height="-6"`. Taken over the cross-field validation warning because the
clamp matches how the rest of the layout already handles spacing that exceeds its box (see
[LAYOUT-1](#layout-1--negative-widthheight-reach-background-rects-on-small-or-heavily-spaced-charts));
a warning would still leave the icon undrawable.

Covered in `test/layout/NegativeBounds.test.ts`, which already sweeps a rendered chart for rects
with a negative dimension. Verified to bite: without the clamp it reports
`mochart-legend-item-icon -6x-6`. 1604 tests, typecheck and lint pass.

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
**Low · Bug (teardown) · [TooltipContent.ts:171](packages/mochart/src/components/TooltipContent.ts#L171), [:190](packages/mochart/src/components/TooltipContent.ts#L190)** — **Fixed**

The icon `Slot` is created inside the `ElSlot` `init` callback, so each `'aligned' ↔ 'plain'`
key change registers a new region on the renderer while the old one — still holding a mounted
`SeriesColorIcon` — stays in `this.regions`. `ElSlot.clear()` detaches the old container's DOM
but never destroys the child renderer. Unbounded growth for a host that lets users toggle
`tooltip.rightAlignValues`.

**Fix:** create a single `iconSlot` per layout in `create()`, or destroy the previous slot
before reassigning.

**Fixed by destroying the outgoing slot.** The finding's first option — one `iconSlot` created in
`create()` — is not available: the icon's host differs per layout (a `left` span when values are
right-aligned, the row container otherwise), so the slot genuinely has to be rebuilt. Instead
`TooltipSeriesLine.replaceIconSlot` destroys the previous slot before creating the new one, which
tears down the `SeriesColorIcon` it was holding.

That needed one addition to the renderer: `Renderer.releaseRegion`, which destroys a child region and
drops it from `this.regions` so `destroy()` does not visit it twice. It is the general form of what
the finding asked for — a slot that is replaced rather than kept for the renderer's lifetime.

Two tests. `test/render/render.test.ts` covers `releaseRegion` itself: the replaced slot's child is
disposed at replacement, the live one still cascades on destroy, and the released one is not disposed
twice. `test/components/TooltipIconSlot.test.ts` covers the wiring by flipping
`tooltip.rightAlignValues` on a mounted chart. Note the leak was *not* observable through the DOM —
the abandoned icon's markup went with the detached container — so the test asserts the teardown
instead: without the fix `SeriesColorIcon.prototype.destroy` is called 0 times across a flip.

107 files / 1607 tests pass, typecheck and lint clean.

### COMP-10 — `liveRegionNode` retains a detached node after the body is torn down
**Low · Bug · [Chart.ts:1181](packages/mochart/src/components/Chart.ts#L1181)** **[verified]** — **Fixed**

`this.liveRegionNode` is assigned only inside `syncBody`. The error and no-size branches of
`sync()` call `this.body.set(null)`, destroying `ChartBody` without clearing the field — so
the chart holds a reference to a detached `<div>` and subsequent `announceTooltipCategory`
calls write into nothing.

**Fix:** set `this.liveRegionNode = null` alongside `this.body.set(null)` in the three
early-return branches of `sync()`.

**Fixed as recommended.** The three `this.body.set(null)` calls in `sync()` — the config-error, the
no-config error and the loading branch — now go through a `clearBody()` helper that nulls
`liveRegionNode` alongside destroying `ChartBody`. `syncBody` still owns the only assignment, so the
field now tracks the body's lifetime exactly.

No test added, and the reason is worth recording rather than glossing: the defect has no
DOM-observable behaviour. The live region's `<div>` leaves the document either way — it goes with the
destroyed body — and the only difference is whether the chart keeps a reference to the detached node
and writes announcements into it. There is no seam to assert that through from outside the component,
and inventing one would be a worse trade than stating the gap. Note also that coverage shows those
three branches (`Chart.ts` 1047 and 1063-1067) are not exercised by any test today; that is
[TEST-3](#test-3--the-no-data-and-no-series-chart-states-are-never-rendered)'s territory rather than
this finding's.

1614 tests, typecheck and lint pass.

### COMP-11 — pointer payloads use the wrong coordinate frame and break when CSS-scaled
**High · Bug · [Chart.ts:363](packages/mochart/src/components/Chart.ts#L363), [:775](packages/mochart/src/components/Chart.ts#L775)** **[from SOL review]** — **Fixed**

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

**Frame: answered — keep the values, correct the documentation.** `chartX`/`chartY` stay
plot-relative and the JSDoc at [types/chart.ts:5](packages/mochart/src/types/chart.ts#L5) now says
so. Adding the plot offset would have matched the old wording but changed the numbers every
existing host receives on `onChartClick`/`onChartMouseEnter`/`onChartMouseMove`/`onChartMouseLeave`
silently, with no type change to flag it; and `categoryPosition`/`valuePosition` in the same
payload are documented as *plot* pixels, so all four position fields now share one origin.

**The fixture that hid this is fixed too.** `ChartInteraction.test.ts` stubbed *every* bounding
rect to the full chart, collapsing the container and plot frames onto each other — so it asserted
plot-relative values while proving nothing about which frame they were in. The stub now reports
the series-background rect's own geometry, keeping the plot offset real, and a new test asserts
`chartX`/`chartY` and `categoryPosition`/`valuePosition` all read as plot-local. One existing
inverted-plot test had been passing coordinates outside the real plot; it now derives them from
the plot bounds. 57 tests pass in that file, 1545 in the core suite.
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
**Medium · Bug · [Heatmap.ts:107](packages/mochart/src/data/Heatmap.ts#L107), [:146](packages/mochart/src/data/Heatmap.ts#L146)** — **Fixed**

Neither `createHeatmapColorScale` nor `createHeatmap` checks `domain[1] >= domain[0]`. With a
reversed domain, `extent > 0` is false so every value maps to the ramp midpoint and
`clampValue` returns `0` for every cell — a uniform slab of mid-blue that looks like real flat
data. `binValues` throws on exactly this, so the two helpers disagree on the same option name.

**Fixed.** `createHeatmapColorScale` now throws on a backwards domain, matching the wording and
placement of the same guard in `binValues`. `createHeatmap` inherits it, since a domain it derives
itself is never backwards.

The guard belongs in the heatmap helper rather than in the core colour code: core spans each
series' own extent and is behaving correctly — the bad input is a heatmap option.

Two notes on the finding. It says the clamp returns `0`; that is only true for a domain like
`[10, 0]`, and the general symptom is the ramp midpoint. A `NaN` domain end took the same silent
path and is now covered by the same guard.

A flat domain is left alone deliberately — every cell really does have the same value there, and
that behaviour is already tested. Reversing the ramp has its own way to be asked for: swap
`colorMin` and `colorMax`.

Tests cover the backwards domain, a `NaN` end, and that a flat domain still lands on the midpoint;
the first two fail on the unpatched source.

### HELP-5 — `cellPadding` at or above its documented maximum makes the heatmap invisible
**Medium · Bug · [Heatmap.ts:141](packages/mochart/src/data/Heatmap.ts#L141), [:158](packages/mochart/src/data/Heatmap.ts#L158)** — **Fixed**

Documented as "The fraction (0 - 0.5)…" but never range-checked:

- `0.5` (the documented maximum) → band `1.5 → 1.5`, zero height; config validates, chart renders empty.
- `0.6` → `categoryPaddingFraction.inner: 1.2` → validation error → config-error component.
- `-0.1` → inverted bands (rows overlap their neighbours) plus two validation errors.

**Fixed.** Both the behaviour and the documented range were wrong, and the documentation was the
larger error. `createHeatmap` now throws unless `cellPadding` is at least 0 and below 0.5, worded
like the same guard `createCandlestick` uses for its own fractions, and the JSDoc says "0 to under
0.5" instead of "0 - 0.5".

Rejecting is the honest fix rather than clamping. At exactly 0.5 the gap consumes the whole cell in
both directions — the row bands collapse to zero height and the column slots to zero width — so
there is no drawing to salvage. Clamping would silently change what the caller asked for; the
sibling helper already sets the precedent of refusing.

Tests cover 0.5, 0.7 and a negative value throwing, and 0.49 still working; they fail on the
unpatched source. The recipe needed no correction — it mentions the option but states no range.

### HELP-6 — `cumulative` + `normalize: 'density'` produces a curve topping out at `1 / binWidth`
**Medium · Bug · [Histogram.ts:136-148](packages/mochart/src/data/Histogram.ts#L136)** — **Fixed**

The cumulative pass accumulates whatever `normalize` produced. For `'probability'` that is the
CDF (correct, and the only combination tested). For `'density'` it sums densities instead of
density × width:

```
cumulative + probability → 0.2 0.4 0.6 0.8 1     (correct CDF)
cumulative + density     → 0.1 0.2 0.3 0.4 0.5   (should also end at 1)
```

The JSDoc promises density "integrates to 1"; neither it nor the recipe says the combination is
meaningless. Matplotlib's `hist(density=True, cumulative=True)` normalizes the last bin to 1.

**Fixed.** A cumulative density now integrates — each bin contributes `value × bin width` — instead
of summing values that had already been divided by the bin width. The curve ends at 1, as a
cumulative probability should, rather than at `1 / bin width`.

Multiplying by each bin's own width rather than a single shared width costs nothing today, since
bins are equal, and keeps the result correct if unequal bins are ever added.

Tests assert the curve ends at 1, stays monotonic, and matches the cumulative *probability* curve
bin for bin — that last one is the real statement of what a cumulative density is. Two of the three
fail on the unpatched source. Goldens unaffected: the histogram demo uses the default `count` and
no `cumulative`.

**Left alone deliberately:** the default series title still reads "Density" for a cumulative
density, where "Cumulative probability" would be more accurate. That is a visible label change
rather than a maths fix, so it is raised separately rather than folded in here.

### HELP-7 — doji candles (open === close) draw no body at all
**Medium · Missing feature · [Candlestick.ts:342-368](packages/mochart/src/data/Candlestick.ts#L342)** — **Fixed**

`bodyConfigs` never sets `barMinExtent` (default 0), and the bar renderer's default normal-state
`strokeWidth` is also 0 — so when `open === close` the body's `property` and `rangeProperty`
resolve to the same value, the zero-extent path in
[SeriesShapes.ts:322](packages/mochart/src/utils/SeriesShapes.ts#L322) is left unexpanded, and
the candle shows only its wick. `createOhlc` already solves exactly this with
`barMinExtent: tickExtent` ([Ohlc.ts:186](packages/mochart/src/data/Ohlc.ts#L186)) — the
machinery exists and is simply not applied to candlestick bodies. A doji is a standard,
meaningful pattern; it currently reads as a missing candle.

**Fixed: filled bodies get a 2px floor; hollow up bodies are left alone.**

Three corrections to the finding along the way. The colour is not ambiguous — equal open and close is
classified as *up*. Hollow **up** bodies already draw, because their 2px outline survives the
collapse; it is the filled bodies that vanish, which is both bodies normally and the *down* body in
hollow mode. And OHLC needs nothing: it already sets the same 2px floor on its open/close ticks, with
a comment saying why.

`barMinExtent` was the right instrument — it is per-series, and the body is its own series, so the
floor lands on the bodies only and not on the wicks or the volume bars. A zero-length wick genuinely
means no range above or below the body, so it should keep drawing nothing.

**Why not apply it to every body uniformly.** The expansion is symmetric about the price, so a filled
2px body draws a 2px line — but a hollow body carries a 2px stroke centred on each edge, so the same
floor would draw roughly 4px, and would thicken hollow dojis that already render correctly today.
Excluding them keeps every doji at about 2px and changes nothing that currently works.

2px rather than 1px so the three places agree: the filled body, the hollow outline, and the OHLC
tick.

Tests pin which series get the floor and which do not, and both fail on the unpatched source. The
generated demo configs were regenerated; no golden snapshot moved, because no demo has a body under
2px — the floor is inert until a real doji appears.

### HELP-8 — `createWaterfall` makes the caller hand-mirror a `base` it already knows
**Medium · Missing feature · [Waterfall.ts:35-43](packages/mochart/src/data/Waterfall.ts#L35), [:156](packages/mochart/src/data/Waterfall.ts#L156)** — **Fixed**

`createWaterfall` returns `{ steps, data, categoryAxis, series }` only. Its own JSDoc and
[recipes/waterfall.md:36](packages/mochart-docs/recipes/waterfall.md#L36) instruct the reader to
copy `base` onto the value axis by hand. Forget it and the axis `base` default is `NONE` for a
stackless axis, so bars grow from and animate to the domain minimum instead of the waterfall's
base — silently, with subtly wrong enter/leave animation and label placement. `createHeatmap`
already returns a `valueAxisConfig` fragment; `createCandlestick`/`createOhlc` return `valueAxes`.

**Fixed.** `createWaterfall` now returns `valueAxes: [{ base }]`, so a caller spreads it like the
other fragments instead of knowing to write the base by hand. Named `valueAxes` to match the real
config key — which is also what `createCandlestick` and `createOhlc` return. `createHeatmap` returns
`valueAxisConfig` for the same thing, and unifying that is
[HELP-10](#help-10--sibling-helpers-disagree-on-the-value-axis-fragments-name).

Additive, so nothing breaks.

**What it actually fixes is not what the finding says.** Waterfall bars are floating — they carry
both ends — so they never grew from the axis floor and the chart did not look broken. The real
effect shows in the axis: a margin is only added to an end when that end is not the base, so with no
base configured the axis padded *below zero*. The waterfall demo's zero line floated about 22px above
the bottom of the plot, with an unlabelled tick beneath it that had to be hidden as a collision.
With the base returned and used, the axis runs exactly 0 to 740, the zero line sits on the floor, and
the redundant tick is gone — 9 ticks instead of 10.

Both call sites were writing `valueAxes` by hand and neither set the base, which is the gap in
miniature. Both now spread the fragment and merge their own title over it.

The recipe's "when it's not 0" is corrected: the default is `null`, never `0`, so the base always
needed setting — the condition made it sound optional.

Seven waterfall snapshots moved, all showing the axis change above. Note for next time: changing a
helper's return type means rebuilding the library's type declarations, or the docs package
typechecks against a stale copy and fails.

### HELP-9 — the heatmap `missingColor` option is entirely undocumented
**Medium · Doc gap · [Heatmap.ts:59-65](packages/mochart/src/data/Heatmap.ts#L59) vs [recipes/heatmap.md:46](packages/mochart-docs/recipes/heatmap.md#L46)** — **Fixed**

`missingColor` turns missing cells from grid gaps into full bands painted with the row series'
`colorScale.missing`. The string appears nowhere in `packages/mochart-docs` — not the recipe,
not `reference/api.md`, not the example. The recipe presents the gap as the sole behaviour. The
"no data ≠ low value" distinction — the whole reason the option exists — is invisible to readers.

**Fixed.** The heatmap recipe's missing-cells bullet now covers `missingColor` alongside the gap
behaviour, carrying over the guidance already in the source: pick a colour clearly off the ramp so a
missing cell reads as "no data" rather than as a value. The same bullet also picked up the
`cellPadding` upper bound from [HELP-5](#help-5--cellpadding-at-or-above-its-documented-maximum-makes-the-heatmap-invisible).

Two corrections to the finding. The source JSDoc needed no change — it was already the fullest
description of the option, and it feeds the shipped type declarations. And `reference/api.md` does
not enumerate helper options at all: `cellPadding`, `columnLabels` and `domain` are absent from it
too, so adding `missingColor` there alone would have been inconsistent rather than a fix.

Worth knowing for the next one of these: no existing check would have caught it. The docs coverage
check ratchets *exported names* and the members of nine named prop interfaces; helper option types
are not in that list, so an undocumented helper option passes. Closing that properly means adding
the helper option interfaces to the check, which is a larger piece of work than this finding.

### HELP-10 — sibling helpers disagree on the value-axis fragment's name and shape
**Low · Inconsistency · [Heatmap.ts:83](packages/mochart/src/data/Heatmap.ts#L83) vs [Candlestick.ts:130](packages/mochart/src/data/Candlestick.ts#L130)** — **Fixed**

`HeatmapData` exposes `valueAxisConfig: Partial<ValueAxisConfig>` (singular);
`CandlestickData`/`OhlcData` expose `valueAxes?: Partial<ValueAxisConfig>[]` (array). Two names
and two shapes for the same concept across four sibling helpers.
[reference/api.md:153](packages/mochart-docs/reference/api.md#L153) lists both without comment.

**Fixed.** `createHeatmap` now returns `valueAxes: [valueAxisConfig]` — the same key the real config
uses, and the same key `createCandlestick`, `createOhlc` and (since
[HELP-8](#help-8--createwaterfall-makes-the-caller-hand-mirror-a-base-it-already-knows))
`createWaterfall` return. Contents unchanged; only the name and the wrapping array.

All four helpers now hand back the value axis under one key, so a caller spreads the same shape
whichever they use.

Breaking for anyone destructuring `valueAxisConfig`, and it breaks at runtime rather than at
compile time — the property is simply gone. Taken now on the basis that the API is not final.

Call sites updated: the docs example (its wrapping array is now redundant), the demo generator, and
two test files. No golden snapshot moved — the value is identical, only the key changed.

### HELP-11 — `reference/api.md` overstates the helper type surface
**Low · Doc inconsistency · [reference/api.md:154](packages/mochart-docs/reference/api.md#L154), [:190](packages/mochart-docs/reference/api.md#L190)** — **Fixed**

Two slips: the return-shape comments for `createCandlestick`/`createOhlc` omit the optional
`valueAxes` the `volume` option adds (which the prose three lines below describes); and "every
helper's item, option, and result shapes are exported as named types" is untrue —
`CreatePieOptions.tooltipValues` is typed `PieTooltipLabelType` and
`CreateHeatmapColorScaleOptions.colorInterpolation` is typed `ColorInterpolation`, neither
reachable from the package entry. Literal option values still work via contextual typing, but a
TS host cannot type a wrapper prop that forwards them.

**Fix:** add `valueAxes?` to the two comments; export `ColorInterpolation`, `PieLabelType` and
`PieTooltipLabelType` from `src/index.ts` (see [API-3](#api-3--21-config-union-types-are-named-in-the-public-types-but-cannot-be-imported)).

**Fixed; half of it had already been resolved elsewhere.** The two return-shape comments now read
`{ candles, data, categoryAxis, series, valueAxes? }`, matching what `createCandlestick` and
`createOhlc` actually return once the `volume` option adds the pane
([Candlestick.ts:413](packages/mochart/src/data/Candlestick.ts#L413)) and agreeing with the prose three
lines below.

The second slip is no longer true: `ColorInterpolation`, `PieLabelType` and `PieTooltipLabelType` are
all exported from `src/index.ts` (lines 55-56), and the Constants section already lists them among the
exported unions — that landed with
[API-3](#api-3--21-config-union-types-are-named-in-the-public-types-but-cannot-be-imported). What was
still missing was the connection: the helper-types paragraph claimed every option shape is exported
without saying that the two union-typed members get their names from the constants list. That sentence
now says so and links there, which is what a TS host forwarding one of those props needs to know.

Docs site builds clean, no dead anchors.

### HELP-12 — two valid large pie values overflow the total and collapse every slice
**Low · Bug · [Pie.ts:64](packages/mochart/src/data/Pie.ts#L64), [PieData.ts:26](packages/mochart/src/data/PieData.ts#L26)** **[from SOL review]** — **Fixed**

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

**Fixed, with the rescale behind an overflow check rather than unconditional.** `PieData.ts` gained a shared
`computeSliceFractions(values)` — clamp, sum, divide, with an overflow branch that rescales by the maximum
before summing — and both entry points now delegate to it: `getPieSliceFractions` is a one-line call, and
`computePieFractions` uses it too, so the two paths the finding names are literally one implementation.
`createPie` also stopped re-clamping inline and builds its data row from the clamped values it already gets
back.

**Contract at the boundary: the fractions are always correct; `total` is `Infinity` when the true sum is not
representable.** Degrading is the bug — a well-defined 50/50 pie rendered blank with no error. Rejecting would
be wrong, since every input is individually valid and the ratios are exactly computable. And clamping `total`
to `Number.MAX_VALUE` would be a lie in the one field a caller reads as "the sum", which also feeds the pie
centre total; `Infinity` is IEEE's own name for that condition, and the existing `total <= 0` guard in
`getPieSliceAngles` passes it through.

**Nothing that already works changes**, and that is why the rescale is conditional. Measured over 200,000
random inputs, rescaling unconditionally moves the last bit of the fractions in **173,384** of them —
including `[62, 20, 18]` → `0.18000000000000002`, which would have broken an existing exact assertion and
shifted every pie golden's angles. The branch is unreachable for any input whose total is finite.

Reproduction before and after, through `src`: `[MAX, MAX]`, `[MAX, MAX/2]`, `[MAX*0.6, MAX*0.6]` and
`[1e308, 1e308, 1e308]` all gave `total=Infinity, fractions=[0, 0, …]` on both paths; they now give the
correct `[0.5, 0.5]`, `[0.667, 0.333]`, `[0.5, 0.5]` and `[1/3, 1/3, 1/3]`. `[MAX/2, MAX/2]`, `[MAX, 1]` and
subnormals are byte-identical to before.

Six tests across the two files, four of which fail with the branch removed. The two `MAX/2` cases pass either
way by design — they are the guard proving the plain path is untouched. No golden moved, verified by running
the whole golden suite. 32 tests in the two files, core's suite, typecheck and lint clean.

One downstream consequence, pre-existing and outside this fix: `PieSeriesContainer` sums tweened slice values
itself for the centre total, so an overflowing pie with `showCenterTotal: true` prints `Infinity` — `d3-format`
passes it through for every specifier. Rendering `∞` or suppressing the label there is a `PieCenter` change.

The finding's suggested fix would have needed the same conditioning; and there is no partial-sum ordering
hazard to guard against, since for all-positive values the partial sums are monotone, so one can only overflow
when the true total does.

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
**Medium · Inconsistency · [types/config.ts:1235](packages/mochart/src/types/config.ts#L1235) vs [validation/tooltipConfig.ts:27](packages/mochart/src/config/validation/tooltipConfig.ts#L27)** **[verified]** — **Fixed**

This is the **only** key in the whole config that the TS types declare and the other three
surfaces do not. Defaults, validation and docs deliberately model the tooltip box as a
five-member CSS style; the type reuses the six-member SVG `Style`.

```ts
tooltip: { backgroundStyle: { strokeDashArray: '5, 5' } }   // compiles
→ valid: false, 'tooltip - backgroundStyle - had 1 invalid properties: strokeDashArray'
```

**Fixed by narrowing the type, not by widening the validator.** The tooltip renders its background
as a css border and never reads `strokeDashArray`, so allowing the key would have added one with no
effect. A new `CssStyle` — `Style` without `strokeDashArray` — now types
`TooltipConfig.backgroundStyle`, matching the five-key validator it is checked against.

Checked that this is the only place: `cssStyle()` has exactly one caller, and the other five
`backgroundStyle` fields use the full `style()` validator, so they keep `Style`.

One correction to the mechanism described above. The shape validator itself allows extra keys; the
rejection comes from the unknown-key walk, which reports a *warning*. It only becomes
`valid: false` because validation is strict by default — so the config was invalid in the default
configuration, but not in every configuration.

Two tests in `publicTypes.test.ts`, which is typechecked rather than only run: one writing the five
accepted keys, one with `@ts-expect-error` on `strokeDashArray`. On the unpatched types that
directive goes unused and the typecheck fails, so the test pins the narrowing rather than merely
passing.

### CONFIG-5 — six places where the types and the runtime contract disagree
**Medium · Inconsistency** — **Fixed**

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

Five of the six rows fixed by widening or narrowing the type to match the
validators; the sixth was already correct.

- `categoryAxis.min`/`max` → `number | string | Auto` and
  `softMin`/`softMax` → `number | string | null`. The runtime was right: a linear
  date axis takes a timestamp or an ISO string, exactly like `thresholds[].value`.
  New docs details name both date forms and the ordinal `"auto"`-only rule.
- `ValueAxisConfig.scale` → `'linear'` and `ValueAxisConfig.type` → `'number'`
  (the latter was too wide by two values, `'string'` **and** `'date'`).
- `TooltipConfig.filteredValueCharacter` → `string | null`, which the docs already
  described.

Rows 1–2 needed a structural step the finding missed: those four bounds live on the
shared `AxisConfigBase`, not on `CategoryAxisConfig`, so widening the base alone
would have made the *value* axis too wide. `ValueAxisConfig` now re-declares all
four in the numeric-only form. Widening the base also made
`getAxisValueCreator` in `data/AxisDomainData.ts` the only compile error in the
package; it now takes `number | string`, and the emitted JS is unchanged.

**Row 6, `LinearGradientConfig.stops`, was left alone deliberately.**
`MochartInputConfig` wraps every section in `DeepPartial`, so `{ id: 'G' }`
compiles whether or not `stops` is optional — the stated symptom cannot be fixed
from the interface. And it should not be: `linearGradientDefaults` may supply the
stops for every entry, so a required per-entry `stops` would be a *new* too-narrow
type. Optional-in-the-type is also how the only other two no-default properties,
`categoryAxis.property` and `series.property`, are declared, with the requirement
carried by validation.

New `test/config/typeContract.test.ts`, 13 tests, including the ratchet the finding
asked for. `checkKeyIntegrity` could not go in `packages/mochart/scripts/`, so it is
a test: it walks all 18 section interfaces with the TypeScript checker against that
section's validators — category-axis conditionals evaluated under all five
type/scale branches — and reports four classes of disagreement. Bite proof with the
seven annotations reverted: the ratchet reports exactly 8 mismatches (the four
bounds, `scale`, `type` twice, `filteredValueCharacter`) and `tsc` on the test file
fails with 8 errors.

Two mismatches remain that TypeScript cannot express, so the ratchet is
deliberately silent on them: `filteredValueCharacter` accepts only a
*one-character* string, and the category-axis bounds accept only `"auto"`/`null` on
an ordinal scale. The optionality rule also needed two documented exceptions,
`series.axis` and `seriesStacks.axis`, whose conditional default applies only when
there is exactly one value axis.

One correction: the cited `:2103` for `ValueAxisConfig.scale` is actually
`CategoryAxisConfig.scale`, whose `Scale` type is correct and stays.

Whole-package suite green: 111 files / 1683 tests, typecheck, lint,
`generate-docs` and `generateJsdoc --check` all clean.

### CONFIG-6 — the documented migration path is never wired into any entry point
**Medium · Doc gap · [helper/index.ts:6-11](packages/mochart/src/config/helper/index.ts#L6), [DefaultChartInput.ts:69](packages/mochart/src/chart/DefaultChartInput.ts#L69)** — **Fixed**

The docs tell users to store `version` "so `migrateConfig` can upgrade them if the format
changes", and describe `createDefaultChart` as one that "validates and defaults the raw config
for you on every update". Neither `enhanceConfig` nor `DefaultChartInput` calls `migrateConfig` —
the only in-repo callers are the demos. No doc page says the user must call it.

Latent today (`CONFIG_VERSION` is the initial `'1.0.0'` and there are no steps), but the moment a
step is added, a stored `version: '1.0.0'` config passed to `createDefaultChart` fails validation
instead of migrating — exactly the scenario the docs promise is handled.

**Fixed: migration now runs at the start of `enhanceConfig`.** That is the point where a stored
config enters the chart, so an old config is brought current before defaults or validation see it.
The demo path already did this by hand — `mochartDemoConfig` calls `migrateConfig` before the
low-level three — which is why the gap never showed in practice.

The lower-level `getDefaults` / `validateConfig` / `buildMochartConfig` deliberately do **not**
migrate. The editor validates the text in the buffer to draw error squiggles, and migrating there
would report errors about a document the author is not looking at.

**Two arguments against wiring it in were wrong and are recorded here so they are not made again.**
That it would re-run per render: `enhanceConfig` already computes every section's defaults, validates
and rebuilds on every config change, so migration steps are trivial beside that, and they no-op once
the config is current. That it would mutate a config the host still holds: it does not — every step
returns a copy.

The deciding argument is the one the version field exists for. If nothing reads the version, a host
upgrading the library has no path for configs already saved, and the only remedy is knowing to call
`migrateConfig` first — exactly the knowledge a host does not have.

Migration is a no-op today (1.0.0 is the first format, so there are no steps), which makes this the
cheapest possible moment to get the wiring right.

**Type note.** `enhanceConfig` still declares the *current* format. A stored config read from JSON is
untyped, so nothing complains; only a hand-written literal carrying a stale property errors, which is
a typo and should. There is no type for an older format and there cannot be one without shipping
every historical shape forever — a question for whoever adds the second format version.

Tests: the migration suite gained the `undefined → current` branch it now depends on, plus
non-mutation and non-object cases; `enhanceConfig` is asserted to stamp a versionless config and to
leave the caller's object alone. Docs updated in the config-model guide and the API reference.

### CONFIG-7 — array-element shapes have no documentation in the config reference
**Medium · Doc gap · [configReferenceModel.ts:660-675](packages/mochart/scripts/configReferenceModel.ts#L660), [renderSection.ts:75](packages/mochart-docs/.vitepress/lib/renderSection.ts#L75)** — **Fixed**

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

**Fixed at the model, so the reference now documents every array-element shape and cannot lose one again.**
`buildPropertyDoc` walks `validator.itemValidator?.nestedValues` into `property.properties`, flagged
`itemShape: true`, and `checkLevelIntegrity` recurses into those under a `parent[].member` path — so an
element member can no longer ship without a description, or without a default where entry defaults exist. A
new `SectionSource.itemDefaults` supplies the threshold entry defaults, so threshold members document their
real values rather than nothing.

Covered now: `valueAxes.thresholds` and `categoryAxis.thresholds` (ten members plus their nested style and
margin members), `valueAxes.ticks` (two) and `linearGradients.stops` / `radialGradients.stops` (three each) —
each with description, default or required marker, validation rule, stable anchor and usage links. New prose
was needed only for `ticks` and `stops`; `thresholds` already had a full nested description map in
`docs/axisConfig.ts` that was simply unreachable, and the new walk validated it on its first run.

Two related gaps closed along the way. `missingDefaultWhitelist` entries now say `'required'` or `'optional'`
rather than `true`, which feeds `PropertyDoc.required` and `SectionDoc.requiredKeys` — so the docs site's
"every property is optional except…" sentence is driven off the model instead of a hard-coded
`series`/`categoryAxis` pair, and the gradient pages stop claiming every property is optional when `stops` is
required. And `ThresholdConfig`, `ValueAxisTick` and `GradientStop` are now generated by `generate-jsdoc`
rather than hand-written, so their prose has one source.

The docs site renders element members as `stops[].offset` under bracket-free anchors, explains that heading
form where a section has one, and the usage index walks array entries so element members collect their
"Used in" links. Generated `reference/linearGradients` now reads:

```
### stops {#linearGradients.stops}
- **Required:** a value must be given (there is no default)
#### stops[].offset {#linearGradients.stops.offset}
The position of the stop, as a fraction (0 - 1) of the length of the gradient.
```

and the built page carries `<h4 id="linearGradients.stops.offset">stops[].offset</h4>`.

`generate-docs` exits 0, core's 109 files / 1647 tests pass with `jsdocSync` among them, the docs package's own
checks pass (41 examples, 230 exports, 18 sections), `@mochart/editor` typechecks and its 25 tests pass since
it embeds the model, and the site builds.

Corrections to the finding: `GradientStop` had no JSDoc at all, so its members were undocumented everywhere
rather than documented-but-unreachable; `ThresholdConfig` has ten members, not eleven; and the ~2,000-character
`arrayOf` validator message is still on the Validation line — the fix adds per-member entries beside it, since
shortening it means changing the validators.

### CONFIG-8 — `ignore` works on five list sections but is typed, validated and documented on one
**Low · Inconsistency · [core/mochartConfig.ts:138](packages/mochart/src/config/core/mochartConfig.ts#L138)** **[verified]** — **Fixed**

`applyDefaults` runs `filterConfigs` (`config.ignore !== true`) over *every* array section —
`valueAxes`, `seriesGroups`, `seriesStacks`, `linearGradients`, `radialGradients` as well as
`series` — but `ignore` is declared only on `SeriesConfig`, validated only in `seriesConfig.ts`,
and documented only in `docs/seriesConfig.ts`. `valueAxes: [{id:'a'},{id:'b',ignore:true}]`
works at runtime (verified: built config has only `a`) but `MochartInputConfig` rejects it at
compile time, and `seriesStacks: [{id:'s', ignore:false}]` produces a spurious "had 1 invalid
properties" warning.

**Fix:** either add `ignore` to the other five entry types (types + `validators.boolean()` +
docs), or restrict `filterConfig` to the `series` section.

**Fixed by making the declared surface match the runtime, not by narrowing the runtime.** `ignore` is
now typed, validated, defaulted and documented on all five remaining list sections — `valueAxes`,
`seriesGroups`, `seriesStacks`, `linearGradients`, `radialGradients` — alongside `series`: a member on
each interface in `types/config.ts`, `validators.boolean()` in each validation module, `ignore: false`
in each defaults module, and a description in each docs module, with the generated JSDoc and
`mochart-docs.html` regenerated from those.

The finding's other option — restricting `filterConfig` to `series` — would have deleted working
behaviour. `applyDefaults` has always filtered every array section, and `ignore` on a value axis or a
gradient is useful for the same reason it is useful on a series: keeping an entry in a stored config
while disabling it. The defect was that the surface lied about it, not that the behaviour was wrong.

Two tests in `test/config/core.test.ts` sweep all five sections: an ignored entry is dropped from the
built config, and `ignore: false` no longer produces the spurious "had 1 invalid properties" warning.
The second bites — removing the validator from one section brings the warning straight back. The
warning assertion is scoped to `ignore` rather than overall validity, because a gradient entry needs
more than an `id` to be valid and that is unrelated.

Core's config and data suites pass (605 tests), typecheck and lint clean on the touched files.

### CONFIG-9 — `validateConfig`'s `strict` parameter is undocumented
**Low · Doc gap · [validation/mochartConfig.ts:196](packages/mochart/src/config/validation/mochartConfig.ts#L196) vs [reference/api.md:113](packages/mochart-docs/reference/api.md#L113)** — **Fixed**

Both exported validators take a third `strict = true` argument that flips whether warnings
invalidate the config. The reference shows only the two-argument form.
[guide/config-model.md:160](packages/mochart-docs/guide/config-model.md#L160) says "a config with
warnings is rejected in strict mode" without saying the mode is switchable — so a host that wants
to tolerate unknown keys (a live-preview config editor, say) has no way to discover
`validateConfig(config, defaults, false)` short of reading the `.d.ts`.

**Fix:** add the parameter to the `reference/api.md` signature block and one line to the guide bullet.

**Fixed in both places.** `reference/api.md`'s Config helpers block now shows the third argument on
both `validateConfig` and `validateConfigDetailed`, with a paragraph saying `strict` defaults to
`true`, that the chart entry points use that default, and that `false` keeps a config valid while
still collecting its warnings — naming the live-preview editor case the finding identifies.
`guide/config-model.md`'s unknown-properties bullet now says strict mode is the default and gives the
call form for turning it off.

Docs site builds clean.

### CONFIG-10 — axis-bounds validation lives in `mochartConfig.ts`, away from the axis validators
**Low · Inconsistency · [validation/mochartConfig.ts:547,565,585](packages/mochart/src/config/validation/mochartConfig.ts#L547)** — **Fixed**

*Found while implementing ANIM-1 part 1, not by either review pass.*

The `min <= max` check added there put three axis-specific helpers — `validateAxisBounds`,
`checkAxisBounds` and `boundValue` — in the whole-config validator, while every other axis
validator sits in [`axisConfig.ts`](packages/mochart/src/config/validation/axisConfig.ts). The
placement is defensible on one reading: the check is cross-property, and `mochartConfig.ts` is
where the other cross-property checks (`validateReferences`, `validateFollowSeries`) live. But
those span *sections*, whereas this one never looks outside a single axis, so the fault line it
sits on is not the one that put it there.

`boundValue` is also the seventh copy of the coerce-a-Date-to-a-number idea catalogued in
[DATA-7](#data-7--six-near-copies-of-coerce-a-date-to-a-comparable-number), and the one most
likely to drift from the parsing the axis itself does.

**Fix:** move the three into `axisConfig.ts` and call them from the section validator, or make the
cross-property hook per-section so an axis validates its own bounds. Either way `boundValue`
should come from whatever DATA-7 settles on rather than being a seventh variant.

**Fixed by moving the helpers to the fault line they belong on.** `validateAxisBounds` and its private
`checkAxisBounds` now live in `validation/axisConfig.ts` beside every other axis validator, with
`getAxisBoundsMessage` moved there too since it is axis-specific and nothing outside imported it.
`validation/mochartConfig.ts` imports and calls `validateAxisBounds` from the same place it calls the
other cross-property checks, so the ordering of validation is unchanged.

`boundValue` went to `config/validation/validators.ts`, exactly where
[DATA-7](#data-7--six-near-copies-of-coerce-a-date-to-a-comparable-number) said the config-side
date-coercion copy belongs — beside the existing non-validator predicates — rather than staying a
seventh private variant inside the whole-config validator. It is exported from there and imported by
`axisConfig`, so the next config-side bound check (`softMin`/`softMax`, threshold values,
`ticks[].value`) has one to reuse.

One supporting change: `messages.ts`'s `ConfigObject` type and `isConfigObject` predicate are now
exported, so the moved code shares them instead of `mochartConfig.ts`'s identical private
`ConfigRecord`/`isConfigRecord`. That also avoids a circular import — `axisConfig` must not import from
the validator that imports it.

Behaviour is identical: 263 config tests pass unchanged, typecheck, lint and deadcode clean.

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
**Medium · Inconsistency · [types/index.ts:1](packages/mochart/src/types/index.ts#L1)** — **Fixed**

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

Fixed by stopping the wildcard and enumerating. 59 names left the root export table
(248 root exports, down from 307), and 3 of them turned out to be dead code and are
gone from the codebase.

**The wildcard finding, confirmed with a reason the finding did not state.**
`src/types/index.ts` was five `export type *` lines plus one explicit 31-name list for
`animation`. That list is not curation — `animation.ts` re-aliases six names that also
exist in `data.ts`, so a sixth wildcard would have been a duplicate-export error. The
list exists to dodge that collision. So **none of these were deliberate decisions.**
`checkApiCoverage.ts` then exempts everything under `src/types/` from the docs-page
requirement "because that surface is the generated config reference / the `.d.ts`" —
an exemption written for `config.ts` that the wildcards silently extended to the whole
layout and tween pipeline. `config.ts` keeps its wildcard (all 44 of its types are
config-model types the generated reference covers); `geometry`, `data`, `chart` and
`animation` are now explicit lists with a header comment naming the internal surface.

The test for "kept" was reachability from a *published* signature — a prop, a callback
payload, a documented extension point, or a binding's prop type — resolved with the
TypeScript checker over the emitted `.d.ts`, not from names.

**Kept:** `Bounds` (used by `onSeriesLayoutBoundsChange` and imported by name in all
five bindings), `Size`/`MarginPadding`/`InnerOuter` (the declared types of ~10 config
members), `DataProvider`/`CategoryValue`/`DataRow`, the 13 prop/callback/factory types
in `chart.ts` that the generated `api-reference.json` reads, and the whole
`ChartData`/`FocusData` chain — 15 names — because `ChartDataSource.chartData` and
`.focusData` are documented in `reference/api.md`, so those shapes are already pinned
contracts. Removing the member names buys no refactor freedom and costs a host
implementing the interface the ability to write helper signatures.

**Labelled internal:** all 14 of `layout.ts`, 28 of the 31 `animation.ts` names (every
tween delta type), 15 `data.ts` types (`StackData`, `AxisData`, `AxisScale`,
`AxisTick`, `SeriesPositionData`, `ClippedEdges`, …), `TextBounds`, and
`ChartDomAccessors` — which already carried an `internalInterfaces` reason in
`scripts/apiReferenceModel.ts`, so the barrel was contradicting its own label.

**Deleted:** `AnimationCategoryData`, `AnimationSeriesDataSet`,
`AnimationSeriesData` — pure aliases with no use anywhere in core, which knip flagged
the moment the barrel stopped re-exporting them.

**The leak is narrowed, not closed, and the finding's "Fix:" over-promises there.**
`Chart`, `Legend`, `Crosshair` and `Tooltip` are documented advanced exports and their
props are declared with these types. Walking the reachable `.d.ts` closure from
`index.d.ts` (43 of 204 emitted files): **37 of the 59 left the published closure
entirely**, including all 28 tween delta types — the exact block the finding named.
**22 remain**, pulled in by five import lines in those four component `.d.ts` files.
Closing them means unexporting the four components, which `reference/api.md`
deliberately publishes — a bigger refactor than this finding justifies. They are now
in the `EnhancedMochartConfig` category: declared, `.d.ts`-documented, not importable
by name. A host embedding a component passes it the values the controllers produce; it
can no longer annotate its own code with the pipeline types, which is the refactor
freedom the finding was after. `reference/api.md` gained a **"What is not exported"**
subsection stating that policy.

Corrections to the finding: **"~55" is wrong on both sides** — 59 names were
removable, and its arithmetic double-counted the animation block, which already held 3
names that must stay (`FocusData`, `FocusPercentage`, `FocusPercentageMap`) and 3 that
were dead, while missing `TextBounds`, `ChartDomAccessors` and 12 of the 15 `data.ts`
internals. "None is documented in `reference/api.md`" is right but misleading:
`ChartData` and `FocusData` were undocumented *by name* while being the declared types
of two documented `ChartDataSource` members — a doc gap, not a case for removal, and
now fixed. And both of its concrete suggestions would have broken that documented
contract: "drop the animation block" and "narrow `data.ts` to what `DataProvider`
consumers need" — `DataProvider` needs only `CategoryValue`; it is `ChartDataSource`
that requires the 15-name `ChartData` chain.

Ratchet: `test/config/publicTypes.test.ts` (API-1's typecheck-time surface test) gained
an API-2 half — a real `DataProvider` and a real `ChartDataSource` whose signatures
name all 28 kept types, so dropping one fails `typecheck`, plus one
`@ts-expect-error` per source file listing that file's internals, so restoring a
wildcard makes the directive unused and fails. Verified biting: a probe with a
still-exported name produced `error TS2578: Unused '@ts-expect-error' directive`.

Gates: repo-wide typecheck clean; `deadcode` clean after the three deletions;
120 files / 1778 tests pass; docs gates green (41 examples, 233 exports, 18 sections);
`build:types` clean with the export-table diff above.

### API-3 — crosshair elements get unnamespaced CSS classes
**Medium · Bug · [ChartDom.ts:69](packages/mochart/src/utils/ChartDom.ts#L69)** — **Fixed**

`crosshairCategoryLines: 'crosshair-category-lines'`, `crosshairSeriesLines`, `crosshairLine` —
the only three of ~90 entries without the `mochart-` prefix. `Crosshair.ts` writes them straight
onto the rendered SVG, so a host page with any rule matching `.crosshair-line` restyles the chart.
The e2e suite already has to qualify them
([interactions.spec.ts:26](packages/mochart-demo-basic/e2e/interactions.spec.ts#L26)).

**Fixed:** renamed to `mochart-crosshair-*`, with the six core assertions and two e2e selectors
updated and goldens regenerated. The regeneration touched 418 files but exactly two lines each —
the `crosshair-category-lines` and `crosshair-series-lines` group attributes. `crosshair-line`
appears in no golden, since crosshairs only draw on interaction.

`test/utils/ChartDom.test.ts` (added for [API-4](#api-4--mochartcssclasses-values-are-not-all-class-names-contradicting-the-api-reference))
now asserts every token in the map carries the `mochart-` prefix, so a new unprefixed class fails
the suite.

### API-4 — `mochartCssClasses` values are not all class names, contradicting the API reference
**Medium · Doc gap · [reference/api.md:212](packages/mochart-docs/reference/api.md#L212)** — **Fixed**

api.md says the map gives "the CSS class the renderer puts on it … useful for targeted CSS
overrides and DOM queries". In fact 17 of the 95 entries are a base class *plus an id prefix* in
one string: `series: 'mochart-series mochart-series-'`. So `'.' + mochartCssClasses.series` yields
the selector `.mochart-series mochart-series-`, which silently matches nothing. Core itself works
around this with `.split(' ')[0]`.

(The finding also credited `@mochart/export` with splitting. It does call `split`, but only on
`chart`, `crosshair` and `titleTextRaw` — all single-token values — so those are no-ops. Every
real workaround is in core: `ChartDom.ts:117,129,141` and `AxisTickLabels.ts:229`.)

**Fixed:** documented the convention in api.md rather than reshaping the map, since the compound
values are what the renderer writes to `class` and splitting the published map would break every
caller. The "Styling hooks" section now shows `split(' ')` for a selector and `+ id` for the
per-item class, and names `chartError` (`'mochart-chart mochart-chart-error'`) as the one value
that is two complete classes instead. `test/utils/ChartDom.test.ts` pins the shape so a new entry
cannot contradict the description; it also asserts every token carries the `mochart-` prefix, with
the three crosshair classes from **API-3** listed as the known exceptions.

### API-5 — the core README omits all seven chart-shape helpers and the pie chart type
**Medium · Doc gap · [packages/mochart/README.md:12](packages/mochart/README.md#L12)** — **Fixed**

The npm landing page never mentions `createHistogram`, `createWaterfall`, `createHeatmap`,
`createCandlestick`, `createOhlc`, `createPie`, `createSparklineConfig` or the five lower-level
companions — 12 public exports and an entire section of `reference/api.md`. The Features list
still says "**Renderers**: `bar`, `line`, and `area` series", with no mention that pie/donut is a
supported chart type. READMEs are the one documentation surface with no CI ratchet
([checkApiCoverage.ts:57](packages/mochart-docs/scripts/checkApiCoverage.ts#L57) scans only
`index.md`, `guide/`, `reference/`, `recipes/`).

**Fixed.** A "Chart helpers" section in the core README now names all twelve exports — the seven
factories and the five companions — with one line each and a pointer to the full reference. The
Features list also mentions pie and donut, which it did not.

One correction: pie was not entirely absent. The README already covered `chart.type: 'pie'`,
`onSliceClick` and pie accessibility; what was missing was pie as a chart *type* in the feature list
and any mention of `createPie`.

No check covers README content — the docs coverage check reads only the docs site's own pages — so
this stayed green while twelve public exports went unmentioned. Making the README part of that check
would then demand a mention of every export, which is probably not wanted; a narrower assertion that
the seven factory names appear would be the cheap version if this recurs.

### API-6 — `MochartConfig` omits `version`, which the built config carries at runtime
**Medium · Inconsistency · [types/config.ts:3009](packages/mochart/src/types/config.ts#L3009)** — **Fixed**

`MochartInputConfig.version?: string` exists but `MochartConfig` has no `version`. `applyDefaults`
spreads the input config, so `enhanceConfig({version:'1.0.0', …}).version === '1.0.0'` at runtime
while TypeScript says the property does not exist. Round-tripping an enhanced config back out —
what the editor and demo "config JSON" tabs do — loses the version in typed code or needs a cast.

**Fixed.** `MochartConfig` now declares `version?: string`. Adding an optional property is purely
additive — no existing object literal stops compiling, and nothing has to start supplying it.

One correction to the finding: the built config does **not** always carry a version. Defaults never
add one, and `enhanceConfig` does not migrate, so it is present only when the input supplied it. The
optional type says exactly that, which is why optional is right here rather than required.

Test asserts both halves — a supplied version comes back, an omitted one stays undefined — so the
type and the runtime cannot drift apart.

Deliberately not done: making `enhanceConfig` migrate so the version is always present. That is a
behaviour change and belongs with
[CONFIG-6](#config-6--the-documented-migration-path-is-never-wired-into-any-entry-point).

### API-7 — text truncation splits surrogate pairs, emitting lone surrogates
**Low · Bug · [TextTruncation.ts:127](packages/mochart/src/utils/TextTruncation.ts#L127)** — **Fixed**

`truncateSVGText` slices with `substr` and narrows one UTF-16 code unit at a time, so astral
characters get cut in half. Probed with a stubbed `getComputedTextLength`: `"😀😀😀😀😀"` at 65px
→ `"😀😀\ud83d"` (lone high surrogate, renders as U+FFFD before the ellipsis); `"🇺🇸 flag"` →
`"🇺"`, splitting the flag into a bare regional indicator. Affects axis tick labels, chart/axis
titles and legend items.

**Fix:** slice on code-point boundaries — use `Array.from(text)` for the length and index
arithmetic, or back off one more unit while the last code unit is a high surrogate.

**Fixed by cutting on character boundaries.** `truncateSVGText` counted and sliced UTF-16 code units,
so every cut could land inside a surrogate pair. All five length reads and all four slices now go
through `unitLength`/`sliceUnits`, which work on user-perceived characters.

The finding suggested `Array.from`, which fixes lone surrogates but not the flag case it also cites: a
flag is two regional-indicator code points, so `Array.from` still splits it. The helper therefore uses
`Intl.Segmenter` with `granularity: 'grapheme'` where available and falls back to `Array.from`
otherwise — the fallback still never splits a surrogate pair, it just cannot keep a flag, a skin-tone
modifier or a combining mark attached. `Intl.Segmenter` is typed locally rather than by widening the
package's TS `lib`, so `build:types` is unaffected.

Five cases in `test/utils/TextTruncation.test.ts` cover the initial proportional guess, the
shrink-by-one and grow-by-one steps, a flag and a combining mark, with a lone-surrogate assertion
(one that checks for an *unpaired* surrogate — an emoji legitimately contains a pair). Three of the
five fail without the fix. ASCII behaviour is byte-identical, so no golden snapshot moved: 1619 tests,
typecheck, `build:types` and lint all pass.

### API-8 — `cssStyleColor` silently drops the configured opacity for `currentColor`
**Low · Bug · [utils/style.ts:35](packages/mochart/src/utils/style.ts#L35)** — **Fixed**

When `styleOpacity` is a number and `color(styleColor)` returns `null` — exactly what d3 does for
the `currentColor` keyword `cssColorValidator` explicitly accepts — the function returns
`styleColor` unchanged, discarding the opacity. `tooltip.backgroundStyle.normal = { fillColor:
'currentColor', fillOpacity: 0.9 }` validates but renders fully opaque, and the HTML tooltip has
no separate opacity attribute to fall back on.

**Fix:** emit `color-mix(in srgb, <color> <opacity*100>%, transparent)` for an unparseable colour
with a non-null opacity, or reject the combination in `cssStyleKeyMap` so it is a validation error.

**Fixed with `color-mix`.** When `color(styleColor)` returns `null` — which is what d3 does for the
`currentColor` keyword that `cssColorValidator` explicitly accepts — `cssStyleColor` now returns
`color-mix(in srgb, <color> <opacity>%, transparent)` instead of the bare colour, so
`tooltip.backgroundStyle.normal = { fillColor: 'currentColor', fillOpacity: 0.9 }` renders at the
configured opacity. `color-mix` is resolved by the browser after `currentColor` is, which is exactly
why it works where arithmetic cannot. An opacity of 1 returns the keyword untouched rather than
wrapping it in a no-op.

Taken over the finding's other option — rejecting the combination in `cssStyleKeyMap` — because
`currentColor` with an opacity is a reasonable thing to configure, and the chrome defaults follow the
host page's colour deliberately; making it a validation error would forbid a legitimate style.

The percent is trimmed through `toFixed(4)`, since `0.9 * 100` is `90.00000000000001` in JS.

Four assertions added in `test/utils/style.test.ts`, replacing the one that pinned the old
pass-through. No golden snapshot moved: `cssStyleColor` feeds only the html tooltip's `background` and
`borderColor`, and no golden config pairs a keyword colour with an opacity. 1614 tests, typecheck and
lint pass.

### API-9 — state-factory context members arrive inconsistently; the README implies otherwise
**Low · Doc gap · [packages/mochart/README.md:238](packages/mochart/README.md#L238)** — **Fixed**

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

**Fixed by making the runtime match the documented contract, not by narrowing the documentation.** All six
`ChartFactoryContext` members are now non-optional and every call site passes the full context through one
`factoryContext(width, height, error)` helper, so a factory can rely on what the README always claimed. The
alternative — documenting that each state supplies a different subset — would have left every host writing
defensive checks for members the chart could perfectly well supply.

The six built-in factories dropped their `width = 0, height = 0` defaults, which existed only to cope with the
context arriving incomplete. `hasChartDataContent(error)` became `hasCategories()`, since the error term was
doing two jobs.

The documentation now says what each member means rather than just listing names, and resolves the ambiguity the
finding's second amendment raised: `width`/`height` are the box the returned content fills, which is the whole
chart for the no-size, config-error and no-config loading and error states, and the plot area for content inside
a laid-out chart. `mochartConfig` is the config as supplied — *including* the invalid one in the config-error
state — and null only before a host has supplied one.

Eight tests in `EmptyStates.test.ts`, one per state and per size regime, asserting the whole context rather than
the member each state was previously missing. They bite: stubbing the helper to return a partial context fails
four of them immediately.

No golden moved — the factory content is not snapshotted. 109 files / 1661 tests pass, typecheck and lint clean,
`generate-docs` regenerates the props reference from the new JSDoc without integrity errors, and the docs site
builds.

Note this finding's agent was interrupted by a server error just after its own bite proofs, mid-restore; the
verification above, the regeneration and the bite proof were redone by hand to confirm the tree held the fixed
state rather than a half-restored one.

### API-10 — `ChartEventPayload.categoryPercentage`/`valuePercentage` violate the `Fraction` convention
**Low · Inconsistency · [types/chart.ts:16-20](packages/mochart/src/types/chart.ts#L16)** **[verified]** — **Fixed**

Both fields are documented — in the JSDoc, the shipped `.d.ts`, and the generated
`/reference/callbacks` page — as "as a **0–1 fraction** of the plot", yet carry a `Percentage`
suffix. Every 0–1 config property uses `Fraction` (`barWidthFraction`, `innerRadiusFraction`,
`labelMinRangeFraction`, `centerOffsetYFraction`, …). These two are the only `*Percent*` names
left in the documented public API; the rest are internal `deltaPercentage` fields in
`types/animation.ts`. A reader may reasonably pass the value to a `%` formatter.

**Fix:** rename to `categoryFraction`/`valueFraction` (pre-1.0, so a clean rename), or note the
deliberate exception where the convention is stated.

**Fixed by renaming.** `ChartEventPayload.categoryPercentage`/`valuePercentage` are now
`categoryFraction`/`valueFraction`, matching the `Fraction` convention every other 0–1 ratio in the
public surface follows. They were the last two `*Percent*` names in the documented API; the remaining
ones are internal `deltaPercentage` fields in `types/animation.ts`, which are not public and keep their
names.

Renaming was taken over documenting an exception because the convention exists precisely so a reader
never has to check whether a name means 0–1 or 0–100, and an exception in the payload four callbacks
receive is the worst place to keep one. Nothing is released, so there is no migration to stage.

The local variables in `Chart.ts` that feed the payload were renamed with it rather than left mapping
`categoryFraction: categoryPercentage`, so the two names no longer coexist in one function.
`PointerScaling.test.ts` follows. Nothing else referenced the fields — no doc page, no demo, no
binding — and the docs site's props page is generated from this JSDoc, so it picks the new names up
with no edit. 1614 tests, typecheck and lint pass.

### API-11 — `apiReferenceModel.ts` calls `InternalFocus` internal, but it is an explicit public export
**Low · Doc inconsistency · [apiReferenceModel.ts:82](packages/mochart/scripts/apiReferenceModel.ts#L82)** — **Fixed**

`internalInterfaces` excludes it with the reason "never crosses the public boundary". It is
exported by name from [index.ts:15](packages/mochart/src/index.ts#L15) and documented in
`reference/api.md:232`. The stated invariant that gates the generator's integrity check is false,
so the check cannot catch a genuinely leaked type later.

**Fix:** give it a group in `pageSources`, or correct the reason string.

**Fixed by correcting the reason string.** `InternalFocus` is exported by name from
[index.ts:15](packages/mochart/src/index.ts#L15) and described in `reference/api.md`'s advanced
building-blocks section, so "never crosses the public boundary" was false and the invariant gating the
generator's integrity check said something untrue. The entry now reads "neither a prop nor a callback;
exported for hosts embedding the data sources and described in reference/api.md", and the map's own
comment says these interfaces are absent from the *generated props/callbacks pages* rather than absent
from the public API.

The finding's other option — giving it a group in `pageSources` — was not taken: `InternalFocus` is
neither a prop nor a callback, so it has no honest home on either generated page, and forcing one there
would make the pages describe something they are not about. `reference/api.md` already documents it in
prose, which is the right place for a type that only matters to hosts embedding the data sources.

The generator produces byte-identical output (the reason strings are never emitted, only used to
whitelist), so no generated artifact changed. Typecheck, lint and the config suites pass.

### API-12 — `generate-docs` writes its output before reporting integrity errors
**Low · Bug · [generator.ts:179](packages/mochart/scripts/generator.ts#L179)** — **Fixed**

`generateDocs` writes `config-reference.json`, `mochart-docs.html` and `api-reference.json` and
only afterwards checks `integrityErrors` to set the exit code — so a failing run leaves
regenerated artifacts on disk. Separately, the README says the command "writes mochart-docs.html
plus generated/config-reference.json" and never mentions `generated/api-reference.json`, which
the docs site's props/callbacks pages consume.

**Fix:** collect both models first, bail before writing when `integrityErrors.length > 0`, and add
the third artifact to both README mentions.

**Fixed as recommended.** `generateDocs` now builds both models, reports every integrity error, and
returns early *before* writing anything, so a failing run leaves the previous
`config-reference.json`, `mochart-docs.html` and `api-reference.json` in place instead of
half-regenerated files the checks had just rejected.

Verified both ways: on a clean tree the generator produces byte-identical output, and with an
integrity error forced (removing an `internalInterfaces` entry, which trips the "exported but has no
reference page group" check) the command exits non-zero and a sentinel appended to
`mochart-docs.html` survives untouched — proof nothing was written.

The README's two mentions now name all three artifacts, including
`generated/api-reference.json`, which the docs site's props and callbacks pages consume and which was
missing from both, and the prose says the command writes nothing when it fails.

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

### API-14 — the `DataProvider` contract needs revisiting; `getSeriesValue` serves two unrelated jobs
**Medium · Inconsistency · [types/data.ts:183](packages/mochart/src/types/data.ts#L183)** — **Fixed**

`DataProvider` is the one interface hosts implement themselves, so its shape is the part of the
public API that most needs to be self-explanatory. It currently is not.

`getSeriesValue` is documented as "The value of `seriesProperty` for the given category (numeric or
undefined for series values)". Core also calls it to read `categoryAxis.displayProperty` at
[CategoryData.ts:75](packages/mochart/src/data/CategoryData.ts#L75), casting the result to
`CategoryValue`, and [DataValidator.ts:72](packages/mochart/src/data/DataValidator.ts#L72) validates
that call with `string`/`number` — or `dateAny` on a date axis — rather than the numeric validator
it uses for series properties. Anyone implementing a provider from the comment alone would return a
number for a display property and get a data error they cannot explain.

That overload is also why `TSeriesValue` defaults to `unknown` rather than `NumericValue`: with the
narrower default, core's own cast at `CategoryData.ts:75` would be unsound against the type the
package publishes. The weakest type on the interface exists to paper over the ambiguity.

**Fix:** revisit the interface as a whole rather than patching the one method. Points to settle:

- Split display values out — a `getCategoryDisplayValues()` would give each concern its own
  signature, let `getSeriesValue` mean only what its name says, and allow `TSeriesValue` to default
  to `NumericValue`.
- Decide whether the two type parameters earn their place once the return type is honest.
- Reconsider the per-category, per-property call shape: every series property is read one category
  at a time ([SeriesData.ts:131](packages/mochart/src/data/SeriesData.ts#L131)), while category
  values arrive as a whole array. A column accessor would match how the data is actually consumed.
- Settle which of the four optional members (`getCategoryProperty`, `getError`, `getLoading`,
  `refresh`) are part of the contract versus conveniences. Nothing checks a provider's shape:
  [isDataProviderValid](packages/mochart/src/data/ChartData.ts#L6) only tests that the reference is
  non-null and that `getError()` returns null or undefined, so an object missing
  `getCategoryValues` entirely passes it and fails later inside `getChartData`.

Any of these is a breaking change to the provider contract, including both built-in providers and
the demo helpers, so they are worth deciding together rather than one at a time.

Fixed as a contract-honesty change, not a split.

**Why no split.** The two "jobs" are one operation. Both built-in providers answer
`getSeriesValue` identically for a display property and a series property — row
cell by category key, or column cell by index. A `getCategoryDisplayValues()`
would make every host write a second method that duplicates the first, keyed the
same way, for zero new capability. The ambiguity is in the *types*, not the shape.

So: `TSeriesValue` is dropped and `getSeriesValue` returns plainly `unknown`, with
the per-consumer requirement documented in the JSDoc, the guide's new "The provider
interface" section, `reference/api.md`, and core's README — a series property must
yield a number or `undefined`, `categoryAxis.displayProperty` a string, number or
`Date`. Both built-ins carry the dual-role comment and the parameter is renamed
`seriesProperty` → `property`.

The required/optional line is now enforced in code rather than only described:
`getMissingDataProviderMembers` in `data/ChartData.ts`, a shape gate in
`isDataProviderValid`, and a `data provider must implement: …` message from
`getDataErrors`. Previously a provider missing `getCategoryValues` passed validation
and threw later inside `getChartData`. The display-property type error also names
the property now — the finding's "error they cannot explain" case.

**No per-call cost.** The only changes at `getSeriesValue` are compile-time. The
finding's brief said "per category per series per frame"; that is wrong.
`getSeriesValue` is reached only from `getChartData`, called from the data sources'
`start`/`update` on config, provider-identity or legend-filter change; frames
interpolate precomputed values. What *does* run per frame is `isDataProviderValid`
(in `Chart.sync`), which is why its shape check is two inline `typeof` tests while
the array-allocating `getMissingDataProviderMembers` is used only for the error
message — the duplication is deliberate and commented.

**Left open deliberately:** the column-accessor reshape
(`getSeriesValues(property): NumericValues`). It is the one item that would also
help performance — one call per property, and `ObjectOfArraysDataProvider` could
return its column with no copy — but it forces row-backed hosts to materialize an
array per property per recompute, which is exactly the copying the current shape
avoids. Worth deciding separately.

Two corrections to the finding: splitting would *not* let `TSeriesValue` default to
`NumericValue` honestly, since neither built-in can promise numbers, so the default
would be a claim the package cannot keep; and "any of these is a breaking change to
the provider contract" is wrong for the change actually made — no file in the repo
passes a second type argument, and `implements DataProvider<X>` with a narrower own
return type still compiles. Adjacent, not in the finding: `getLoading` is
implemented by nothing in the repo and consumed only in `Chart.sync`.

Six new tests plus one updated; 111 files / 1689 tests pass, coverage above all four
thresholds, no golden movement.

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
**Medium · Bug · WCAG 2.4.3 · [Chart.ts:1192-1257](packages/mochart/src/components/Chart.ts#L1192), [:731](packages/mochart/src/components/Chart.ts#L731)** — **Fixed**

[Chart.ts:1198](packages/mochart/src/components/Chart.ts#L1198) documents that the plot tab stop
is deliberately kept during *loading* so focus is not dumped to `<body>` — but the same teardown
happens on any refresh that drops to zero categories or raises an error, and `closeTooltip`
(unlike `escapeTooltip`) never restores focus. Verified: focus the plot rect, then
`update({data: []})` → rect disconnected, `activeElement === body`. Open the tooltip, Tab onto a
control, close from the plot → `activeElement === body`. Any keyboard user of a polling chart
loses their place.

**Fix:** in `syncBody`, capture whether `document.activeElement` is inside the plot before
replacing it and re-focus a surviving stop; have `closeTooltip` do what `escapeTooltip` does.

**Fixed at one choke point rather than per close route.** `syncBody` captures the chart node holding focus
before any slot can unmount it (`getFocusedChartNode`, scoped by containment to the chart root) and calls
`restoreTornDownFocus` as its last statement. That fires only when the captured node is now disconnected *and*
nothing inside the chart holds focus, so the existing restores in `SeriesContainer`, `Legend` and
`TooltipContent.restoreRowFocus` still win. The move goes through `focusRestored`, so
[A11Y-10](#a11y-10--outline-none-leaves-programmatically-restored-focus-with-no-indicator)'s ring applies.

Target order: the plot tab stop where it survived, otherwise the no-data/error/loading message region, which
now takes `tabindex="-1"` while accessibility is active — never a tab stop, but focusable, so focusing it
reads the message out. A target had to be introduced because the finding's "re-focus a surviving stop" has no
candidate in the state it describes: at zero categories or on an error the plot rect and the whole tooltip go
together.

Where focus lands now, per path: a refresh to zero categories or one raising an error → the message region,
including when the same refresh also unmounts the focused tooltip row; `closeTooltip` (a click inside with
`closeOnClick`) → the plot rect; a plot click or mouse-leave closing the tooltip → the plot rect; Escape
inside the tooltip → the plot rect, now through the generic restore, with `escapeTooltip` and its bare
`.focus()` deleted so `onEscape` and `onClose` share one route.

Seven tests, and each guard was checked by removing it: dropping `restoreTornDownFocus` fails six
(`activeElement === body` in each, including the pre-existing Escape test, which proves the generic path now
carries what `escapeTooltip` used to); dropping the message `tabindex` fails the three message tests; making
that `tabindex` unconditional fails the accessibility-disabled test; dropping the captured-node guard fails
"leaves focus alone when it was outside the chart". One assertion was deliberately removed rather than kept:
the `contains()` half of the capture is defensive only, since both jsdom and browsers reset `activeElement` to
`body` when the focused node is removed, so no test could observe it and a non-biting assertion is worse than
none.

No golden moved — the only markup change is on the no-data/error overlay, which no snapshot covers, confirmed
by the golden suite passing unchanged. 109 files / 1647 tests pass, typecheck and lint clean.

Two things the finding got wrong, and one gap left: its Fix names only `closeTooltip`, but the pointer close is
a separate route, so fixing that alone would have left the very scenario its own verification note reproduces
still broken. And the `clearBody` paths — an invalid config, zero width or height, an error with no config —
still leave focus on `<body>`, because they replace the whole body with factory content and there is nothing
left in the chart to focus. Decorative charts (`accessibility.hidden`) deliberately get no focusable message.

### A11Y-4 — export stamps `role="img"` on charts that carry no accessible name
**Medium · Bug + doc inconsistency · WCAG 1.1.1 · [export/index.ts:182-189](packages/mochart-export/src/index.ts#L182)** **[verified]** — **Fixed**

`cloneChartSvg` sets `role="img"` unconditionally, but `aria-label` is only written when
`accessibilityActive(...)` ([Chart.ts:1176](packages/mochart/src/components/Chart.ts#L1176)). So
exporting a chart with `accessibility.enabled: false` or `hidden: true` produces `<svg role="img">`
with no accessible name — an unnamed image, a harder failure than the unroled svg it came from.
The guide claims the exported image "is still announced by the chart's name", true only in the
default configuration.

**Fix:** set `role="img"` only when the clone has an `aria-label`/`aria-labelledby`; otherwise set
`aria-hidden="true"` (or accept an `ariaLabel` export option). Correct the guide's Exports paragraph.

**Fixed as recommended.** `cloneChartSvg` sets `role="img"` only when the clone actually carries an
`aria-label` or `aria-labelledby`; otherwise it sets `aria-hidden="true"`. So exporting a chart with
`accessibility.enabled: false` or `hidden: true` produces a hidden decorative image rather than an unnamed
one, which is the harder failure the finding identifies.

The `ariaLabel` export option the finding offers as an alternative was not added: the chart already decides
whether it has a name, and a second source of truth in the export options would let the two disagree. A
host that wants a name on a decorative chart's export can put it on the element it places the image into,
which is what the guide now says.

The guide's Exports paragraph was rewritten rather than patched: it now states both outcomes explicitly —
`role="img"` plus the chart's own label when accessibility is on, `aria-hidden="true"` when it is off or
hidden — and says what a host should do in the second case. The old text claimed the export "is still
announced by the chart's name", which was true only in the default configuration.

Covered by a test that exports both configurations and asserts no `aria-label`, no `role="img"` and
`aria-hidden="true"`. It fails against the unconditional version. The export suite's 35 tests pass,
typecheck and lint clean, docs site builds.

### A11Y-5 — `accessibility.enabled: true` removes more text from the a11y tree than it adds
**Medium · Bug · WCAG 1.3.1 / 1.1.1 · [Plot.ts:65-66](packages/mochart/src/components/Plot.ts#L65), [Series.ts:360](packages/mochart/src/components/Series.ts#L360)** — **Fixed**

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

Fixed by hiding only what is unreadable and exposing the text, with the axes grouped so
the exposed text is comprehensible rather than merely present.

**Measured, and the finding's numbers need correcting.** Default two-series chart with a
title: 19 `<text>` nodes before and after, 6 outside an `aria-hidden` subtree before,
**16** after. But **6 was never 6 labels** — it was 3 strings each with a
`visibility: hidden` measurement twin (`mochart-title-text-raw`,
`mochart-legend-item-text-raw`). Real browsers drop `visibility: hidden` from the a11y
tree, so the honest figure is **3 readable strings → 13** (title, 2 legend names, 2
category ticks, 8 value ticks). The 3 still-hidden nodes are the ordinal width probe
(`"W…"`) and the two overlap-suppressed end ticks. Two things the finding missed: those
`-raw` twins carry no `aria-hidden` at all, a belt-and-braces gap in `Title.ts`/`Legend.ts`,
and the width probe's `"W…"` was in the exposed set too.

**Axes get a `role="group"` with a name.** Bare labels would put
"Jan Feb 4 6 8 10 12 14 16 18 20 21" in the reading order with nothing saying which run
is a category and which is a scale — maximising exposed nodes and minimising
comprehension. Grouped it reads "Months, group, Jan, Feb … Revenue, group, 0, 5, 10 …":
the name arrives before the run, and the group is a single object in object navigation
so the whole scale is skippable in one move. The name is the axis `title` when set, else
the new `accessibility.categoryAxisLabel` / `valueAxisLabel`.

**No `role="text"`.** This codebase's existing mechanism for readable text is a bare
`<text>` — the chart title and the non-interactive legend labels — with `aria-label` for
naming; `ClipIndicator`'s comment states this, calling itself the only `<title>` in the
library. Adding `role="text"` would be a second mechanism differing from the title, and
it flattens subtrees rather than exposing them.

**Truncation, two cases.** Axis *titles*: the group's `aria-label` carries the
untruncated title and the ellipsised `<text>` becomes `aria-hidden` — one utterance,
full string, no new mechanism. Tick *labels*: `aria-label` with the full string, set
only when truncation actually bit, so untruncated charts gain nothing.

**`SeriesLabels` stay hidden, contra the finding's "same for `SeriesLabels` when
visible".** `label` is a first-class animated extra — `SeriesAnimationData.ts` computes
label deltas — so mid-animation the label text is the *interpolated in-between value*,
not the datum: exposing it publishes wrong numbers for the animation's duration, and
labels enter and leave the DOM per frame as values cross `labelMinPositionFraction`,
churning the virtual buffer. A data label also names neither its series nor its
category, and on an interactive series it sits inside a `role="button"`. The tooltip
live region already reads settled, attributed, per-series-formatted values. They are now
*explicitly* hidden, where before they inherited it — and inside an interactive series
were not hidden at all. Threshold annotations and the width probe are likewise kept
hidden and documented: a threshold title read out of its spatial context says nothing.

New `accessibility.categoryAxisLabel` / `valueAxisLabel` (defaults `'Category axis'` /
`'Value axis'`, `validators.string()`), with docs descriptions and details, both
generators re-run. `guide/accessibility.md` gains a "Reading the chart" section, the
stale "axes, grid lines … is `aria-hidden`" sentence is replaced with the accurate rule
(nameless geometry has no role and no text, so nothing is announced; text we do not want
read is explicitly hidden), and both new keys appear in the localization example.
`@mochart/export` needs no change — it strips `role`/`aria-label` only from `[tabindex]`
elements, so the axis groups survive an export.

Golden movement: 418 files, 8596 insertions / 8596 deletions — exactly balanced, so
every change is a line rewrite, verified **per file**: stripping ` aria-hidden="true"`,
` role="group"` and ` aria-label="…"` makes the removed and added line multisets
identical in all 418 files, 0 exceptions. 836 removals of `aria-hidden` off
`plot-back`/`plot-front`; 6295 additions, of which 4899 are on tick `<text>` that
**all carry `visibility: hidden`** (none visible), plus 836 threshold containers, 392
axis titles, 140 width probes and 28 series-label groups; ~955 `role="group"` +
`aria-label` on axis groups; ~370 `aria-label` on ellipsised ticks.

New `test/components/AxisAria.test.ts`, 13 tests, bite-proved by reverting in four
batches, each failing exactly the tests that cover it; `ChartAria.test.ts`'s geometry
test was retargeted from the plot halves to the crosshair and threshold container.

Whole-repo gates green with this in: typecheck 0, `eslint .` 0, `deadcode` 0,
120 files / 1778 tests, docs gates 41 examples / 233 exports / 18 sections.

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
**Medium · Missing feature · WCAG 2.5.8 (AA, new in 2.2) · [legendConfig.ts:24](packages/mochart/src/config/defaults/legendConfig.ts#L24), [TooltipControls.ts:22](packages/mochart/src/components/TooltipControls.ts#L22), [TooltipContent.ts:85](packages/mochart/src/components/TooltipContent.ts#L85)** — **Fixed**

Nothing enforces a minimum hit area. Legend items are ≈22 px tall at a 16 px host font; tooltip
control buttons ≈22 px tall; interactive tooltip rows have `padding: 2`. All are laid out adjacent
(1 px legend margin, 3 px control gap), so the SC's spacing exception only rescues single-row
horizontal layouts. Motor-impaired and touch users mis-hit the toggle next to the one they wanted —
which filters the wrong series.

**Fix:** give the legend item background and the tooltip controls a configurable minimum extent
(default 24) applied to the interactive box rather than the text.

Fixed with a new `accessibility.targetMinSize` (number, default 24, `numberMin(0)`),
applied to the interactive *box* rather than the text, after splitting the chart's
click targets into three classes and treating them differently:

1. **Chrome the library sizes itself — guaranteed.** Legend item boxes, the tooltip
   controls' buttons, and interactive tooltip rows. Nothing about the data
   constrains their size, they sit adjacent (1px legend margins, 3px control gap,
   rows touching), and a mis-hit toggles the *neighbouring* series. These get a real
   floor, on by default.
2. **Series shapes — deliberately untouched, and documented as such.** Bars,
   markers, pie slices. Their size *is* the data; padding a marker's hit area on a
   dense series changes which value the pointer lands on, which is worse than a
   small target and is exactly what 2.5.8's "essential presentation" exception
   covers. The plot rect is already one large target for the tooltip, and the
   keyboard reaches every category without aiming.
3. **Host content — the host's job**, said so in the guide.

Defaulted, not hard-enforced: the accessible value is the default, but a compact
embedded chart is a legitimate design the host owns, and a host wanting the 44px
touch recommendation needs the knob upward too. The floor applies **only while
clicking the target does something** — a legend nothing responds to stays at its
content size — and is **not** gated by `enabled`/`hidden`, because it is a
pointer/touch concern rather than an assistive-tech one (same precedent as
`respectReducedMotion`). Named `targetMinSize`, not `MinExtent`: `barMinExtent`
means "along one direction" and this applies in both.

Two deliberate extensions past the finding's Fix: interactive tooltip rows (cited in
the finding's own header but omitted from its Fix — same harm, same knob, and
leaving them out would make the guarantee false), and the floor keyed to a
**mode-independent** predicate so the controls' Filter/Focus toggle cannot resize
the tooltip and the hidden sizer copy measures what the shown copy renders.

The geometry change is not silent: legend item boxes go 22px → 24px at ordinary
font metrics, so the plot loses 2px per legend row. Documented in the reference and
in a new "Click targets" guide section, with `0` to opt out.

395 of 451 goldens moved (the 56 legend-less ones did not). The diff was verified
mechanically: added and removed lines are identical modulo numbers except **7
lines**, capped-bar paths that lost a point (`M,L,L,L,Z` → `M,L,L,Z`) because the
4px-shorter plot collapsed a near-zero bar body to a cap-only triangle. Legend hunks
are exactly `height="22"` → `24`, icon `translate(2,4)` → `(2,5)` re-centred, and
legend `translate` up by 2 per row; widths were already above the floor. No tooltip
appears in any golden, so the tooltip changes moved nothing.

New `test/components/TargetSize.test.ts`, 9 tests, each with a bite proof: floor→0
fails four legend tests; dropping the clickable gate fails the "nothing responds"
test; removing the controls style fails the controls test; removing the row style
fails both row tests; making the row predicate mode-dependent fails the sizer/mode
test alone.

No CSS change — everything is config-driven, so it has to be inline.

One nuance the finding gets slightly wrong: the legend item's target is the
*margin-relative* box (22px), not the 24px slot, which is why the floor has to be
applied to the box with the margin carried on top, in **both** layout passes (the
wrap arithmetic must match).

`npm test -w @mochart/core`: 112 files / 1690 tests pass, 97.77% statements.
Typecheck, `eslint .`, the `@mochart/docs` gates and `vitepress build` all clean.

### A11Y-8 — arrow-key convention differs between the plot rect and every other roving group
**Low · Inconsistency · [Chart.ts:948-970](packages/mochart/src/components/Chart.ts#L948) vs [SeriesContainer.ts:85](packages/mochart/src/components/SeriesContainer.ts#L85), [Legend.ts:104](packages/mochart/src/components/Legend.ts#L104), [TooltipContent.ts:281](packages/mochart/src/components/TooltipContent.ts#L281)** — **Fixed**

All five groups use the same key set, but the plot rect's arrows step **categories** while arrows
on a series, slice, legend item or tooltip row move **between siblings** — and both live in the
same plot area, one Tab apart. Tab to a series and press Enter: the tooltip opens at the
*remembered* category, unrelated to the series activated, and the same keypress also fires
`onSeriesClick`. Press → and the tooltip stays put while focus jumps to the next series; there is
no way to step categories without Tabbing back to the plot rect.

**Fix:** pick one convention — forward `Arrow*` from a focused series to `onPlotKeyDown` (matching
the Enter/Space/Escape forwarding already there) and move sibling navigation to Tab, or stop
opening the tooltip on Enter-over-a-series. At minimum, document the dual action.

Fixed by removing the cross-wire, not by changing any group's arrow keys.

**The finding's framing is half right.** Four of the five groups agree, but the plot
rect is not a fifth *roving group* — it is a single `role="button"` with
`aria-expanded` and no siblings to move between. Its arrows are a data cursor on a
disclosure widget, which the roving-tabindex convention does not govern and does not
conflict with. Nothing was wrong with either convention in isolation; the defect was
`SeriesContainer` forwarding a series' `Enter`/`Space` into `onPlotKeyDown`. With the
forward reduced to `Escape` only, both conventions are correct and non-overlapping.

**Arm (a) is self-defeating.** Putting every series on the Tab sequence is exactly
what roving tabindex prevents, and it would leave the legend and tooltip rows roving —
replacing one inconsistency with a worse one, against WAI-ARIA. The narrower variant
(keep roving, forward ←/→ to the plot handler, use ↑/↓ for siblings) fails on four
counts: the other three roving groups treat → and ↓ as the same "next", so it breaks
them instead; with `plot.inverted` the category axis is vertical, so the mapping is
wrong in half of all charts, and following `inverted` would make one keypress do
different things in two charts that differ only in orientation; `Home`/`End` become
double-bound; and the tooltip is chart-wide, so a user just announced as being on
"Sales" would hear every series' values.

**Arm (b) costs a screen-reader user nothing.** `plotA11yProps` is non-null exactly
when `accessibility && (tooltip.visible || crosshair.visible)` — the same condition
under which the forward did anything — so it was never the only route to the tooltip.
The plot rect is also the immediately preceding tab stop (verified in the goldens:
`mochart-series-background` precedes the series `g`s), so `Shift`+`Tab` reaches the
values. Two stops, two jobs. And the announcement it removes was actively misleading:
"you pressed the Sales button; here are Wednesday's values."

**Pie slices deliberately keep `Enter` → tooltip.** A pie has one category, so nothing
is invented — the tooltip a slice opens is the one covering that slice. The
invented-category problem, and therefore the finding's symptoms, exist only in
cartesian charts, and pie's plot-rect arrows are already inert. Keeping it also
preserves the regression guard from 8a3d297c, where `Enter` used to synthesize a click
at the slice bbox centre that the chart bounds gate swallowed on exploded edge slices.

The two symptoms, measured on 3 categories × 2 series. Before: stepping the plot
cursor to Mar, `Esc`, then `Enter` on Sales read `"Mar: Sales: 30.00, Costs: 12.00"`
with `aria-expanded="true"` *and* fired `onSeriesClick`. After: `aria-expanded="false"`,
live region empty, `onSeriesClick` fires once. The second symptom — → moving focus
while the tooltip stays put — is unchanged and now asserted as a regression guard:
arrows inside a composite move between its items, and "there is no way to step
categories without Tabbing back to the plot rect" is correct, because that is what Tab
is for.

**No config surface added.** A knob choosing between keyboard conventions would ship
the bug as an option, and nothing is released, so there is one right answer to pick.
`generate-jsdoc`/`generate-docs` were deliberately not run — another agent has
uncommitted `accessibilityConfig` work in flight and regenerating would have swept it in.

Three tests, each with a bite proof: the activation test failed *before* the source fix
(`expected 'true' to be 'false'` on `aria-expanded`); implementing arm (a) fails the
arrow test plus the two pre-existing ones; removing the `Escape` forward fails the
Escape test alone. No golden movement — zero goldens put `tabindex` on a series `g`, so
no golden config makes a cartesian series interactive.

Two residuals deliberately left, one finding at a time: `Escape` is *not* forwarded
from legend items, so the guide now says "from the plot area, from a series or slice
inside it, and from inside the tooltip" rather than "anywhere"; and an interactive
series with `focusOnClick` is a toggle with no `aria-pressed`, unlike legend items and
tooltip rows.

One more correction: the docs already described arm (b)'s behaviour — the intended
design was always (b), and the forwarding was an accident inherited from the era when
keyboard activation synthesized a real mouse click.

### A11Y-9 — the live region has no explicit `aria-live` and no de-duplication or throttle
**Low · Bug · WCAG 4.1.3 · [Chart.ts:1178-1181](packages/mochart/src/components/Chart.ts#L1178), [:888](packages/mochart/src/components/Chart.ts#L888)** — **Fixed**

The announcer is `<div role="status">` with no `aria-live`, no `aria-atomic`, and
`announceTooltipCategory` replaces `textContent` on every arrow keypress with no comparison against
the previous string. Holding → across 50 categories queues 50 polite announcements. Stepping to a
category whose formatted values are identical writes the same string, which several screen readers
silently drop. (Content is otherwise correct and uses the configured value formats; hover
deliberately does not announce, so the spam is keyboard-repeat only.)

**Fix:** add `aria-live="polite"` and `aria-atomic="true"` explicitly, skip the write when unchanged,
and debounce so a held arrow key announces only the settled category.

**Fixed, with one deliberate change to what the finding proposed.** The announcer div now carries
`aria-live="polite"` and `aria-atomic="true"` explicitly alongside `role="status"` (spelled as
attribute strings, not camelCase props — the live region is html, where `El.set` writes camelCase
names verbatim instead of kebab-casing them as it does on svg). `announceTooltipCategory` skips the
write when the string is unchanged, so a step to a category whose formatted values match no longer
churns the region.

The deviation is the coalescing. The finding asks for a plain debounce so a held key "announces only
the settled category", but that delays *every* keypress, including the single deliberate step that is
the common case — a sluggish screen reader for the sake of the repeat case. What landed instead speaks
the first step immediately and coalesces the rest, so a held arrow key produces two announcements (the
first and the settled one) instead of one per category passed through. The timer is cleared on
teardown and whenever the body is destroyed, and a `null` index still silences the region
synchronously.

Four keyboard tests exercise the announcer; two of them stepped categories synchronously, which is
indistinguishable from a key repeat, so they now await the settle window — the change in expectation is
the behaviour change, not a workaround. All 451 golden snapshots moved by exactly one line, the two new
attributes on the live-region div. 107 files / 1621 tests pass, typecheck and lint clean.

### A11Y-10 — `outline: none` leaves programmatically restored focus with no indicator
**Low · Bug · WCAG 2.4.7 · [css/mochart.css:81-88](packages/mochart/css/mochart.css#L81)** — **Fixed**

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

**Fixed by marking the focus the library moves itself.** A new `focusRestored(node)` in `utils/utils.ts`
sets `data-mochart-focus-restored` on the node, clears it on blur, and then focuses it. `css/mochart.css`
rings `[data-mochart-focus-restored]:focus` with the same 2px `currentColor` outline the
`:focus-visible` rule uses, so a programmatic move is visible even when it came from a pointer path.

Wired into exactly the restores the finding names — `TooltipContent.restoreRowFocus` (a row that filters
itself away with `hideFiltered`) and the two `focusedSeries`/`focusedSlice` restores plus their
inherited-tab-stop fallbacks in `SeriesContainer.sync` and `PieSeriesContainer.sync`. Arrow-key
navigation is deliberately left alone: it is keyboard-driven, so `:focus-visible` already matches and
marking it would put a ring on ordinary click-focus too.

Taken over the finding's first option — scoping the `outline: none` reset — because that does not
actually help: modern browsers gate their own default ring on `:focus-visible` as well, so removing our
reset would still leave a pointer-driven restore unringed.

An attribute rather than a class, deliberately: the renderer writes `className` wholesale from its prop
map, so a class added outside that map can be wiped by the next sync, while an attribute it does not
manage survives.

Asserted in `TooltipKeyboard.test.ts`'s existing `hideFiltered` restore test. Core's 439 component tests
pass, typecheck and lint clean.

### A11Y-11 — no forced-colors / Windows High Contrast handling
**Low · Missing feature · [css/mochart.css](packages/mochart/css/mochart.css)** — **Fixed**

There is no `@media (forced-colors: active)` block anywhere in the repo. Chart chrome is
`currentColor` and follows the forced text colour, but series fills/strokes are SVG presentation
attributes from the palette — so the chrome flips to the forced palette while the series keep their
original hues, or collapse, with nothing in the code deciding which. The tooltip's `color-mix`
hover tints become invisible.

**Fix:** add a `@media (forced-colors: active)` block restoring the tooltip control affordances
(`forced-color-adjust`, `border-color: ButtonBorder`, a `Highlight` focus ring) and document what
series colours do in that mode.

**Fixed with a `@media (forced-colors: active)` block plus the documentation the finding asks for.**

The block restores the tooltip control buttons, which are the only chrome that sets its look inline:
`forced-color-adjust: none` so the system palette reaches them, `ButtonFace`/`ButtonText`/`ButtonBorder`
for the base, `GrayText` at the `aria-disabled` ends, and `Highlight`/`HighlightText` fills replacing the
hover and active tints — those are `color-mix` over `currentColor`, which forced colours flatten to
invisible. The focus ring switches to `Highlight`, covering both the `:focus-visible` rule and the
restored-focus rule added for
[A11Y-10](#a11y-10--outline-none-leaves-programmatically-restored-focus-with-no-indicator).

**Series fills and strokes are deliberately left alone**, and the guide now says so rather than leaving
it to be discovered: they are SVG presentation attributes from the configured palette, and forcing them
to the system palette would collapse every series to one colour, which is worse than keeping hues the
mode never asked about. `guide/accessibility.md` gains a *Forced colors and High Contrast* section
stating what the stylesheet does, what series colours do, and that a chart needing to stay readable there
should carry a non-colour encoding (`markerShape` per series, or `strokeDashArray` on lines) — advice
that applies to colour-vision deficiency generally, which is also
[A11Y-6](#a11y-6--default-encoding-is-colour-only-on-a-palette-that-is-not-cvd-checked)'s territory.

Docs site builds clean. Not verifiable in this environment beyond the CSS itself: forced-colors mode
needs a real Windows High Contrast session, so the rules are written from the spec rather than observed.

### A11Y-12 — series and tooltip roving groups lack the group semantics the legend has
**Low · Inconsistency · [SeriesContainer.ts:145](packages/mochart/src/components/SeriesContainer.ts#L145), [PieSeriesContainer.ts:164](packages/mochart/src/components/PieSeriesContainer.ts#L164), [TooltipContent.ts:570](packages/mochart/src/components/TooltipContent.ts#L570) vs [Legend.ts:183](packages/mochart/src/components/Legend.ts#L183)** — **Fixed**

The legend's roving container gets `role="group"` + `aria-label` from `accessibility.legendLabel`;
the identical containers for cartesian series, pie slices and tooltip rows get only a class and key
handlers, and there is no config key to name them. Tab into a pie's slices and the AT announces
"Sales, 42%, button" with no enclosing group; the legend one Tab later announces "Legend, group".

**Fix:** add `role="group"` + `aria-label` to the three containers and matching config keys
(`seriesLabel`, `tooltipLabel`) to the accessibility defaults/validation/docs.

**Fixed by copying the legend's treatment exactly.** `role="group"` plus an `aria-label` now sit on the
roving containers for cartesian series (`SeriesContainer`), pie slices (`PieSeriesContainer`) and tooltip
rows (`TooltipContent`) — on the *same element that carries the roving `onKeyDown`/`onFocusIn` handlers*, and
gated on the *same* predicate those handlers use. So the group exists exactly when the items inside it are
roving tab stops and disappears with them: accessibility off, nothing clickable, every series filtered out,
or the hidden tooltip sizer copy. Nothing else was added — no `aria-labelledby`, no `aria-activedescendant`,
no per-item change — so no item gains a second name and nothing double-announces.

Two new config keys, `accessibility.seriesLabel` ("Chart series") and `tooltipLabel` ("Tooltip values"),
with the generated JSDoc and reference regenerated. One key covers cartesian series and pie slices because
slices *are* series in this model, which is what the finding's two-key proposal assumes.

The tooltip's label is written as the kebab-case `'aria-label'`: `setProperty` only kebab-cases camelCase
names on SVG, so `ariaLabel` on an html div would emit a literal `ariaLabel` attribute — the same trap
[A11Y-9](#a11y-9--the-live-region-has-no-explicit-aria-live-and-no-de-duplication-or-throttle) hit with the
live region.

One scope call: the series group also encloses the plot-area rect, which is a child of the same container,
so it announces as a "Chart series" group around the "Chart values" button rather than duplicating it.
Isolating it needs a new wrapper `g` around the series list — restructured markup and large golden churn —
for a worse match to the legend model, so the flat form stayed.

No golden moved: no golden config makes a series or slice interactive and none opens a tooltip, so the gated
attributes never render there. Confirmed by running `test/golden` without `-u` and checking no snapshot file
was touched.

Six tests, two per container, asserting the role, the default label, that the roving item's
`closest('[role="group"]')` is that container, and a config-supplied label — plus that the hidden sizer copy
gets no second group. Removing the three role/label lines fails exactly those three positive tests. 109
files / 1634 tests pass, typecheck and lint clean, and the docs package's own suite is green since the new
keys flow into its generated reference.

Bookkeeping: this finding's paragraph in `guide/accessibility.md` was committed early, inside
[A11Y-4](#a11y-4--export-stamps-roleimg-on-charts-that-carry-no-accessible-name)'s commit `f7a0a3b4`,
because that commit staged the whole file while this work was still in flight. The content is correct and
intact; only its commit is wrong.

Noted, not fixed: `mochart-export` strips accessibility attributes only from elements carrying `[tabindex]`,
so these `role="group"` labels survive into an exported SVG, as the legend's already did. Harmless — the
export root is `role="img"`, whose subtree AT ignores — but the sanitizer's selector would need `[role]` to
be thorough.

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

**Partly addressed, and left Open: the remaining half is a decision, written up in
`REVIEW-QUESTIONS.md`.**

What landed here, because it is right regardless of that decision: `types` now precedes `development` in
all **nine** packages' `exports["."]` maps (the five bindings, core, movalid, export and editor — the
finding undercounts at seven), so any tool setting both conditions resolves `dist/*.d.ts` instead of raw
source; and each of those nine READMEs gained a `## The development export condition` section naming the
hazard and the escape hatch (`resolve.conditions: ['module','browser','production']`), with the Svelte and
Angular ones naming their specific failures — `<script lang="ts">` needing `vitePreprocess()`, and
unprocessed Angular decorators. Vite never sets the `types` condition, so this cannot change any dev
server's lookup, which was confirmed against a live server rather than assumed.

**The finding's own fix does not work.** `publishConfig.exports` is a pnpm/Yarn feature that **npm
ignores**; a packed tarball's manifest is byte-identical to the source manifest, `development` still
present. This repo publishes with npm, so that route is inert.

**And no exports-map edit can fix the consumer without breaking this repo**, because the two are
indistinguishable to a resolver: Vite's default client conditions are
`['module','browser','development|production']` and its server ones `['module','node',…]`, and the demos
set no `resolve.conditions` — they reach `src` through those defaults, exactly as a consumer's `vite dev`
would. Nesting under `node` sends the demos to `dist` and still leaks to consumer SSR dev; putting
`browser` first sends both to `dist`; deleting the condition breaks the demo dev servers, every binding's
vitest run (Vitest resolves through the server conditions, so the binding tests currently exercise `src`)
and the `--conditions=development` tsx scripts.

So the consumer exposure is documented, not removed. The real fix is renaming the condition to a private
one no bundler enables by default, with explicit opt-in at every in-repo consumer — and that is the
decision: it touches each demo's and the docs' `vite.config.ts`, the bindings' vitest configs, and two
package.json script lines, and doing it partially would silently switch the demo dev servers and the
binding suites onto a stale `dist`.

### BIND-4 — Angular placeholders keep stale inputs when core omits a context key
**Medium · Bug · [mochart-angular/src/placeholders.ts:56-60](packages/mochart-angular/src/placeholders.ts#L56)** — **Fixed**

`renderSlot` iterates `Object.keys(context)` and calls `setInput` only for keys present, so a key
dropped by a later call retains its previous value. Core calls one slot with different key sets —
[Chart.ts:1034](packages/mochart/src/components/Chart.ts#L1034) `loadingFactory({width, height})`
vs [:1311](packages/mochart/src/components/Chart.ts#L1311) with five keys — so going from the
second state to the first leaves a stale `hasData`/`mochartConfig`/`dataProvider`. React, Vue, Lit
and Svelte all reset (Svelte explicitly deletes absent keys).

**Fix:** before applying, `setInput(key, undefined)` for every name in `slot.inputNames` that is a
`PlaceholderProps` key and absent from `context`.

**Fixed by tracking what was applied, not by clearing a fixed key list.** `renderSlot` only walked
`Object.keys(context)`, so any chart-context key core stopped passing kept its previous value on the same
`ComponentRef`. Each slot now keeps an `appliedKeys` set of the keys it actually pushed; before applying a new
context, any tracked key absent from it gets `setInput(key, undefined)`, the set is rebuilt from this call's
keys, and it is cleared when a component swap creates a fresh instance.

Confirmed against core rather than assumed: the loading slot is called with
`{mochartConfig, dataProvider, width, height, hasData}` while a chart is mounted
([Chart.ts:1412](packages/mochart/src/components/Chart.ts#L1412)) and with only `{width, height}` when there is
no config ([:1141](packages/mochart/src/components/Chart.ts#L1141)); the error slot loses `mochartConfig` the
same way. The slot's factory identity and container are stable, so the same instance is reused across those
states and `hasData`, `mochartConfig` and `dataProvider` stayed stale.

Deliberate divergence from the prescribed fix, which says to clear every `PlaceholderProps` key absent from the
context: taken literally, the first render would `setInput(…, undefined)` over inputs core never set, blanking
a placeholder's own field default — `@Input() hasData = true` on a component used in a state where core never
passes `hasData`. Tracking what was applied clears exactly the stale values, and needs no runtime copy of the
`PlaceholderProps` key list to drift out of step with `types.ts`.

One test pins it: a loading component declaring `width`/`height`/`hasData`, mounted with a valid config and
`loading: true`, then `mochartConfig` set to null so the same slot is called with two keys. Without the fix it
still renders `Loading [true]` instead of `Loading []`. 19 tests pass (was 18), typecheck and lint clean, and
the ngc build still emits partial-Ivy — `ɵɵngDeclareComponent` present, zero `ɵɵdefineComponent` in `dist`.

The finding's line citations are stale (1034/1311 against the actual 1141/1412) and it names only the loading
slot; the error slot has the same asymmetry and is covered by the same fix.

### BIND-5 — placeholder instances leak when the placeholder prop is removed (Vue, Svelte, Lit, Angular)
**Medium · Bug · [vue/placeholders.ts:61](packages/mochart-vue/src/placeholders.ts#L61), [lit:57](packages/mochart-lit/src/placeholders.ts#L57), [svelte:77](packages/mochart-svelte/src/placeholders.svelte.ts#L77), [angular:86](packages/mochart-angular/src/placeholders.ts#L86)** — **Fixed**

`transform()` deletes the prop key and installs a factory only when the component is truthy. There
is no `else` branch, so a slot whose prop was removed keeps its mounted instance alive in a
detached container until the whole chart is destroyed — with its timers, watchers and
subscriptions still running. React handles this correctly at
[react/placeholders.ts:90](packages/mochart-react/src/placeholders.ts#L90).

**Fix:** add the missing branch to the other four — Vue `render(null, slot.container)`, Svelte
`slot.destroy()`, Lit `render(nothing, slot.container)`, Angular `slot.ref?.destroy()` — and drop
the slot from the map.

**Fixed in all four bindings, with a measured teardown per framework.** Each `transform()` gained the missing
`else` branch, calling a new `releaseSlot(propName)` that tears the slot down and deletes it from the map;
`destroy()` was rewritten to loop over the slot keys through the same helper, so there is exactly one teardown
path per binding.

What was actually retained differed by framework, and so does the release:

* **Vue** — a component instance mounted by `render(vnode, container)`, whose `onUnmounted`, watchers and
  timers never ran down. Released by `render(null, slot.container)`.
* **Svelte** — an instance from `mount()` plus its `$state` props object; `onDestroy` and effect cleanups
  never ran. Released by `slot.destroy()`.
* **Lit** — no component at all, just a rendered template, so "placeholder instance" does not apply here: the
  observable leak is that its `AsyncDirective`s were never disconnected, so anything they subscribed to kept
  running. Released by `render(nothing, slot.container)`, which clears the root part and notifies
  disconnection.
* **Angular** — a `ComponentRef` still attached to `ApplicationRef`, so it stayed in the change-detection view
  list and its `ngOnDestroy` never ran. Released by `slot.ref.destroy()`.

Each has a test that fails before the fix, and each counts the framework's own teardown hook rather than
asserting on the DOM: Vue's `onUnmounted`, Lit's `AsyncDirective.disconnected()`, Svelte's `onDestroy` (via a
new `TrackedLoading.svelte` fixture) and Angular's `ngOnDestroy` — all `expected +0 to be 1` beforehand. Each
test then re-adds the prop and asserts the placeholder renders again with no extra teardown, so discarding the
slot does not break the round trip; the Angular one also checks `fixture.destroy()` tears the rebuilt slot
down.

No host or component file needed changing: every binding's host already calls `placeholders.transform` on each
update and pushes the result through `chart.replace`, which replaces core props wholesale, so a removed
factory is genuinely dropped and no stale factory can be called against a released slot.

One divergence from the finding worth recording: it cites React as the model, but React does *not* drop the
slot — it keeps the slot and container and nulls the context so the portal unmounts. These four now discard the
slot entirely, which is what the finding's own instruction says; the round trip is verified in all four, so the
difference is internal only.

Vue 18, Svelte 17, Lit 17, Angular 18 tests pass; each package's typecheck and lint are clean.

### BIND-6 — the React guide claims placeholder-context parity that only Svelte has
**Medium · Doc inconsistency · [guide/frameworks/react.md:128](packages/mochart-docs/guide/frameworks/react.md#L128)** — **Fixed**

"Placeholder components render through portals … so they inherit the app's context providers …
**as in the other bindings**." Portals are React-only. Vue passes `vnode.appContext` — **app-level**
`provide()` only; a value provided by an ancestor *component* is not injectable. Angular passes
`this.environmentInjector` — environment providers only, not the element injector. Only Svelte
matches (`getAllContexts()`). A Vue or Angular user following this sentence writes a placeholder
that `inject()`s a component-provided value and gets `undefined`.

**Fix:** replace the parity clause with the per-binding truth, and mirror it in the Vue and Angular
guide pages.

**Fixed across all five guides and READMEs, and the finding's scope was too narrow.** It names only Vue and
Angular as needing the correction, but the Svelte and Lit pages were also silent about context — and silence is
the same defect here, because a reader carries React's sentence across. Lit's case is qualitatively different
again, so mirroring two pages would have left the comparison unanswerable.

What each placeholder actually resolves, read from source:

* **React** — rendered through `createPortal` into the host component tree, so it inherits *any* ancestor's React
  context and re-renders when a provider updates. The widest reach, and the only one with live inheritance.
* **Vue** — `vnode.appContext` is captured at setup, so app-level `app.provide()` values and globally registered
  components and directives resolve; an ancestor *component*'s `provide()` does not, because a `render()`ed root
  has no parent for `inject()` to walk.
* **Svelte** — mounted with the full `getAllContexts()` map, so every ancestor `setContext` entry resolves. But it
  is a snapshot taken at chart init on a separate `mount()` root, so unlike React it does not track later
  provider changes.
* **Lit** — a template function the binding calls, not an instantiated component, so no framework context at all;
  only its lexical closure. Directives work and are disconnected on removal.
* **Angular** — only declared inputs among the context names, with DI through the *environment* injector, so
  application and route providers resolve while an ancestor's `providers`/`viewProviders` do not.

Only `react.md` actively overclaimed — "inherit the app's context providers … **as in the other bindings**" — and
it now states the portal behaviour, that reach differs per binding, and links the other four. Each of the other
four pages gained a paragraph stating what its placeholder can and cannot resolve, with the workaround where one
exists (Vue: `app.provide()`, or close over an injected value in the host; Angular: register at application or
route level, or share a service). All five READMEs carry the matching sentences so README and guide agree.

Two things worth correcting beyond scope. **"Only Svelte matches" is too strong**: Svelte matches on the context
axis but not on liveness, so React is the only true match. And **Angular's failure mode is worse than
"environment providers only"**: a service with `providedIn: 'root'` resolves to the *root* instance rather than
throwing, which is a silent wrong-instance bug rather than an error — that is now stated explicitly.

BIND-5 and BIND-4, which landed just before this, change nothing about context parity — `releaseSlot` is
teardown and the clear-then-apply is context-key hygiene. What they did equalise is that removing a placeholder
prop now tears the instance down in all five, which React always did.

Docs site builds clean, no dead links.

### BIND-7 — exports lose web fonts, and nothing says so
**Medium · Doc gap · [export/index.ts:20-22](packages/mochart-export/src/index.ts#L20), [export README](packages/mochart-export/README.md#L5)** — **Fixed**

`inlineComputedStyles` inlines `font-family`/`font-size`/`font-weight`/`font-style` as *names*. No
`@font-face` rule or font data is embedded. Core sets no `fontFamily` default, so chart text
inherits the page's font — commonly a web font. `exportPNG` rasterizes through
`img.src = 'data:image/svg+xml,…'`, and an SVG loaded as an image cannot fetch external resources,
so the PNG silently falls back to a system font; a downloaded SVG opened outside the page does the
same. The README promises the serialized svg "renders the same outside the page's stylesheets",
untrue for typography.

**Fix:** document the limitation, and offer a `fontFaceCss?: string` (or `embedFonts`) option that
injects a `<style>` with base64 `@font-face` rules into the clone before serialization.

**Fixed by documenting the limitation *and* adding the seam that makes the documented workaround reachable — not
by embedding fonts.**

Automatic embedding was rejected deliberately: it would make export network-dependent and async on a path that is
currently pure DOM work, inflate every file substantially, fail unpredictably on font CDNs that disallow reading
the bytes, and — the deciding part — silently place a licensed font binary inside a file the user redistributes.
That is not a call an export helper should make for the host.

But documentation alone was not enough, because the workaround was unreachable: a host can post-process the
string from `getChartSvgText`, while `exportSVG`/`exportPNG` had no seam at all — injecting a `<style>` meant
reimplementing the clone, the background rect, the rasterization and the download. So `ExportSvgOptions` gains
`fontFaceCss?: string`, injected verbatim once per output document. About ten lines, no network, no encoding, no
CORS in our code, and zero effect unless passed. It is injected per *document* rather than inside
`cloneChartSvg` on purpose: a base64 font in the clone would repeat per tile in a stitched grid and multiply the
file size by the chart count. A test pins that.

An automatic path was checked and rejected on evidence: copying the page's own `@font-face` rules out of
`document.styleSheets` throws on cross-origin sheets, and even when readable the `src` is an external URL an
image-loaded SVG cannot fetch. It buys nothing.

Two ways the finding understates the problem, both now in the docs. **It is not only a typeface swap**: core
measures text with the live font and writes the result into the markup as coordinates, so positions, alignment
and truncation stay tuned to a font the file no longer has — labels can sit wrong or truncate wrong, not merely
look different. And **the dividing line is not "web font"** but installed-on-the-rendering-machine versus
loaded-by-the-page, which is exactly why an export looks right to the author who has the font installed and wrong
to everyone else. The README pointer is also misplaced: the "renders the same outside the page's stylesheets"
promise lives in `guide/export.md` and the `inlineComputedStyles` comment, both now qualified.

41 tests (was 35), coverage up on both statements and branches, and the four injection tests fail when
`makeFontFaceStyle` is stubbed to return null. Default output is byte-identical — a test asserts no `<style>`
appears without the option, which also keeps A11Y-4's assertion honest.

Filed separately from this work: [BIND-13](#bind-13--the-single-chart-export-markup-is-not-well-formed-xml).

### BIND-8 — `@mochart/editor`'s config model is a build-time snapshot of a peer-ranged core
**Medium · Inconsistency · [editor/mochartSupport.ts:3-5](packages/mochart-editor/src/mochartSupport.ts#L3), [package.json:31](packages/mochart-editor/package.json#L31)** — **Fixed**

Diagnostics come from the **live** peer core, but completions and hover come from
`mochartConfigModel.generated.ts`, baked in at build time. The peer range is `^1.0.0`. Inside the
monorepo it cannot drift (gitignored, regenerated by `prebuild`/`test`/`typecheck`/`dev`), but a
consumer on `@mochart/editor@1.0.0` with `@mochart/core@1.1.0` gets a section that validates
cleanly while `sectionForPath` returns `null` and completions silently stop inside it — no
diagnostic, no hover. (Unknown/newer `version` values are handled acceptably.)

**Fix:** narrow the peer range to `~1.0.0`, or stamp the generating core version into the model and
warn once at `createMochartConfigSupport()` when `getVersionString()` disagrees.

Fixed by stamping and warning, not by narrowing the peer range.
`generateEditorModel` now writes `coreVersion` into the emitted model, and
`createMochartConfigSupport()` compares it against the live core's
`getVersionString()`, logging one warning that names both versions and both
halves of the split: completions and hover come from the baked model, validation
diagnostics from the installed core. Comparison is on major.minor, since a patch
release cannot add or remove config properties and comparing full strings would
fire on every core patch bump. `MochartConfigModel.coreVersion` is also readable
programmatically, and the constraint is documented next to the peer-dependency
paragraph in the editor README.

Runtime resolution was ruled out on evidence: `buildConfigReference` imports
roughly a hundred deep internal core modules under `src/config/{docs,validation,
defaults}`, and core's `exports` map publishes only `.` plus the CSS, the IIFE
and `package.json` — a consumer's installed core physically cannot supply the
doc/validator registries the model is built from. Doing so would mean a large new
public core surface and pulling every doc string into the runtime bundle.

The finding's `~1.0.0` suggestion is actively harmful and was rejected: with
npm 7+ a peer mismatch is an `ERESOLVE` install failure, so it converts
"completions are incomplete inside one new section" into "the editor will not
install", and forces a lockstep editor release for every core minor. The
editor's actual runtime use of core — `getDefaults`, `validateConfigDetailed`,
`getVersionString` — is stable across 1.x.

In this repo the warning is inert (the model is gitignored and regenerated by
`generate`/`prebuild`/`test`/`typecheck`/`dev`, and `prepack` runs the chain), so
what the repo gets is the gate: `model.test.ts` asserts the stamp matches core.
Bite proof — forcing the stamp to a fake `1.1.0` fails both the stamp assertion
and the silence assertion.

Two corrections: the model is 616,200 bytes, not the ~543 kB stated, and `files`
lists both `src` and `dist` so it ships twice in the tarball. The cited
`package.json:31` for the peer range is stale — it is line 65 after the recent
manifest additions.

### BIND-9 — both Vue `refresh()` examples throw `ref is not defined`
**Low · Doc gap · [mochart-vue/README.md:105](packages/mochart-vue/README.md#L105), [guide/frameworks/vue.md:116](packages/mochart-docs/guide/frameworks/vue.md#L116)** — **Fixed**

The `<script setup>` snippets use `const chart = ref(null);` with no `import { ref } from 'vue'`.
`ref` is not auto-imported in a plain Vue project, so copy-pasting the only documented `refresh()`
example throws at runtime. `vue.md:98` has the same gap.

**Fix:** add the import to both snippets.

**Fixed in both places.** The `refresh()` snippets in `packages/mochart-vue/README.md` and
`guide/frameworks/vue.md` now import `ref` from `vue` and `DefaultChart` from `@mochart/vue` —
the component import matters too, because the same `<script setup>` block's template renders
`<DefaultChart ref="chart">`, which would not resolve in a real project. The guide's adjacent
replace-don't-mutate example had the same missing `ref` import and is fixed with it.

Checked against the binding rather than assumed: `expose({ refresh })` at
[DefaultChart.ts:25](packages/mochart-vue/src/DefaultChart.ts#L25), the `ChartRef` shape a template
ref resolves to at [types.ts:13-15](packages/mochart-vue/src/types.ts#L13), and `DefaultChart` as a
named export at [index.ts:2](packages/mochart-vue/src/index.ts#L2). The binding's own tests obtain the
handle exactly this way, so the corrected snippets match working code.

No other framework has the same defect: React's and Lit's snippets already import what they use, and
Svelte's need no import. One adjacent asymmetry was left alone as outside this finding: the Angular
snippets are class-body fragments using `@ViewChild`, `DefaultChart` and `DataRow` with no imports
shown — also not copy-pasteable, but they do not present themselves as complete files the way the Vue
ones do. Docs site builds clean.

### BIND-10 — `dataTestId` is documented in every guide page and no README
**Low · Doc gap · all five binding READMEs** — **Fixed**

All five bindings expose `dataTestId`; it appears in all five
`guide/frameworks/*.md` pages and the generated framework-props reference, and in **zero** package
READMEs — which are the npm package pages and otherwise enumerate the prop surface exhaustively.
The Angular README also drops the guide's "Explicit `width`/`height` inputs win over conflicting
`style` values" line.

**Fix:** add the one-sentence paragraph from each guide to the matching README.

**Fixed in all five binding READMEs.** `dataTestId` is documented at the end of each README's existing
`Sizing` section, matching where the guide pages put it and reusing their wording, so the README and
guide agree per binding.

Checked against the source rather than assumed: the prop is `dataTestId?: string` in all five with no
per-binding renaming — React `src/types.ts:59`, Vue `src/types.ts:57` (runtime prop `src/props.ts:28`),
Svelte `src/types.ts:49`, Lit `src/types.ts:70`, Angular `src/base-chart.ts:44`. Four land it on the
container div; **Angular is the outlier**, setting and removing `data-testid` imperatively on the *host*
element in `ngOnChanges` (`base-chart.ts:174-181`), and Vue's prop deliberately wins over a fallthrough
attribute of the same name (`Chart.ts:38-41`). Each README says which applies to it.

No examples were added: the guides document this in prose only, so there was nothing new to
compile-check.

The core README is correctly silent — `dataTestId` is a binding-only prop with no occurrence anywhere in
`packages/mochart/src`.

One adjacent drift found and deliberately left, since it is not this finding: the
`Explicit width/height inputs win over conflicting style values` line is missing from the Vue and Svelte
READMEs too (it was added to Angular here because BIND-10 quotes it), and the React *guide* page lacks it
while the React README has it — so guide/README drift runs in both directions.

### BIND-11 — `@mochart/angular` pins its peer to Angular 22 despite building partial-Ivy
**Low · Inconsistency · [mochart-angular/package.json:43](packages/mochart-angular/package.json#L43)** — **Fixed**

`"@angular/core": "^22.0.0"` while `tsconfig.build.json` sets `"compilationMode": "partial"` — the
mode whose whole purpose is forward compatibility via the linker. The day Angular 23 ships, every
consumer gets a peer conflict for a build that would have worked. It is also by far the tightest
peer range in the set (React `>=18`, Vue `^3.3.0`, Svelte `^5.0.0`, lit-html `^3.0.0`).

**Fix:** widen to `">=22.0.0"`.

**Fixed by dropping the invented ceiling, keeping the tested floor.** `@angular/core` peer
`^22.0.0` → `>=22.0.0`, matching the loosest-in-set convention `@mochart/react` already uses
(`react: ">=18"`).

The ceiling really was artificial, confirmed against the built output rather than assumed:
`tsconfig.build.json` sets `compilationMode: "partial"`, and every declaration in `dist/*.js` is
`ɵɵngDeclareComponent`/`ɵɵngDeclareDirective`/`ɵɵngDeclareFactory` with `minVersion: "14.0.0"` — no
fully-compiled instructions anywhere. A consumer's own linker reads those, and it is forward
compatible by design, so Angular 23 needs no release here. Nothing in the source constrains the upper
bound either: the imports are all APIs present since 14.x, with no signal-based `input()`/`output()`
and nothing on a removal path.

The floor deliberately stays at 22 rather than dropping to 14 or 16: the emitted `.d.ts` uses the
`ɵɵComponentDeclaration` shape with object-form input metadata, which only exists in `@angular/core`
16+, and 22.0.7 is the only version the build, typecheck and tests actually exercise. Claiming a lower
floor would be unverified.

`package-lock.json` was refreshed lockfile-only, since it had the old range baked into the peer block
and `npm ci` fails on that mismatch; exactly one line changed. Build passes and the output is still
partial-Ivy, typecheck and lint clean, 17 tests pass, and no `EBADPEER` warning appears — the demo app
is on 22.0.7 and the range only widened.

Worth noting for future work: the build is plain `ngc -p tsconfig.build.json`; `ng-packagr` is not a
dependency anywhere in the monorepo.

### BIND-12 — assorted example and type-export nits
**Low · Doc gap** — **Fixed**

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

All four items fixed.

(a) React's and Angular's quick-starts now annotate the config
`MochartInputConfig` (with the `import type`), which is what widens the literal
unions. Verified by probe, not by eye: the unannotated const really does fail
with `Type 'string' is not assignable to type 'Scale | undefined'` on
`categoryAxis.scale`; the annotated form compiles. The `data` array needs no
annotation (`DataRow = Record<string, unknown>`). Vue's quick-starts use
`<script setup>` without `lang="ts"`, so the finding was right to name only
those two.

(b) The two Svelte fences holding bare JS are retagged `js` — matching Vue's
equivalent snippet, which was already tagged that way. Every fence in all five
guides and all five READMEs was audited; those were the only two.

(c) The Lit child-position constraint is documented in the guide and the README,
naming the thrown message. A probe confirmed it: attribute and property parts
both throw, child position inside an element and as the whole template body both
render.

(d) `@mochart/svelte` now declares `ChartRef` — in `src/types.ts`, re-exported
from `index.ts`, which is where the other bindings keep theirs — with prose in
the guide and README saying it types the `bind:this` handle. `svelte-package`
was re-run so the shipped `.d.ts` carries it.

Two corrections to the finding: (d)'s "the only binding with no `ChartRef`" is
imprecise — Angular has none either, deliberately, since `refresh()` is a public
method on `BaseChart` and `angular.md` already tells hosts to type a `@ViewChild`
as `BaseChart`. And the generated framework-props model reads the bindings' prop
interfaces from `types.ts` rather than `index.ts`, so the new export needed no
model change.

---

### BIND-13 — the single-chart export markup is not well-formed XML
**Medium · Bug · [Chart.ts:1316](packages/mochart/src/components/Chart.ts#L1316), [export/index.ts](packages/mochart-export/src/index.ts)** — **Fixed**

*Found while implementing [BIND-7](#bind-7--exports-lose-web-fonts-and-nothing-says-so), not by either review pass.*

Core sets a literal `xmlns` attribute on the live chart svg. The export clone carries it, and serializing that
clone as a document root makes the serializer emit the namespace declaration a second time, so the single-chart
export string contains a duplicate attribute:

```
<svg xmlns="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg"/>
```

An XML parse of it fails with `duplicate attribute: xmlns`. The stitched multi-chart path is unaffected, because
its outer svg deliberately omits the attribute.

**This contradicts `REVIEW-FINDINGS.md`'s B1**, which states "the single-chart path was unaffected … never sets
`xmlns`, and serializes correctly". Either that premise was wrong or the core attribute arrived afterwards; the
duplicate is present today.

Not established here: whether real browsers dedupe the attribute on parse (jsdom does not). Strict SVG consumers
reject a duplicate attribute regardless, which is the case the export is for — B1 itself was raised because
"strict SVG-to-PNG converters reject the document outright".

**Fix:** drop the `xmlns` attribute from the live chart svg — the DOM already carries the namespace, so it is
redundant there — or `removeAttribute('xmlns')` on the clone in `cloneChartSvg`. Then assert a successful XML
parse of the single-chart export, which the current tests do only for the stitched output.

Fixed clone-side: `cloneChartSvg` now removes the `xmlns` the live chart root
carries, so the serializer's own declaration is the only one in the output.
Before the fix, parsing single-chart `getChartSvgText` output as `image/svg+xml`
gave `1:189: duplicate attribute: xmlns.`; after it, both the single and stitched
paths parse clean with exactly one declaration each. New test
`getChartSvgText > serializes as valid xml with a single namespace declaration`;
the stitched test now asserts the parse-error text so failures quote it, and its
expected count moves 3 → 1 (the tiles were carrying redundant literal
declarations too, which the finding did not mention). Bite proof: commenting out
the one `removeAttribute` line fails both tests. 42 tests pass, coverage above all
four thresholds.

**The clone-side arm is the right one, not merely the available one.** HTML
fragment serialization — `svg.outerHTML`, DevTools copy, and the golden snapshot
oracle — does not synthesize namespace declarations; it only emits attributes that
are present. Core's literal `xmlns` is what makes such a copy usable as a
standalone `.svg`. Dropping it in core would fix the XMLSerializer path and
degrade every HTML-serialization consumer. The duplication is specific to
re-serializing the element as an XML document *root*, which is exactly what the
export does, so the export is where it belongs. The core-side arm should be
closed, not filed.

**The finding understates the severity.** Playwright against all three engines
shows none of them dedupes and all three reject: Chromium and WebKit
`Attribute xmlns redefined`, Firefox `duplicate attribute`, and
`<img src="data:image/svg+xml,…">` fires `onerror` in all three while the
single-declaration version loads. So single-chart `exportPNG` was failing with
`mochart-export: failed to rasterize the chart svg` in every real browser, and a
downloaded single-chart `.svg` would not open — the same failure mode as the
original stitched-PNG bug, invisible to the suite because jsdom never loads
images.

**B1's premise was wrong when written.** Core has set `xmlns` since a2e370e6
(2026-07-16), the only commit ever to touch that string in `Chart.ts`; the export
package arrived two days later in 2f56a5e2. The attribute did not appear after
B1 — "the single-chart path never sets `xmlns`" was never true.

Unrelated observation while measuring: this package's coverage flakes run to run
(functions 96.87 then 93.75, against a 93 floor), most likely the
`setTimeout(() => URL.revokeObjectURL(url), 1000)` in `saveBlob` racing process
exit.

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
**Medium · Doc inconsistency · [guide/theming.md:98](packages/mochart-docs/guide/theming.md#L98)** — **Fixed**

"The one place it is rejected is the series color-scale bounds (`colorMin` / `colorMax` and
friends)". The config properties are `colorScale.min`, `colorScale.max`, and
`colorScale.base.{aboveMin,aboveMax,belowMin,belowMax}`. `colorMin`/`colorMax` exist only as
`CreateHeatmapOptions` fields — a different API. Every other page uses the `colorScale.*` names.
A reader greps their config for `colorMin`, finds nothing, and concludes it doesn't apply.

**Fixed.** The theming guide now names the real properties — `colorScale.min`, `colorScale.max`,
`colorScale.missing` and `colorScale.base.*`. `colorMin`/`colorMax` exist, but on the heatmap
helper's options, which is a different API; the sibling config guide already used the right names.

The finding missed a second error in the same sentence: "the one place" is wrong. The strict colour
check applies equally to `colorPalette` entries and to gradient stop colours, so the guide now lists
all three.

The stale comment in the validator itself named the same wrong properties and has been corrected
too, since that is where the next person looks to find out why the check is strict.

### DOC-5 — "Bar fills default to half opacity" — the default is `0.8`
**Medium · Doc inconsistency · [recipes/color-by-value.md:35](packages/mochart-docs/recipes/color-by-value.md#L35) and [examples/colorByValue.ts:18](packages/mochart-docs/examples/colorByValue.ts#L18)** — **Fixed**

Both `shapeStyle.normal.fillOpacity` and `strokeOpacity` default to `0.8` for `bar` (0.9 line/none,
0.8 area). Nothing defaults to 0.5. It is the stated justification for the example overriding both
to `1`, and a reader computing expected colours from "half opacity" gets the wrong answer. The
duplicate wording in the example file is why the CI example check can't catch it — the check
validates configs, not comments.

**Fixed.** Bars default to `0.8` for both fill and stroke opacity, not half. Corrected in the recipe
and in the example's own comment, which the recipe embeds — so both copies said it.

The example's override to full opacity is still right; only the reason given for it was wrong.

Nothing would have caught this: the example checker validates the config object, never the
comments.

### DOC-6 — the object-sections list in the config guide is missing `accessibility` and `pie`
**Medium · Doc gap · [guide/config-model.md:31](packages/mochart-docs/guide/config-model.md#L31)** — **Fixed**

The guide enumerates 9 of the 11 object sections the enhancer emits. The authoritative set
(verified by `checkSectionCoverage.ts`) also contains `accessibility` and `pie`. The list-sections
bullet immediately below *is* complete, so the object list reads as exhaustive too — and both
omitted sections are first-class with dedicated pages.

**Fixed.** The list now names all twelve object sections. It was missing three, not two — the
finding predates `clipIndicator`, which was added while working through
[ANIM-1](#anim-1--an-infinity-phase-duration-wedges-the-chart-in-a-permanent-raf-loop). Verified by
comparing the guide against the section registry rather than by eye.

The list-sections bullet beside it was already complete, six of six.

Worth noting the asymmetry this exposes: a missing section in the registry is caught by a CI check,
but a missing section in the prose beside it is not. That is why this one drifted.

### DOC-7 — pie keyboard activation is described as "a click at the slice's center"
**Medium · Doc inconsistency · [guide/accessibility.md:81](packages/mochart-docs/guide/accessibility.md#L81) vs [PieSeries.ts:116](packages/mochart/src/components/PieSeries.ts#L116)** — **Fixed**

Enter/Space calls `this.state.onSeriesClick()` directly. The code comment explicitly *rejects*
positional synthesis: "a synthesized click's coordinates can land outside the chart rect on an
exploded edge slice and get swallowed there". `ChartSliceClickPayload` carries only `seriesId` —
there are no coordinates to place at a centre. The neighbouring cartesian sentence *is* precise, so
a reader reasonably reads this one as equally precise and looks for coordinates that never arrive.

**Fixed in the docs, because the code is deliberately right.** Keyboard activation calls the slice's
click handler directly and invents no pointer position — and the comment beside it explains why: a
synthesized click on an exploded edge slice can land outside the chart rect and be swallowed.

The guide now says Enter and Space do what clicking the slice does, the focus toggle and
`onSliceClick`, with no pointer position invented for it. The payload has no coordinates either, so
the old wording promised something a host could never observe.

### DOC-8 — contributor docs omit the generated API/props/framework-props pipeline and its CI ratchets
**Medium · Doc gap · [CONTRIBUTING.md:26-81](CONTRIBUTING.md#L26), [:140](CONTRIBUTING.md#L140); [mochart-docs/README.md:6](packages/mochart-docs/README.md#L6)** — **Fixed**

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

**Fixed by extending the existing structure rather than starting a parallel one.** `CONTRIBUTING.md` gains a
section on the props/callbacks/framework-props pipeline — `apiReferenceModel.ts` → `generated/api-reference.json`
with pages declared in `pageSources`, `generateBindings.ts` → `binding-reference.json` from each binding's
`types.ts` interfaces, Angular decorators and Vue `props.ts`, description inheritance from the core prop, and the
single dynamic `reference/[section].md` route all three render through. It records that the three JSON models are
gitignored while `mochart-docs.html` is tracked, and that `npm run gen` gates both the docs build and root
`npm test`.

A "What fails the generators" subsection lists the five integrity errors with their remedies, and a checklist
walks adding a chart prop end to end, including the binding renamings the mapper recognises
(`onChartClick` → `chartClick`, `getLoadingComponent` → `loadingComponent`/`loadingTemplate`) and Vue's double
declaration. Five rows were added to the existing guardrail table, and the config-parity row's "where" was
corrected — it fires in root `npm test`, not only in `build:pages`. The config bullet now says parity is checked
at every nesting level and inside array-element shapes, cross-linking
[CONFIG-7](#config-7--array-element-shapes-have-no-documentation-in-the-config-reference).
`packages/mochart-docs/README.md` describes all three generated families and what its own `npm test` actually
checks.

TOOL-7's lint and deadcode text was deliberately left alone — rows were added to its table rather than a second
one being started.

Every documented command was run: `gen`, `generate-docs`, `stamp-version --check`, the docs package's tests
(41 examples, 230 exports, 18 sections), core's 109 files / 1651 tests, and a `gen` + `vitepress build`. All exit
0.

Corrections to the finding: the guardrail table had nine rows, not six (though it was indeed missing API and
section coverage); `documentation-plan.md:114` describes `reference/api.md`, which **is** still hand-written, so
that citation is not wrong — the generated pages are props/callbacks/framework-props, a different item; and
`generateBindings.ts` lives in `mochart-docs/scripts/`, not beside `apiReferenceModel.ts`.

Two source defects surfaced while mapping the pipeline and are filed separately rather than folded in:
[DOC-14](#doc-14--generatebindings-writes-its-model-before-reporting-integrity-errors) and
[TEST-20](#test-20--the-api-coverage-ratchet-omits-chartseriesclickpayload).

### DOC-9 — `documentation-plan.md` describes the pre-delivery state in the present tense
**Medium · Doc inconsistency · [docs/documentation-plan.md:3](docs/documentation-plan.md#L3) vs [:27-47](docs/documentation-plan.md#L27)** — **Fixed**

Line 3 says "Status: delivered (August 2026) — every non-optional item is checked off" (true).
Lines 27-47 then assert, unqualified: "**No docs site.**", "**The config reference is a dead
end.**", "**No IDE hover docs.**", "**No task-oriented guides.**", "**No API reference**" — each
directly contradicted by a checked item further down the same file. Separately, `:108-110` records
"strict validation requires `version` — every README quick start was broken", while `version` is
now optional and the quick starts deliberately omit it. This is the named plan of record; anyone
opening it reads five flat statements that the work does not exist.

**Fixed.** The snapshot section is retitled "Where we were (the pre-plan snapshot, July 2026)" and
its gap list is in the past tense, so it no longer reads as a list of things still missing when the
status line two paragraphs above says the plan is delivered.

The `version` claim is tensed too: strict validation *required* a version at the time. It does not
now — the field is optional, and an omitted one is read as the current format.

Kept as a living document rather than frozen: its history shows it edited after delivery, so
retitling the snapshot is right where declaring the whole file historical would not be.

The finding's third suggestion — adding the generator work as a new phase item — belongs to
[DOC-8](#doc-8--contributor-docs-omit-the-generated-apipropsframework-props-pipeline-and-the-docs-checks),
not to a tense fix.

### DOC-10 — the movalid README's validator and chain lists are each missing one member
**Low · Doc gap · [movalid/README.md:48](packages/movalid/README.md#L48), [:64](packages/movalid/README.md#L64)** — **Fixed**

Enumerated against the real export: the "Objects" bullet omits `partialObjectWithShape` — the one
`@mochart/core` actually uses for nested config objects — and the chainable-extension list omits
`withCustomName`, the 8th method on every validator, also used throughout core. Both lists
otherwise match the implementation exactly (45/45 validators present) and read as complete
inventories, so the two missing members are precisely the ones a reader meets first.

**Fix:** add both.

**Fixed, and both lists were shorter than the finding says.** The validator inventory now covers all
**49** (48 factories plus `conditional`), with `partialObjectWithShape` added to the Objects bullet — the
finding's arithmetic of "45/45 present" is wrong, though the single omission it names is right. The
chainable-extensions list now covers all **7**, with `withCustomName` added; it is the seventh extension,
not "the 8th method", since `getErrorMessage` is not an extension and is already described in the intro.

Verified mechanically rather than by eye: the module was imported and `Object.keys(validators)` diffed
against the identifiers in the README section — zero README-only names, zero source-only names. Each
member carries a source line. `partialObjectWithShape`'s gloss comes from running it: `{}` and `{a:1}`
pass, `{a:'x'}` fails, and an unknown key fails unless `allowExtraProperties` is set.

The section lead-in was also wrong and is rewritten: "extensions widen what passes and extend the error
message" is false for the three message extensions and for `withCustomName`, so each bullet now states
its own effect, and the lead-in notes that `conditional` is included (verified live, now that
[VAL-2](#val-2--conditional-returns-a-validator-missing-three-methods-its-own-type-declares) attaches
them) and that every extension returns a re-extendable validator.

Checked against the five other movalid fixes that landed alongside this one: nothing in the README was
made false by them. Its only quoted messages are in the Usage block, and those were executed and are
byte-identical to the comments.

One thing found and not fixed, because it is a third list rather than either of the two this finding
names: the intro paragraph lists 6 of the `Validator` metadata fields where the interface carries 12,
omitting `validatorName`, `customName`, `extensionNames`, `itemValidator`, `alternativeValidators` and
`errorMessages` — and it reads as complete. `customName` in particular is consumed outside the package, at
[configReferenceModel.ts:600](packages/mochart/scripts/configReferenceModel.ts#L600), which maps it to
`editor.format`.

### DOC-11 — `date-axis.md` says an area fills to "the value axis base", which is unset by default
**Low · Doc inconsistency · [recipes/date-axis.md:26](packages/mochart-docs/recipes/date-axis.md#L26)** — **Fixed**

`valueAxes.base` defaults to `null` for an unstacked axis — which the date-axis example is — and
`SeriesPositions` then falls back to `valueAxisScale.range()[0]`, the axis's lower edge. On an axis
whose minimum is negative the two differ visibly: the reader expects the fill to stop at 0 and it
reaches the bottom of the plot.

**Fix:** "The `area` renderer fills down to the axis base when one is set (`valueAxes.base`), and
otherwise to the bottom of the axis."

**Fixed, and in the generated reference too.** Verified against the source before rewriting: `base`
is a conditional default — `0` in pie mode, `0` when the value axis has stacks, and `null` otherwise
([valueAxisConfig.ts:55-62](packages/mochart/src/config/defaults/valueAxisConfig.ts#L55)) — and
`seriesBasePosition` starts at `valueAxisScale.range()[0]` and only moves to `valueAxisScale(base)`
when `base !== null` ([SeriesPositions.ts:42-54](packages/mochart/src/utils/SeriesPositions.ts#L42)).
The recipe's own example declares no stacks and no base, so it takes the `null` branch. The finding's
premise holds.

`recipes/date-axis.md` now says the area fills to the value axis `base` when one is set and to the
minimum end of the axis when it is not, noting that unset is the default for an axis without stacks.
"Minimum end of the axis" rather than "the bottom": the fallback is `range()[0]`, which is the left
edge on an inverted chart.

The same imprecision was in `config/docs/seriesConfig.ts`'s `renderer` detail — "fills between the
value line and the value axis base" — which feeds both the generated JSDoc in `types/config.ts` and
the reference table in `mochart-docs.html`, so that is corrected and both generated files regenerated.
`recipes/positive-negative.md` and `examples/posNeg.ts` already described the unset default correctly
and needed nothing.

The docs site builds clean (no dead links or anchors) and the new `valueAxes.base` link target
resolves; core's 1612 tests and typecheck pass.

### DOC-12 — two small factual slips in the recipes
**Low · Doc inconsistency · [recipes/bar-caps.md:32](packages/mochart-docs/recipes/bar-caps.md#L32); [candlestick.md:36](packages/mochart-docs/recipes/candlestick.md#L36), [ohlc.md:40](packages/mochart-docs/recipes/ohlc.md#L40), [waterfall.md:31](packages/mochart-docs/recipes/waterfall.md#L31)** — **Fixed**

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

**Both slips fixed, in the docs and at the source of the wrong word.**

(a) `recipes/bar-caps.md` now names the demo *Capped*, which is what
[demos.json:86](packages/mochart-demo-data/src/demos.json#L86) declares (`"id": "capped"`,
`"title": "Capped"`). "Capped Bars" is the chart's own title text inside its config, not the gallery
entry. The rest of the sentence held up: that config really does carry Round, Curve and Point each with
`capExpand` both ways, plus a None series.

(b) The direction colours are described as **teal-green/red** (and teal-green/red/blue for the
waterfall) rather than aqua/red. `#1baf7a` sits at a hue near 158°, which is a green with a teal cast,
not an aqua. The old framing also undercut itself — it contrasted the default with "the conventional
green/red" when the default *is* a green — so the sentence now says the distinction is the shift toward
teal, keeping the accessibility rationale unchanged. Fixed in `recipes/candlestick.md`, `recipes/ohlc.md`
(which shares `DEFAULT_COLORS` with candlestick via
[Ohlc.ts:2](packages/mochart/src/data/Ohlc.ts#L2)) and `recipes/waterfall.md`.

The finding's second half — the two source comments that were the origin of the word — is included:
`Candlestick.ts:144` and `Waterfall.ts:85` no longer say "Aqua". `grep -ri aqua` over
`packages/mochart/src` and the recipes now returns nothing, so the docs and the code agree.

Docs site builds clean (via `npm run gen` + `vitepress build`; the packaged `build` script's
lib-freshness prebuild was failing on other in-flight work at the time, unrelated to these edits).

### DOC-13 — filtering every series does not activate the documented no-series state
**Medium · Doc gap · [chart-states.md:60](packages/mochart-docs/guide/chart-states.md#L60) vs [Chart.ts:1234](packages/mochart/src/components/Chart.ts#L1234)** **[from SOL review]** — **Fixed** (docs); behaviour question open

`chart-states.md` tells readers that turning every series off through the legend produces the
no-series placeholder. The runtime gate is `mochartConfig.series.length === 0` and nothing else:
legend filtering sets `filteredSeriesFlags` and re-derives the data, but leaves the configured
series list intact — so filtering everything yields an empty plot with axes still drawn and no
message at all.

Neither state is exercised by a test — see
[TEST-3](#test-3--the-no-data-and-no-series-chart-states-are-never-rendered) — so nothing holds the
guide and the gate together.

**Fixed in the docs; the behaviour question is left open deliberately.** The guide and the example
both claimed that filtering every series from the legend lands the chart in the no-series state. It
does not: the state is gated on the *configured* series list being empty, and filtering only builds
a set of hidden ids, leaving the configured list untouched. Both copies now say so plainly.

The state itself is not unreachable — an empty `series` list with data present renders it, which is
exactly what the live example beside the text does. Only the legend route was fiction.

**Still open as a question:** whether filtering every series *should* show the no-series
placeholder. That means changing the gate from "no series configured" to "no series visible", which
is a visible behaviour change for every chart with a legend and interacts with
[DATA-6](#data-6--getseriescontainerfilteredseriescounts-counts-unfiltered-series). Raised rather
than decided here.
---

### DOC-14 — `generateBindings` writes its model before reporting integrity errors
**Low · Bug (docs generator) · [generateBindings.ts](packages/mochart-docs/scripts/generateBindings.ts)** — **Fixed**

*Found while implementing [DOC-8](#doc-8--contributor-docs-omit-the-generated-apipropsframework-props-pipeline-and-its-ci-ratchets), not by either review pass.*

The same defect [API-12](#api-12--generate-docs-writes-its-output-before-reporting-integrity-errors) fixed in
`generator.ts`, still present in its sibling: `generateBindings.ts` writes
`mochart-docs/generated/binding-reference.json` and only afterwards reports its integrity errors, so a failing
run leaves a model on disk that its own checks rejected. `generator.ts` now builds both models, reports, and
returns before writing anything; this script should do the same.

Lower impact than API-12's was, because `binding-reference.json` is gitignored — the stale artifact cannot be
committed. It can still be picked up by the next docs build, which is exactly the confusion API-12 removed.

**Fix:** build the model, report the errors, return early when there are any, then write — mirroring
`generateDocs`.

Fixed by reordering `generateBindings` to build → check → report → exit before it
writes anything, so a failing integrity check leaves the previous model on disk
untouched.

Bite proof, with a bogus entry added to React's `expectedMissing` (a real integrity
failure): under the old ordering the model's md5 changed and the bogus key landed
in the written JSON; under the new ordering the md5 is unchanged and the key does
not appear. The perturbation was restored byte-identically (md5-verified, empty
`git diff`).

One case the finding does not mention: a *first-ever* failing run now leaves no
artifact at all. Checked every consumer — only `.vitepress/lib/bindingModel.ts`
reads `binding-reference.json`, and it already throws a clear "run npm run gen"
error; the three gate scripts do not read it and `checkApiCoverage` exits 0
without it. So nothing downstream gets confusing, and the script's final error
line now names which state it left behind rather than exiting 1 silently.

No test added: `mochart-docs` has no unit-test runner (its `test` script is the
three gate scripts) and the behaviour is only observable as process ordering.

`npm run gen` exits 0 and leaves `binding-reference.json` byte-identical to the
pre-change baseline; the three gates pass (41 examples, 233 exports, 18 sections);
typecheck and `eslint packages/mochart-docs` clean.


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
**High · Bug · [vanilla EditableChart.ts:682](packages/mochart-demo-vanilla/src/components/single/EditableChart.ts#L682) and ~15 more sites, all six ports** — **Fixed**

`ChartTab` mounts one `EditableChart` per chart, and every instance renders the full control strip
with fixed ids (`edit-mode`, `edit-reset-categories`, `edit-apply-series`, `edit-play-slices`, …).
Only `showChartCountControls` and `showShareButton` are per-instance. With the "2nd Chart" toggle
on, ~22 ids exist twice — invalid HTML; `getElementById`/`#id` selectors and any `aria-controls`
resolve to the first chart only, and AT sees two identically-identified control sets.

**Fix:** suffix ids per chart instance (thread the index into an `idPrefix`, as `ExportShareMenu`
already does), or drop the ids where nothing consumes them.

**Needs an answer — not fixed.** Confirmed, and one fact worth adding before the choice is made:
**nothing in the repo consumes any of the ~22 `edit-*` button ids.** No `getElementById`, no
`for=`, no `aria-controls`, no CSS rule, no e2e selector. They are pure debugging affordances.

The one id here that *is* consumed is `edit-export-share`: `createMenuController`'s `ensureId`
returns an element's existing id rather than minting one, so with two charts both panels'
`aria-controls` point at a duplicated trigger id. That half is a genuine ARIA defect rather than
a validity nit — and note `idPrefix` is already a prop, it is just passed the constant `'edit'`
from every chart.

The reason this is not applied automatically: it is ~130 mechanical edits across six ports whose
id syntax all differs (object literals, JSX, Angular static attributes, Lit template literals),
and the two options leave the demos in materially different states.

**Answered: dropped, across all six ports.** All 22 `edit-*` ids removed from every port (132 in
total) — deleted rather than renamed, so the duplication is gone rather than made unique. The
button `id` prop became optional in each port, guarded so an undefined id renders no attribute
(`ifDefined`/`?? nothing` in Lit, `[attr.id]="id ?? null"` in Angular, omitted natively by React,
Vue and Svelte).

**The ARIA defect fixed itself.** `ExportShareMenu`'s `idPrefix` prop existed only to build
`idPrefix + '-export-share'`, so it was removed along with its three call sites per port. Every
port's menu helper already mints a unique trigger id when none is supplied — demo-common's
`ensureId`, React's `useId()`, Svelte's `Menu` class — so two charts now get distinct ids with no
threading. This also removes Lit's `idPrefix` default, which is
[DEMO-19](#demo-19--lits-exportsharemenu-defaults-idprefix-to-edit).

**Verified in Chromium on the built site**, all six galleries, opening a single-chart demo and
clicking the 2nd Chart toggle:

| Port | Duplicate ids, 1 chart | Duplicate ids, 2 charts | `aria-controls` resolving | Page errors |
|---|---|---|---|---|
| vanilla | 0 | **0** (was 22) | 6/6 | none |
| react | 0 | **0** | 3/3 | none |
| vue | 0 | **0** | 3/3 | none |
| svelte | 0 | **0** | 3/3 | none |
| lit | 0 | **0** | 3/3 | none |
| angular | 0 | **0** | 3/3 | none |

The other id namespaces in these ports (`config-*`, `data-*`, `transition-*`, `step-*`,
`sparkline-*`) sit outside the per-chart component and never duplicated — the zero counts above
confirm it. Full gate green including 79 e2e tests.

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
**High · Bug · [vanilla ChartTab.ts:118](packages/mochart-demo-vanilla/src/components/single/ChartTab.ts#L118)** — **Fixed**

`showChartCountControls` is computed only inside the *creation* loop; the update loop omits it,
`EditableChartUpdate` has no such field, and the component captures it as a `const`. Open a demo
below ~962px and widen: the toggle stays hidden and the feature is unreachable until reload. Open
wide and narrow: the toggle stays visible on a viewport that cannot fit two charts. The five
framework ports recompute it every render.

**Fix:** add `showChartCountControls` to `EditableChartUpdate`, pass it from the update loop, and
make the button's presence part of `sync()`.

**Fixed automatically.** Applied as recommended. The button and its `demo-btn-group` are now built
unconditionally, so `commonControls` keeps a stable identity — the reparenting logic in
`placeControls` uses `commonControls[0].parentElement` as its placement guard, and a conditionally
built array would have made that guard mean different things at different widths. Presence is a
`display` toggle set at the top of `placeControls`. The two overflow-menu lists drop the control
*entirely* rather than carrying a hidden one, so a folded panel gets neither an empty menu row nor
the dangling divider `sliceMenuTail` would otherwise leave. `ChartTab`'s update loop became an
indexed `for` (a `forEach` closure loses the `mochartDemoConfig !== null` narrowing). Typecheck
across 20 workspaces, lint, deadcode clean; demo-vanilla builds.

### DEMO-6 — Config tab's Invert/Slow state and Reference links go stale after any edit
**Medium · Bug · [vanilla ConfigTab.ts:280](packages/mochart-demo-vanilla/src/components/single/ConfigTab.ts#L280), [:186](packages/mochart-demo-vanilla/src/components/single/ConfigTab.ts#L186), all six ports** — **Fixed**

The Invert/Slow pressed states and `getReferenceSectionIds(...)` both read `demoConfig`, refreshed
only by `setConfig` or a successful `applyConfigToggle` — never by `onTextChange` and never by
Apply. `DemoSingle` keeps the ConfigTab's `config` prop unchanged on Apply, so the prop-driven
refresh never fires either. Type `"plot": { "inverted": true }` and press Apply: the chart inverts
but the Invert button stays un-pressed with the wrong icon, and adding a `legend`/`tooltip` section
never adds its Reference link.

**Fix:** rebuild `demoConfig` from the current text in the change handler (or at minimum on Apply),
reusing `toggleConfigFromText`'s parse-and-build path with a no-op transform.

**Fixed in demo-common, wired into all six ports.** A new `demoConfigFromText(configText,
previousDemoConfig)` rebuilds the derived config view from the *current* editor text, so the
Invert/Slow pressed states and the Reference links track an edit that has not been applied yet. Each
port's text-change handler calls it — one line in vanilla, lit, svelte, vue and angular, and a small
`onTextChange` in react, which had the handler inline in JSX. Verified all six.

Text that does not parse, or that parses but fails to build, keeps the previous view: this runs on
every keystroke, so mid-typing JSON must not blank the footer, and unlike `parseConfigFromText` it
reports nothing.

Demonstrated in a real browser, not just reasoned about. Chromium against the built vanilla gallery:
open a demo, go to Config, type `"plot": { "inverted": true },` into the editor without pressing Apply,
and the Invert button's `aria-pressed` goes `false` → `true`. Against a build with this change reverted,
the same script leaves it `false` while the editor text changes — the exact staleness the finding
describes. No page errors either way.

Also covered as a unit: three cases in `test/configDataEditing.test.ts` for the tracked edit, the
mid-keystroke parse failure and the parses-but-does-not-build case. demo-common 247 tests, whole-repo
typecheck and lint clean.

### DEMO-7 — vanilla leaks a theme subscription and the whole gallery DOM on every visit
**Medium · Bug · [vanilla ModeSwitcher.ts:154](packages/mochart-demo-vanilla/src/components/misc/ModeSwitcher.ts#L154)** — **Fixed**

`themeToggleButton()` returns `themeToggle().el` and discards the `theme.onChange` unsubscribe. Its
only caller is the gallery header, and `mountApp`'s `clearView()` has no `gallery` branch while
`showGallery()` mints a fresh gallery on every visit. Every demo → gallery round trip adds one live
listener on the module-level theme controller, and each listener's closure retains the detached
button and, through it, the discarded gallery DOM. The five framework galleries mount an
unsubscribing component instead.

**Fix:** give `galleryPage` a `destroy()` that calls the theme toggle handle's `destroy`, and add a
`gallery` branch to `clearView()`.

**Fixed, and measured.** `GalleryPage` now takes the `themeToggle()` handle rather than the element-only
form and exposes `destroy()`, which drops the toggle's theme subscription; `App.clearView()` calls it in the
same branch as single/multi/random. The module-level `theme` controller kept a listener set for the tab's
lifetime, so every `showGallery()` added one permanent listener whose closure held the detached button and,
through its parent chain, the entire discarded gallery DOM.

`themeToggleButton()` is deleted rather than kept: it existed only for the gallery, "the one caller that
cannot use the handle", which now can. Leaving it would be a live trap for the next caller, and nothing else
imported it. The finding's wording implied keeping it, so this is a deliberate departure.

Measured in Chromium over the built gallery, 20 gallery ⇄ demo round trips, with
`HeapProfiler.collectGarbage` then `Performance.getMetrics` and a direct count of retained toggle buttons
via `Runtime.queryObjects`:

| | after one gallery | after 20 round trips |
|---|---|---|
| before | 805 nodes, 143 listeners, 1 toggle | **15,427 nodes, 2,663 listeners, 21 toggles** |
| after | 805 nodes, 143 listeners, 1 toggle | **807 nodes, 143 listeners, 1 toggle** |

21 retained toggles for 20 trips is exactly one leaked gallery per visit, and growth is now flat — identical
at 20 and 60 trips. Worth recording for the next person who measures this: `Runtime.queryObjects` returns an
array that itself pins every object it found, so an unreleased handle from the first sample makes the fixed
build look like it still retains a view; releasing both remote objects before collecting again is what
produces the flat 807.

Functionally checked on the same build: the revisited gallery's toggle still flips the theme and repaints its
own label, a theme change made inside a demo shows up in the gallery built afterwards, and exactly one toggle
exists at a time. Workspace typecheck and lint clean.

The `message` view has the same missing `clearView()` branch but owns no subscriptions and nothing retains
its element, so it is not a leak and was left alone.

### DEMO-8 — vanilla `chartHost` can mount a chart after it has been destroyed
**Medium · Bug · [vanilla chartHost.ts:56](packages/mochart-demo-vanilla/src/components/misc/chartHost.ts#L56)** — **Fixed**

The mount is deferred with `queueMicrotask(() => { chart = create(...) })` and `destroy()` only
destroys `chart` if already set. A destroy in the same tick leaves `chart === null`, then the
microtask creates a chart nobody holds a handle to — keeping its listeners and animation state
alive for the page's lifetime. The binding this file explicitly mirrors guards exactly this case
([lit directives.ts:88](packages/mochart-lit/src/directives.ts#L88)).

**Fix:** track a `destroyed` flag (or cancel the queued mount) and bail inside the microtask.

**Fixed with a destroyed flag.** `chartHost` sets it in `destroy()` and the deferred mount microtask bails
on it, so a host destroyed before its queued mount runs never builds a chart. Nothing else needed changing:
`update()` after destroy already no-ops because `chart` stays `null`, and `destroy()` was already
idempotent.

Reproduced twice in Chromium against the real dev server, importing the demo's own modules so nothing was
stubbed:

* **Component level** — `demoSparkline()` mounts six hosts synchronously while it is being constructed, so
  six mount microtasks are queued by the time the handle is returned. Construct, append, `destroy()` in one
  task: each `destroy()` ran with `chart === null`, then the microtasks built six charts into the destroyed
  view.
* **App level** — `navigate('/sparkline'); navigate('/demos')` in one task, which the router permits because
  `navigate()` calls its listeners synchronously. `clearView()` destroyed all six hosts, `replaceChildren()`
  detached the subtree, and the flush then mounted six charts into it — invisible, but holding core
  listeners, `ResizeObserver`s and animation state for the page's life.

Counted svg elements, same script either side of the fix: case 1 went from 6 stray charts in the destroyed
view to 0; case 2 from 6 to 0, with the control view still at 6 both times. The normal deferred mount is
untouched — a regression pass over `/single`, `/multi`, `/random`, `/sparkline`, `/rotation` and
`/transition` gives the expected 1, 4, 1, 6, 55 and 1 charts with no page errors. Workspace typecheck, lint
and build clean.

The finding's framing understates the reach: because `observeSize()` also reports on a microtask, hosts
created from a size report queue their mount inside the same flush, so a destroy landing anywhere in that
flush hits the window — not only "a destroy in the same tick" as a mount call. No pure user gesture reaches
it today (clicks, resizes and popstates each land in their own task, and the four route-level destroys all
precede their mounts), but two synchronous `navigate()` calls or a construct-then-drop do, and both are
things the code permits.

### DEMO-9 — tab strips carry no tab semantics, and Multi renders a dead tab button
**Medium · Bug (a11y) · [vanilla DemoSingle.ts:115](packages/mochart-demo-vanilla/src/components/single/DemoSingle.ts#L115), [DemoMulti.ts:37](packages/mochart-demo-vanilla/src/components/multi/DemoMulti.ts#L37), all six ports** — **Fixed**

The Chart/Config/Data strip is `<ul><li><button class="demo-tab active">` with no
`role="tablist"`/`role="tab"`, no `aria-selected`, no `aria-controls`, no `aria-current` —
selection is conveyed by the `.active` class alone. In Multi mode the single "Chart" button has no
click handler at all. The pending-changes badge is `aria-hidden="true"` with the explanation only
in a `title`, so that signal is inaudible too.

**Fix:** add `role="tablist"`/`role="tab"` + `aria-selected` + `aria-controls` and `role="tabpanel"`
on the container; render Multi's single tab as non-interactive; expose the pending state via
`aria-describedby` or visually-hidden text.

**Fixed in demo-common, wired into all six ports, and verified in a browser.**

`demo-common/src/tabs.ts` (new) holds the framework-free part: the `DemoTab` descriptor types,
`demoTabId`/`demoTabPanelId`/`demoTabPendingId`, `getDemoTabPanelAttrs(name)` returning
`{ id, role: 'tabpanel', 'aria-labelledby' }` spreadable in every template dialect, and
`nextDemoTabIndex(key, activeIndex, count)` — the horizontal-tablist key contract (Left/Right wrapping,
Home/End, `null` for keys the strip must not swallow). One new copy string, `demoText.tabs.listAria`, names
the tablist, which has no visible label. Seven tests in `demo-common/test/tabs.test.ts`.

Each port gained one tab-strip component owning the `role="tablist"` list, `role="presentation"` on the
items, and per tab `role="tab"` + `id` + `aria-selected` + `aria-controls` + roving `tabindex` + click and
keydown. `TopBar` stopped wrapping the projected tabs in its own list, the four views with a strip (single,
multi, transition, random) pass descriptors instead of markup, and the eight panes carry the panel attrs.

Three judgement calls worth recording:

* **Multi's dead tab button is now a caption, not a one-tab tablist** — a `span`, no roles. A tab you
  cannot activate is the same dead control in ARIA clothing, and with a single pane there is nothing to
  navigate. Its pane therefore carries no `tabpanel` role, since there is no tablist for it to belong to.
* **The keyboard is the full APG pattern, not a partial one**: automatic activation (arrowing selects,
  which is what a click always did, and every pane stays mounted so it costs nothing), roving `tabindex`
  so the strip is a single Tab stop, Home/End, wrapping, and `preventDefault` only for keys the strip owns.
  No `tabindex="0"` on the panels — they all contain focusable controls, so that would only add a
  redundant stop.
* `aria-selected`, not the `aria-current` the finding suggests: `aria-current` is not a tab state.
  `aria-current` belongs to [DEMO-10](#demo-10--115-roletoolbar-containers-none-with-an-accessible-name)'s
  mode switcher, untouched here.

The pending badge is now audible too: a hidden note holds the explanation and the Chart tab points
`aria-describedby` at it while the badge shows.

Browser-verified with Chromium against the built **vanilla** and **angular** (zoneless, the riskier) demos:
the tablist and its `aria-label`, three tabs with `aria-selected`, `aria-controls` resolving to three
`tabpanel`s whose `aria-labelledby` resolves back, inactive ones `inert`; `ArrowRight` three times walks
Chart → Config → Data and wraps, `ArrowLeft` wraps the other way, Home/End jump, one `Tab` leaves the strip
entirely, `ArrowDown` does nothing, `Enter` still activates; the pending state exposes
`role: tab, selected: false, description: "Applied changes are waiting…"` in the accessibility tree; and
Multi's strip contributes zero tab nodes and zero focus stops.

The finding located the strip in Single and Multi; the same strip is also in Random and Transition, so
those are fixed too — otherwise the ports would disagree with themselves. Whole-repo typecheck and lint
clean, demo-common 254 tests pass, all six ports build.

Two things deliberately left: `.demo-tab { cursor: pointer }` still applies to Multi's caption span (fixing
it needs `css/demo.css`), and the ErrorTab fallback pane does not reproduce the panel id, so `aria-controls`
dangles in that state only — threading a tab name through it is roughly seven call sites in six ports for a
boundary that already announces itself with `role="alert"`.

### DEMO-10 — 115 `role="toolbar"` containers, none with an accessible name
**Medium · Bug (a11y) · [vanilla ModeSwitcher.ts:30](packages/mochart-demo-vanilla/src/components/misc/ModeSwitcher.ts#L30) and 114 more sites** — **Fixed**

Every control strip declares `role="toolbar"` and none is labelled. The mode switcher's visible
`Mode:` label is never wired via `aria-labelledby`, and `demo.css` `display:none`s it at ≤900px.
Two or three unnamed toolbars are on screen at once in every mode. Related: the current mode is
marked with `aria-current` only on phones, so at desktop widths the active segment announces as
"dimmed" with no "current" state.

**Fix:** give each toolbar an `aria-label` from a new `demoText` entry, and set
`aria-current="page"` on the current mode at all widths.

**Fixed by removing the role from 108 containers and naming the one that deserves it — not by naming all of
them.** The finding's prescribed fix, an `aria-label` on each, would have entrenched a false contract on almost
every site.

There were **114** `role="toolbar"` containers (the 115th occurrence is the literal inside `demo-common`'s own
doc comment), in exactly two kinds:

* **108 layout strips, now with no role.** Every one is a `div.demo-toolbar` that exists to be a flex row: tab
  footers, chart-control strips, the Multi transport and grid rows, the export/share wrapper. None has a keydown
  handler — no arrow keys, no Home/End, no roving tabindex — so each button is its own tab stop, and about 30 of
  them wrap a *single* button. `role="toolbar"` promises a single-tab-stop composite with arrow navigation, so on
  these it was both a false claim and an extra unnamed node above already-named buttons. The `.demo-toolbar`
  class stays; it is layout.
* **6 mode switchers, now `role="group"` with a name.** This is the one container that is a real set: three
  mutually exclusive route destinations whose labels are meaningless unnamed. `group` names the set without
  promising keys the markup does not implement, and unlike `role="navigation"` it does not elevate three buttons
  to page structure. The name is a new `demoText.modeSwitcher.groupAria` rather than `aria-labelledby` on the
  visible `Mode:` caption, because that caption is `display:none` at ≤900px and the switcher moves into the phone
  nav menu — a static label is the only name that survives both placements.

`aria-current` is also corrected: it was `"true"` and phone-only; it is now `"page"` at both widths, which is the
meaningful token since each mode is a real route.

Verified in the accessibility tree, not by attribute inspection: Chromium `ariaSnapshot()` over the built vanilla
demo shows zero `[role=toolbar]` against 12 `.demo-toolbar` elements, the top bar reading
`group "Demo mode": button "Single" [disabled], button "Multi", button "Random"`, exactly one `aria-current`
(`page :: Single`), and a config footer that is a flat list of named buttons with no wrapper node. A route sweep
across single/multi/random/transition/rotation found 21 strips and no roles. React was built and driven the same
way with an identical tree; the other four ports were confirmed by typecheck plus a line-for-line diff of their
mode switchers. Whole-repo typecheck and lint clean, demo-common's 254 tests pass.

Beyond the count, one more thing the finding got wrong: it frames the missing `aria-labelledby` on the visible
`Mode:` label as the fix, but that label is absent at the width where the switcher folds away.

### DEMO-11 — route error copy is hardcoded in all six demos, and React's is unstyled
**Medium · Bug · 18 sites across the six demos** — **Fixed**

`"No route found matching …"`, `"No demo found for id: …"` and `"Bad random id: …"` are literal
strings in all six — the only user-facing copy in the whole demo suite not sourced from `demoText`.
React's not-found is additionally a bare `<div>` without `mochart-demo-message` /
`demo-alert demo-alert-error` and without `role="alert"`, unlike the other five and unlike React's
own two sibling messages.

**Fix:** add a `demoText.routeErrors` group and consume it in all six; give React's `RouteNotFound`
the same markup as its siblings.

Fixed by adding a `routeErrors` group to `@mochart/demo-common`'s `demoText` —
`noRoute(path)`, `noDemo(demoId)`, `badRandomId(randomId)` — and routing all 21
copy sites through it, and by giving React's not-found element the class names its
own two sibling messages already used
(`.mochart-demo-message > .demo-alert.demo-alert-error[role=alert]`).

No stylesheet change was needed: `demo.css` already carries all three classes and
React's entry already imports it. React did not genuinely diverge in styling — it
simply omitted the classes.

Verified in the browser, not just by typecheck: Playwright drove all six ports
against their dev servers with three bad routes each, 18/18 assertions passing.
React, Vue and Angular now render byte-identical detail — same aria snapshot,
same computed colour, background, border, padding, radius, and the same 292px
width at the same x — so React's previously bare `<div>` matches the other ports
pixel for pixel.

Three corrections to the finding: there are 21 sites, not 18 (Angular 5, React 4,
three each elsewhere); they all live in each demo package's `main/`, not `src/`;
and React's copy was also *worded* differently
(`No route found{pathname ? ' matching ' + pathname : ''}`), not merely unstyled —
it now always reads like the other five.

### DEMO-12 — framework-agnostic helpers are duplicated verbatim in all six demos
**Medium · Inconsistency · [vanilla RandomContent.ts:72](packages/mochart-demo-vanilla/src/components/random/RandomContent.ts#L72) and ~10 more** — **Fixed**

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

**Fixed: eight helpers moved into `@mochart/demo-common`, four deliberately left duplicated, net −574 lines
across the six ports against +205 in demo-common.**

Moved: `getSeriesValuesText` (to `dataEditing`), `getRandomDataRows` (to `chartTypeGenerators`),
`createShareLinkCopier` with its clipboard-write / `window.prompt` fallback / revert timer (to `shareState`), the
three menu placement literals and the `isMenuDismissingClick` rule with its keep-open class (to `menu`),
`demoModeIcons` (to `gallery`), and `getRotationGrid` with its minimum column width (to `rotationConfigs`) —
which let three re-export shim files be deleted outright. `clampGrid` did better than move: it folded *into*
`decodeShareState`'s multi branch beside the existing `clampInterval`/`normalizeStep`, so the ports clamp nothing
at all now.

Four things stayed duplicated, each for a reason:

* **`canFold`** is one boolean OR over props whose *shape differs per port* — lit tests `tabs !== null`, Angular
  takes a `hasTabs` boolean because `<ng-content>` cannot be interrogated, Vue derives it. A shared helper would
  rename `||` while every caller still computed all three inputs.
* **`onPanelClick`** itself: the *rule* moved, the handler did not, because each port binds events differently.
  Each is one line now.
* **The `demo-menu-keep-open` class in markup** — class-name literals in ports are
  [DEMO-18](#demo-18--100-markup-sites-carry-class-names-no-stylesheet-or-script-uses)'s subject, not this one.
* **The rotation cell-position arithmetic**, which is per-port template expression; only the geometry moved.

Dead weight the change exposed was cleaned up too: `buildShareUrl`, `RotationGrid`, `CategoryValue` and
`DemoTabPanelAttrs` came out of the barrel (the last two surfaced as `deadcode` failures once the ports stopped
importing them), `CategoryValue` came out of all six ports' `types.ts` mirrors, and the now-stale "the copied-link
feedback stays here" comment was corrected in all six `ExportShareMenu`s.

Verified beyond the gates: whole-repo typecheck, lint and `deadcode` clean; demo-common at 16 files / 274 tests
(was 14 / 260, with 14 new covering the grid clamp, the dismiss rule, the placements, and the copier's three
paths); all six ports built; **vanilla and react driven in Chromium** with 22 assertions each, identical across
both — rotation cell geometry checked against `getRotationGrid` and the measured container, the notes panel's
placement and Escape dismissal, a real clipboard `#share=` copy with the "Link copied" swap *and its revert*, the
multi grid stepper, and the phone fold — then a seven-route sweep with no console errors, plus demo-basic's 79
e2e tests.

Three larger duplications were found and left, since they are outside what this finding names: the ~25-line
provider-state routine around `getRandomDataRows` (react already factors it as `computeProviderState`),
`applySeriesChanges`, and `getSliceValueText`. And `getDebugSiteRootUrl` is duplicated six times but every copy
lives in `main/`, outside `src/`.

One correction: `getSeriesValuesText` is byte-identical in five ports, not six — Angular's is a private method, so
its call sites needed rewriting too.

### DEMO-13 — "Link copied" is never announced
**Medium · Bug (a11y) · [react ExportShareMenu.tsx:109](packages/mochart-demo-react/src/components/misc/ExportShareMenu.tsx#L109) and the five ports** — **Fixed**

The Share item swaps its visible label to `demoText.shareButton.tooltipCopied`, but the button's
`aria-label` is pinned to `demoText.shareButton.aria` ("Copy Share Link"). An `aria-label` overrides
the visible text, and there is no `role="status"`/`aria-live` region — so the only confirmation
that the link reached the clipboard is invisible to screen-reader users, in all six demos.

**Fix:** drop the static `aria-label` (the visible text is a sufficient name) or swap it with the
label, and wrap the swap in `role="status"`.

**Fixed in one place, and the finding's prescribed fix could not have worked.** A document-level, visually-hidden
`role="status"` region with `aria-live="polite"` and `aria-atomic="true"` is created lazily on `<body>` by
`shareState.ts`, and `createShareLinkCopier`'s success path writes to it. Because
[DEMO-12](#demo-12--framework-agnostic-helpers-are-duplicated-verbatim-in-all-six-demos) had just moved the copier
into demo-common, this is a one-place change and no port needed editing.

**Why the finding's fix is inert:** every port's Share handler calls `copy(...)` and then `close()` on the same
click, and `.demo-menu` is `display: none` unless open. So the `tooltipCopied` label swap happens inside a hidden
subtree, which is not exposed to the accessibility tree at all — an `aria-live` there would be silent, and dropping
the static `aria-label` changes nothing. Measured in the browser: the menu is already closed at the moment the
announcement lands. The confirmation needs a node that outlives the menu.

Repeat announcements are handled explicitly, since identical text over identical text is dropped by many screen
readers — the same trap [A11Y-9](#a11y-9--the-live-region-has-no-explicit-aria-live-and-no-de-duplication-or-throttle)
hit in core. `announce()` clears the region immediately and writes from a short timeout, so a second copy is a real
change; the delay also covers a region created and filled in one task, which is often missed entirely.

Verified in the accessibility tree rather than the DOM, in **all six ports** against their own dev servers: the
status node is non-ignored with `aria-live=polite`/`aria-atomic=true` and exactly one `StaticText` naming the
message, the clipboard genuinely contains the `#share=` URL (read back, not stubbed), and a second copy after the
revert records writes of `["…copied", "", "…copied"]` — so the region empties and refills. Angular is the
interesting case and passes without a change-detection flush because the announcement is a direct DOM write.
Whole-repo typecheck and lint clean; demo-common 277 tests (was 274).

One thing found and filed rather than fixed: the visible "Link copied" swap is dead UI for *sighted* users too, for
the same hidden-subtree reason — see [DEMO-23](#demo-23--the-link-copied-confirmation-is-invisible-to-sighted-users-too).

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
**Medium · Doc gap · [demo-common/README.md:23](packages/mochart-demo-common/README.md#L23)** — **Fixed**

Undocumented: `demoText`, `theme`, `viewport`, `menu`, `gallery`, `shareState`, `pieDemo`,
`sparklines`, `chartTypeGenerators`, `docsLinks`, `errorDataProvider`, `jsonEditorContent` — plus
the `./demo.css` / `./chart-dark.css` exports and the `generate-demos` script. `demoText.ts` is the
home of the project's "all demo copy lives here" rule, and the README meant to teach that rule does
not mention it.

**Fix:** extend the table to every module in `src/`, plus rows for the CSS exports and the script.

**Fixed; all modules documented.** The README's `Contents` table covered 10; it now covers all 22,
grouped into three tables that follow how the package is actually used — editing a demo's config and
data (5), demo modes and showcase pages (9), and shell/copy/shared browser plumbing (8) — plus new
sections for the two CSS subpath exports and the `generate-demos` script. The original 10 rows survive
verbatim.

Two corrections to the finding's own numbers and to the README beyond the gap it names. `src/` holds 23
*files*, one of which is the `index.ts` barrel, so there are 22 modules. And the README's closing claim
that "everything is exported from the package root" was false: `randomGenerator.ts` is not re-exported
at all — it is reached only through `chartTypeGenerators.generateDemoDataProvider`, which dispatches to
it for demos whose manifest entry names no `generator` — and a few per-module helpers
(`dataEditing`'s `isObject`/`isArrayOfObjects`, `viewport`'s breakpoint constants) sit outside the
barrel too. That sentence is corrected and both facts are documented, so a port knows to import those
from the module directly.

Every module name, file path and export name in the new text was checked against the source. Copy is
still pointed at rather than duplicated: `demoText`'s row states the all-copy-lives-here rule and refers
to the file's own header for the `{ label, tooltip, aria }` convention. Workspace lint and typecheck pass.

### DEMO-16 — docs claim the test demos are "intentionally invalid"; they are not
**Low · Doc gap · [demo-data/README.md:28](packages/mochart-demo-data/README.md#L28)** — **Fixed**

The 21 `testDemos` entries are ordinary valid configs, and the gallery describes them correctly as
"Feature-coverage demos exercising less common config options". The stale claim also drives a
weaker e2e assertion at [demos.spec.ts:17](packages/mochart-demo-basic/e2e/demos.spec.ts#L17),
where test demos are only mounted and never checked for a rendered series. `README.md:44`'s
`{ id, title, config, data, random }` also omits `description`, `notes` and `generator`.

**Fix:** correct the wording, complete the `Demo` shape example, and tighten `demos.spec.ts`.

**Fixed by correcting the documentation, because the demos are the side that is right.** Every one of the
**24** `testDemos` entries (the finding says 21) was pushed through the real pipeline — `enhanceConfig`,
which runs `migrateConfig` → `getDefaults` → `validateConfig` in strict mode, exactly what demo-basic's
`mountDemo` reports — and all 24 came back `valid, errors=0, warnings=0`. So did all 37 gallery demos: the
two sets are indistinguishable on validity.

What the test configs actually exercise is edge-case *data and layout*, not invalid config: zero-extent
series domains (`same-values`, `one-value`), the nine `undefined-*` missing-value treatments, crowded,
ordinal and date tick behaviour, DST-offset categories, inverted plots and cap shapes. Making them invalid
to match the prose would delete real coverage, and nothing else covers these cases.

So `mochart-demo-data/README.md`'s two "invalid" claims are corrected (the manifest row and the
`src/config/test/*.json` row), and its `Demo` shape example completed. `CONTRIBUTING.md` needed nothing —
it makes no invalidity claim — and demo-common's gallery copy already described them correctly.

The claim had also propagated into `e2e/demos.spec.ts`, where test demos took a weaker assertion path than
gallery demos. Both sets now assert the same thing — the error region hidden, at least one series element
attached — in one merged table so the two cannot drift apart again. All 24 pass, including the degenerate
ones (`undefined-all`, `undefined-single`, `one-value`), so series elements really are emitted there.

`npm run test:e2e -w @mochart/demo-basic`: 79 tests pass (61 demo-gallery = 37 + 24, plus 18
export/interaction/pie). Typecheck and lint clean.

One thing found and not folded in: the same README table under-lists `src/types.ts`, which also holds
`DemoRandomConfig` and the six per-generator random config types, and `DemoManifestEntry` is not
re-exported from `src/index.ts`.

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
**Low · Inconsistency · [vanilla ChartsControls.ts:120](packages/mochart-demo-vanilla/src/components/multi/ChartsControls.ts#L120)** — **Fixed**

`demo-form-row` (54 sites), `mochart-menu-item-label` (24), `button-with-tooltip` (6),
`demo-menu-up` (6), `mochart-demo-notes-item` (6) and `mochart-demo-notes-trigger` (6) appear in the
six demos' markup but in no `.css` file in the repo and are queried in no JS. `demo.css:783` shows
the form-row layout actually hangs off `form .demo-field`. Bootstrap-era leftovers that read as
styling hooks — the next person restyling a control strip will target `.demo-form-row` and see
nothing happen.

**Fix:** delete them from the markup, or add the rules they imply.

Four of the six deleted; **two of them were not dead** and are kept.

| name | occurrences found | verdict |
|---|---|---|
| `demo-form-row` | 54 markup + 1 prose comment | deleted |
| `mochart-menu-item-label` | 24 markup | deleted |
| `button-with-tooltip` (as a class) | 6 markup + 1 prose comment | deleted |
| `demo-menu-up` | 6 markup | deleted |
| `mochart-demo-notes-item` | 6 markup + **1 live selector** | **kept** |
| `mochart-demo-notes-trigger` | 6 markup + **2 live selectors** | **kept** |

`mochart-demo-notes-item` and `mochart-demo-notes-trigger` are selectors in
`scripts/screenshots/capture.mjs`, the repo's own screenshot-regression harness, and
the trigger is additionally a `@query` in lit's `notes-menu.ts`. Deleting them would
have silently broken the notes-panel shots. The finding's sweep evidently covered
`.css` and `querySelector` but not `scripts/` or lit's decorator-based queries.
Its counts for the other four are right, and its `demo-form-row` diagnosis is
correct: `demo.css:775-790` lays the rows out via the bare `form` selector plus
`form .demo-field`.

The two that looked like they might want a rule instead both turned out to have
nothing to say. `demo-menu-up`: the drop-up is already achieved twice over —
`controlsMenuPlacement` in `demo-common/src/menu.ts` is `{ side: 'top' }`, which
`getMenuPosition`/`positionPanel` turn into an inline `bottom`, and the caret is
`.demo-menu-trigger::after` whose `border-bottom` points up unconditionally with a
comment saying so. There is no down-variant for an "up" modifier to distinguish
itself from. `button-with-tooltip`: nothing positions a tooltip — every port's
`ButtonWithTooltip` uses the native `title` attribute and explicitly discards
`tooltipPlacement`, so there is no popper to anchor; the one place the wrapper's
layout mattered was solved in `OverflowMenu.ts` by wrapping folded loose buttons in a
cached `.demo-btn-group`.

Only the class was removed in those two cases, not the `<span>`: it is a real flex
item in `.demo-btn-group`, and vanilla's share-label span has its `textContent`
rewritten on the copied-state toggle. Each of the six now-classless wrappers carries
a one-line note so the next reader does not delete it, and the two prose comments
that named removed classes were rewritten to describe the thing instead.

Coverage of the search: every `.css` file in the repo, every Playwright selector under
`demo-basic/e2e/` (zero hits), every Vue and Svelte `<style>` block (the demos have
none), all 32 Angular `styles`/`styleUrls` (all literally
`:host { display: contents; }`), and every Lit `static styles` (none in the demos).

Verified: zero occurrences repo-wide for all four removed names; repo-wide lint clean;
all six demo packages typecheck including `ngc`, `vue-tsc` and `svelte-check`;
`@mochart/demo-common` 16 files / 277 tests pass. Screenshots pixel-compared with the
repo's own `compare.mjs`: the harness set is 8 identical / 0 different, and a targeted
set driving the export/share dropdown open gave 5 of 7 byte-identical including all
three open export menus, with the two differences being the running animation (16px,
maxDelta 2, also differing between two consecutive *after* runs) and subpixel AA
(1px, maxDelta 1). Vue was smoke-captured separately to confirm the HTML comment added
inside its `<template>` does not disturb the `inheritAttrs: false` /
`v-bind="$attrs"` fallthrough.

Two things noted, not filed, since the queue is closed:

- **The screenshot harness is currently broken independently of this change.** Its
  export-menu shots look for `#edit-export-share`, `#edit-mode` and
  `#edit-chart-count`, ids that DEMO-3's fix renamed. Pre-existing and unrelated to
  this finding, but `scripts/screenshots/capture.mjs` needs updating before those
  shots work again.
- **The demos run two class namespaces with no stated rule** — `demo-*` for controls
  and `mochart-demo-*` for the shell (~30 classes), both deliberate and fully styled.
  The problem is the few that take the bare `mochart-` prefix with no `demo-` segment,
  landing directly in the library's own constant namespace: `mochart-export-share-menu`
  (styled, live), `mochart-pending-badge`, and — until this change —
  `mochart-menu-item-label`. Someone grepping `mochart-` to audit the public class
  surface gets demo shell classes mixed in with the library's, and a future core
  constant could collide outright. None of the three removed names is a core constant.

### DEMO-19 — Lit's `ExportShareMenu` defaults `idPrefix` to `'edit'`
**Low · Bug · [lit export-share-menu.ts:33](packages/mochart-demo-lit/src/components/misc/export-share-menu.ts#L33)** — **Fixed**

Every other port makes it required (Angular uses `@Input({ required: true })`). A Lit caller that
omits it silently mints a second `#edit-export-share` in the document instead of failing. All three
current call sites pass it, so this is latent.

**Fix:** drop the default and make it required.

**Fixed as a consequence of [DEMO-3](#demo-3--showing-the-2nd-chart-duplicates-22-dom-ids).** The
whole `idPrefix` property was removed rather than made required — it existed only to build a
trigger id that every port's menu helper now mints uniquely — so there is no default left to fall
back to.

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
**Low · Inconsistency · [demo-basic/playwright.config.ts:17](packages/mochart-demo-basic/playwright.config.ts#L17) vs [vite.config.ts:5](packages/mochart-demo-basic/vite.config.ts#L5)** — **Fixed**

`command: 'npm run dev -- --port 4173 --strictPort'` while `vite.config.ts` assigns
`server: 5173` / `preview: 4173`, with a comment saying each gallery pins its own port so they can
run side by side. `npm run preview -w @mochart/demo-basic` and `npm run test:e2e` cannot run at the
same time, and `--strictPort` turns the clash into a hard failure.

**Fix:** run the e2e suite against `npm run preview` (which already owns 4173) — which also fixes
[TEST-9](#test-9--nothing-tests-the-published-build-every-test-and-the-e2e-suite-run-against-src) —
or move the dev server to 5173 and point `baseURL` there.

**Fixed by moving e2e onto the dev server's own port.** `playwright.config.ts` now runs
`npm run dev -- --strictPort` and points `url`/`baseURL` at `5173`, the port `vite.config.ts` already
pins for the dev server, leaving `4173` to `preview` alone. `--strictPort` is kept so a clash fails
loudly rather than silently bumping the port out from under `baseURL`. The port for the server itself
now lives in one place, `vite.config.ts`. `ci.yml` needed no change — it invokes `npm run test:e2e`
with no port arguments.

The finding's preferred fix — repointing e2e at `npm run preview` — was deliberately not taken,
because it would quietly implement
[TEST-9](#test-9--nothing-tests-the-published-build-every-test-and-the-e2e-suite-run-against-src) as a
side effect and add a build to every e2e run. TEST-9's own fix proposes a CI-only project on
`build && preview`, which layers on top of this cleanly and should be decided on its own terms.

Verified by running the suite: 79 tests pass across the four spec files in 21.4s, with nothing
listening on `5173` before the run, so Playwright started its own server rather than reusing a stray
one. `npm run preview -w @mochart/demo-basic` and `npm run test:e2e` can now run at the same time.
Workspace lint and typecheck clean.

Also noted: `packages/mochart-demo-basic/README.md:46` already documented the dev server as
`http://localhost:5173`, so the old config contradicted its own README; no README edit was needed.

### DEMO-22 — deployed demos request a favicon that does not exist
**Low · Bug · [vanilla index.html:3](packages/mochart-demo-vanilla/index.html#L3) and the five siblings** — **Fixed**

None of the six gallery `index.html` files declares `<link rel="icon">`, so the browser falls back
to `/favicon.ico` at the *site* root. `demo-basic` and `mochart-benchmark` both set `href="data:,"`
to suppress exactly this. A 404 on every demo page load, and the browser's default icon rather than
the docs site's.

**Fix:** add the docs site's favicon link (or `href="data:,"`) to all six.

**Fixed by supplying an icon rather than dropping the request.** All six deployed galleries
(vanilla, react, svelte, vue, lit, angular) now carry a `rel="icon"` link in their `index.html`, and
the docs site — which is the deployed site root and was 404ing on `/favicon.ico` the same way, just
without an explicit link — carries the same icon via VitePress `head`.

The icon is an inline `data:image/svg+xml` URI, not a file: a data URI needs no asset pipeline and is
immune to the per-demo base path (`/vanilla/`, `/react/`, …), which a relative href would have to
track. It is new artwork — a rounded square in the demos' accent colour with three bars — because the
finding's premise that the docs site had a favicon to borrow turned out to be wrong: the repo
contained no `.ico` or `.svg` icon asset anywhere, and the only pre-existing `rel="icon"` declarations
were `demo-basic`'s and the benchmark's `href="data:,"`. Swap it for a real mark whenever you have one;
it is one line per file.

Verified by building each gallery and confirming exactly one `rel="icon"` survives into
`dist/index.html` (Vite and the Angular/analog HTML pipeline both pass the data URI through verbatim),
then serving the vanilla build in headless Chromium: the icon decodes at 16x16 and no request matching
`favicon` is made any more. The docs build emits it into every page's `<head>`.

---

### DEMO-23 — the "Link copied" confirmation is invisible to sighted users too
**Low · Bug · [shareState.ts](packages/mochart-demo-common/src/shareState.ts), all six ports' `ExportShareMenu`** — **Open**

*Found while implementing [DEMO-13](#demo-13--link-copied-is-never-announced), not by either review pass.*

`createShareLinkCopier` swaps the trigger's label to "Link copied" and reverts after 1500ms, but every port's
Share handler calls `copy(...)` and then `close()` on the same click, and `.demo-menu` is `display: none` unless
open. So the swapped label is inside a hidden panel: the only way to observe it is to re-open the menu within
1500ms.

DEMO-13 fixed the screen-reader half by announcing from a document-level live region that outlives the menu. The
visible half is still dead — a sighted user clicks Copy Share Link and gets no confirmation at all.

**Fix:** either show the confirmation somewhere that survives the close (a brief toast, or a line in the top bar
next to the share trigger), or stop closing the menu on copy so the existing label swap is actually seen. The
first keeps the current interaction, the second is a smaller change; both are UX decisions rather than mechanical
ones, which is why this is filed rather than folded into DEMO-13.

Note the revert timer and its 1500ms are already shared in `createShareLinkCopier`, so whichever way this goes it
stays a one-place change.

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
**High · Test gap · [export/index.ts:336](packages/mochart-export/src/index.ts#L336), [:355](packages/mochart-export/src/index.ts#L355), [:388](packages/mochart-export/src/index.ts#L388)** — **Fixed**

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

**Fixed automatically.** Applied as recommended: a `png export success paths` block with the
`FakeImage` stub, `toBlob` and `getContext` stubs that capture the canvas, and a `click` spy that
captures the download. Four tests — single-chart at scale 2 and at scale 1, the stitched export,
and the no-charts-found `false` path.

The stitched test derives the expected size by reading `width=`/`height=` off
`getStitchedChartsSvgText`'s own output and first asserts that width **exceeds one chart's 400px**,
so `canvas.width === Math.round(stitchedWidth * 2)` cannot pass if a per-chart size sneaks through
— which is precisely the B1 failure mode. Export coverage is now 94.81% statements / 83.95%
branches, with `getStitchedSize` executed. All 34 export tests pass, typecheck and lint clean.

### TEST-2 — no binding test asserts that any interaction callback reaches the chart
**High · Test gap · all five binding test files** — **Fixed**

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

**Fixed automatically.** An `interaction callbacks` block in all five binding test files — 6 tests
each for React/Vue/Lit/Svelte, 6 for Angular — mounting with a spy per callback and dispatching
the real DOM event: pointer enter/move/click/leave, title click, legend click, series click, pie
slice click, plus `onSeriesLayoutBoundsChange` on mount. Angular's block iterates the ten
emitter names from `OUTPUTS`, so a row cannot be added to the table without a case, and its
`chartClick`-only test is no longer the sole coverage.

Two assertions worth naming. Each suite checks the title carries `role="button"` when
`onTitleClick` is supplied — that pins the *presence*-driven behaviour `base-chart.ts:130` warns
about, so a dropped row now fails on rendering as well as on the callback. And Angular's legend
and series clicks are separate tests, because filtering a series removes it from the DOM and a
later click on it has nothing to land on.

Whole monorepo green: 1417 + 383 + 243 + 34 + 25 + 19 + 17 + 17 + 16 + 16 tests, typecheck across
20 workspaces, lint clean.

### TEST-3 — the "No Data" and "No Series" chart states are never rendered
**High · Test gap · [Chart.ts:162](packages/mochart/src/components/Chart.ts#L162), [:1234](packages/mochart/src/components/Chart.ts#L1234), [:1281](packages/mochart/src/components/Chart.ts#L1281)** — **Fixed**

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

**Fixed automatically.** `test/components/EmptyStates.test.ts` added, 11 tests covering all three
parts: the no-data state (default message, overlay geometry, and that it clears when rows arrive),
the no-series state, and all six factory props each replaced by a marker node. Two adjustments to
the recommended shape. The geometry assertion checks the overlay sits *inside* the chart with a
positive offset and does not overflow, rather than matching the background rect's attributes —
the rect is not rendered in the no-data state, and pinning exact numbers would fail on any
legitimate layout change while still catching the regression that matters (an overlay parked at
0,0 or sized past the chart). And the config-error case uses `renderer: 'nope'` rather than a
numeric `property`, which the finding's sibling example implies is invalid but which actually
validates clean.

Coverage moved 97.2 → 97.44 statements, 90.59 → 90.83 branches, 97.7 → 98.07 functions. The
thresholds are left where they are — ratcheting them is its own call, and a tighter gate is not
something to leave running unattended. Full core suite passes (1417 tests).

### TEST-4 — `migrateConfig` never runs its only behaviour
**Medium · Test gap · [migration/mochartConfig.ts:7-10](packages/mochart/src/config/migration/mochartConfig.ts#L7)** — **Fixed**

71.4% statements — the lowest of any real file in core — and the uncovered line is the
version-omitted normalization. Both existing tests pass a config that *has* a `version`, so the one
thing the function currently does is never executed. `migrateConfig` is a public export and the
documented front door for stored configs; if the normalization broke, a version-less config would
flow into future migration steps as `version: undefined` and every migration would misfire.

**Fix:** `expect(migrateConfig({foo: 1})).toEqual({foo: 1, version: CONFIG_VERSION})`, plus a
does-not-mutate case and a `migrateConfig(null)` non-throw case.

**Mostly already fixed; one real gap closed.** The finding is stale: the three cases its **Fix:**
paragraph asks for — a versionless config being stamped, the copy-not-mutate guarantee, and a
non-object passing through — were all added by CONFIG-6's commit (`0c664a58`), and the front door is
pinned too, at `test/config/config.test.ts:52` and `:61`, which run a versionless config through the
public `enhanceConfig`. The quoted 71.4% statement coverage no longer holds either; it is 85.71%
statements / 100% branches.

The one arm nothing reached was the guard's `typeof config === 'object'` returning false: the existing
`null` case short-circuits on `config !== null`, so a primitive never got there. `migration.test.ts`
now has `passes a primitive through untouched`. Without that condition in the source,
`migrateConfig('a')` returns `{ "0": "a", version: "1.0.0" }` — a character-keyed object handed on to
`getDefaults`/`validateConfig` — and the new test is the only one that fails.

One statement remains uncovered and is left alone deliberately: the loop body
`migratedConfig = migrationStep(migratedConfig)`, which is unreachable while `migrationSteps` is empty
(no migration exists yet at `CONFIG_VERSION` 1.0.0). Covering it needs a source change — an injectable
step list, or the first real migration — and inventing one to satisfy coverage would be the wrong
trade. 107 files / 1614 tests pass, coverage above the gate at 97.47% statements / 90.98% branches.

### TEST-5 — the title link and `onTitleClick` are entirely untested
**Medium · Test gap · [Title.ts:55](packages/mochart/src/components/Title.ts#L55), [:159](packages/mochart/src/components/Title.ts#L159), [Chart.ts:973](packages/mochart/src/components/Chart.ts#L973)** — **Fixed**

`Title.chartTitleClick`'s body, the `<a>` wrapper for `titleConfig.link`, and `Chart.onTitleClick`
are all uncovered; `onTitleClick` has **0** references in the core tests and `linkDisabled` is never
set anywhere. `title.link` renders a real `<a href>` inside the svg and `linkDisabled` suppresses
navigation — a regression silently turns a linked title into plain text, or lets a `linkDisabled`
title navigate away from the host page. (This is also the untested surface behind
[A11Y-2](#a11y-2--ontitleclick-is-a-mouse-only-control).)

**Fix:** in `ChartInteraction.test.ts` add link/`linkDisabled` assertions (`href` present;
`defaultPrevented` true/false) and an `onTitleClick` spy test.

**Fixed with seven tests, no source change.** `test/components/ChartInteraction.test.ts` gains a
`title link` block and an `onTitleClick` block covering what had no test at all: the `<a>` wrapper
carrying the `href`, every title section (prefix, text, suffix) sitting *inside* that one anchor rather
than only the middle one, an unlinked title having no anchor, a linked title navigating by default,
`linkDisabled` calling `preventDefault` while keeping the `href`, `onTitleClick` still firing from a
`linkDisabled` title, the callback firing once per click from both the group and the text, and the
`cursor: pointer` affordance appearing only when the callback is present.

Both load-bearing behaviours were verified to bite. Replacing the `linkDisabled ? onClickDisabled :
null` handler with `null` fails "suppresses navigation but keeps the href when linkDisabled is set";
forcing `interactive` to `false` fails "fires once per pointer click on the title". `git diff` on
`packages/mochart/src` is empty afterwards.

Selectors are built from `mochartCssClasses`, not literals. 65 tests in that file pass, typecheck and
lint clean.

### TEST-6 — the golden oracle renders every chart with zero-width text
**Medium · Weak test · [golden.test.ts:70](packages/mochart/test/golden/golden.test.ts#L70), [svgShims.ts:9](packages/mochart/test/components/svgShims.ts#L9)** — **Fixed**

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

**Fixed by giving the oracle a real text-measurement stub, so every truncation, pruning and fitting path in
the snapshots now means something.** `test/golden/textMetrics.ts` installs one synthetic proportional font
across every entry point the chart actually reaches: `getComputedTextLength()` (the only call
`TextTruncation.ts` makes), `getSubStringLength()`, `getBBox()` on `text`/`tspan`, and
`getComputedStyle().fontSize` — which jsdom resolves to the keyword `medium`, so the library had been
discarding it as NaN and sizing legend icons off a fallback.

Width is the sum of per-character advances from a fixed table in fractions of the em (narrow `il.`, wide `MW`,
full-width above U+2E80) times a 16px em; height is 1.2em. 16px is what `medium` resolves to in an unstyled
document, i.e. the situation being simulated — not a number tuned to produce a desired amount of truncation.
It is deterministic because it is a pure function of the string's code points plus two constants, overriding
jsdom's style resolution rather than depending on it. Confirmed independently: two consecutive suite runs after
regeneration leave the diff byte-identical at 451 files / 82,736 lines.

All 451 snapshots moved, and the movement is the point:

* **Truncation went from fake to real** — truncated strings 140 → 692. Before, the only truncation marker in
  the entire suite was the hidden measurement sizer's own `W…`. Now 36 files carry genuinely truncated text:
  417 `Ju…` date labels across candlestick/hollow/OHLC, waterfall's `Gross r…`, `truncated-text`'s `A fai...`,
  and a value-axis title cut mid-sentence.
* **Tick pruning became load-bearing** — hidden text elements 3814 → 5039. `tick-prune`, the demo named after
  the feature, drops from 36 visible labels to 14, keeping every fifth date; previously all 27 rendered
  because each "measured" 20px.
* **Axis gutters follow measured labels in both directions** — `grouped`'s plot x 40 → 38 (numeric labels are
  narrower than the old placeholder), `heatmap` 40 → 53 (weekday labels are wider), `waterfall` 70 → 77.

Proof the oracle now measures, rather than just moves: in the rotated-ticks demo, where
`tickLabelTruncationMaxFraction` is the binding threshold, setting it to 0.05 (25px) cuts every `2016-03-01`
to `2…`, and 0.5 (300px) renders them in full with the only diff being the clip rect the flag adds. The
threshold is being compared against a real measured width of about 85px and lands either side of it. The probe
config was reverted.

One deliberate boundary, recorded in the stub: box layout is still unmodelled, so `getBoundingClientRect`
stays 0×0 and the legend *container* keeps its default-bounds marker with `hasDefault` still true — legend
layout uses the per-item text bounds, which are measured now. Fabricating a box-layout engine out of
`translate` transforms was more risk than fidelity.

109 files / 1647 tests pass with coverage above the ratchet (97.66% statements, 91.42% branches), typecheck and
lint clean.

Corrections to the finding: there are 451 goldens, not 421; "zero ellipses" reads oddly because that demo's
`truncationValue` is `...`, and the accurate statement is that the only marker anywhere was the sizer's own;
`getSubStringLength` is never called by `src`; and two of the three paths it names still do not truncate for
legitimate measured reasons — the demo title measures 641.4px in a 642px slot, so it genuinely fits, and legend
items re-flow to one per row instead. Its suggested new component test was not the route taken; the oracle
itself was fixed, which is what the finding's title asks for.

### TEST-7 — group- and stack-wide focus propagation is uncovered
**Medium · Test gap · [FocusData.ts:197-209](packages/mochart/src/data/FocusData.ts#L197)** — **Fixed**

When the focused series belongs to a `seriesGroup` or `seriesStack`, `getFocusData` marks every
sibling as focused. Lines 199-201 (group) and 205-207 (stack) never execute — no test focuses a
grouped or stacked series, even though the `grouped` and `stacked` demos exist (goldens never set
focus). This is the visible behaviour of hovering one bar of a stack; if it regressed, only the
single segment would highlight and no golden or unit test would see it. It sits next to the
`followSeries` propagation that B15 showed is easy to get wrong.

**Fix:** in `FocusData.test.ts`, build two stacks of two series, focus one member, and assert
`seriesFocusPercentages` is at the focused level for both stack-mates and defocused for the other stack.

**Fixed with four tests and no source change — but the finding misplaces the behaviour and prescribes an
assertion that is false today.**

The group/stack propagation at the cited lines is not in `getFocusData`; it is in
`getSeriesConfigsOrderedByFocus` ([FocusData.ts:198-208](packages/mochart/src/data/FocusData.ts#L198)), and it
only populates the local map that partitions the returned series order. It controls **paint order, not styling**.
`getFocusData` propagates `followSeries` and nothing else.

So the prescribed fix — assert `seriesFocusPercentages` is at the focused level for both stack-mates — asserts
behaviour the library does not have. Probed: focusing one member of a two-series stack yields
`{a1: 1, a2: -1, b1: -1, b2: -1}`. Writing that assertion would have required changing the source, so what landed
pins the real contract instead, with a fourth test making the ordering-only nature explicit. The finding's stated
regression risk ("only the single segment would highlight") is in fact the shipped behaviour; what those lines
actually guard is z-order — a focused stack or group no longer being lifted above the other series as a unit, so
an overlapping series could paint between its members.

One fixture, four bar series divided two ways like the `stacked-grouped` demo, with a parameter that drops one
division so each branch runs alone. Tests: the whole stack of the focused series rises, the whole group rises,
both rise together when the series is in each (only the series sharing neither stays down), and the mates are
still styled as *defocused* — unlike `followSeries`.

Each bites. Disabling the group branch fails two tests, disabling the stack branch fails the other two, with
concrete orderings in each message. The negative test was proved by the reverse: *adding* stack propagation into
the percentage loop makes it fail with `{p:1, q:-1, r:1, s:-1}`. `FocusData.ts` is untouched afterwards.

22 → 26 tests in that file; 109 files / 1651 tests pass with coverage above the thresholds; typecheck and lint
clean. The coverage claim itself was right: both `if` bodies were dead in tests before.

One adjacent gap left untested: the `else if (isFocused(focusedValueAxisId))` branch above means group/stack
propagation is skipped entirely while a value axis is focused. Confirmed by probe (`['q','r','s','p']` under axis
focus), but pinning it is a separate case from the two this finding names.

### TEST-8 — 72 of 349 documented config properties are never set in any test or demo
**Medium · Test gap** — **Fixed**

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

Fixed as seven new test files, 65 new tests, no source changes.

**Neither of the finding's numbers reproduces.** Walking the config-reference model
to leaf properties gives **962 documented leaf paths / 282 unique leaf names** (335
counting nested-object parents, 433 section-level paths) — nothing reproduces 349.
And **58 unique leaf names** are never used as a config key in any test or demo JSON,
not 72 (75 are never used in tests, 17 of those appearing only in demo JSON). A
per-path AST scan of the test sources was tried and discarded: tests routinely pass
partial config through helper parameters (`renderChart({ ticks: [...] })`), so a
structural scan reports properties as unset that are demonstrably covered. The
name-based 58 is a lower bound, section-checked by hand for the behavioural
candidates.

**25 properties got real assertions.** The ones that earn them: `legend.position`
(genuinely dead code — `ChartLayout.ts:50` and `:59` were both uncovered at
baseline); the **nine** `*Front` z-order switches, which `Axis.ts` reads out of one
destructure, so a key mix-up between them is invisible to coverage because both
sides of each `if` run from the defaults; `valueAxes.showBaseLine`;
`maxTickCount`/`minTickSpacing` (real arithmetic, and on an ordinal axis the cap
becomes an exact label interval, so it pins precisely); the four `accessibility`
label overrides, whose only purpose is being overridden; the icon
`showIconColors`/`showIconPlaceholders`/`iconUnfilteredColor` two-term gate that
decides whether an icon exists at all; `series.missingValueMarkers`;
`seriesStacks.outerCapExpand` (real cap geometry); `tooltip.adjustSizeForFiltering`;
`crosshair.showBehindTooltip` (a real uncovered branch); and
`pie.centerOffsetXFraction`, whose vertical twin is exercised on the adjacent line of
the same expression — exactly where a copy-paste lands. Six more got
attribute-equality smoke assertions, which is as strong as those behaviours get.

**28 left uncovered, with reasons.** The 16 axis spacing numbers (32 paths) are each
a single addend inside one axis-layout sum, so a real assertion has to restate the
sum and a "the DOM changed" assertion is a weak oracle — that is the biggest single
item left. `series.animateBaseFromAdjacent`'s default is *conditional* (`true` for
line and area, `false` for bar), so both sides already run and an override pins
nothing new. The six `labelAboveBase*`/`labelBelowBase*` fractions are only
meaningful in combination with `labelPosition` and the base, which
`SeriesLabels.test.ts` already covers. `colorPalette.*.fillColors` resolves through
the `SeriesColors.ts` mapping the other palette keys exercise. `useSeriesFocus`,
`adjustTickLabelSizeForFiltering` and `tickLabelTruncationMinLength` are real
branches that each need their own focus/filter/measurement setup — a fair second
slice.

Every property in both covered groups was proved by breaking the source, watching the
test fail, and restoring; `git diff -- packages/mochart/src` shows no trace of any
breakage. Selectors are built only from `ChartDom.ts` helpers, no `mochart-*`
literals.

Four further corrections to the finding: there are **nine** `*Front` switches, not
six (`backgroundFront`, `axisLineFront`, `focusRangeFront`, `tickMarkFront`,
`tickLabelFront`, `titleFront`, `focusTickMarkFront`, `gridLineFront`,
`baseLineFront`); `showIconShapes` is not unexercised (`NegativeBounds.test.ts:61`
sets it); and the `SeriesColorIcon` dead code is misattributed — lines 138-143/158-164/168
are `syncColorDefs`, reached only from `syncHTML`, which is the **tooltip** row icon.
The legend swatch goes through `syncSVG` and reuses the chart-level gradient defs, so
"a legend swatch for a gradient-filled series is never rendered" is wrong; it is the
tooltip swatch. It is also not gated by `showIconColors`/`showIconPlaceholders` but by
`series.gradient`/`colorScale`.

Found while measuring, recorded here rather than filed because the queue is closed:
**`tooltip.minWidth` is documented, defaulted to 120 and validated, but never read.**
The only `minWidth` occurrences in `src/` are an unrelated runtime prop threaded from
`tooltipBounds.width` through `Tooltip` → `TooltipContent` → `TooltipControls`. No
code reads `tooltipConfig.minWidth`, so the docs promise a knob that does nothing.

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
**Medium · Test gap · [TooltipFormat.ts:209-214](packages/mochart/src/utils/TooltipFormat.ts#L209)** — **Fixed**

In `getTooltipAnnouncement`, the whole `chart.type === 'pie' && pieLabelTypeUsesPercent(...)` block
is uncovered. The *visual* pie tooltip is tested and `getPieTooltipPercentFormat` is unit-tested in
isolation, but the two are never joined in the live-region path. Sighted users would see correct
percentages while the announcement fell back to raw values or `0%`, and the `adjustForFiltering`
renormalization could diverge from what is spoken — a silent accessibility regression.

**Fix:** in `ChartAria.test.ts`, mount a pie with `pie: {tooltipValues: 'valuePercent'}`, open the
tooltip, assert the live region's text contains the expected `%`, then filter a slice via a legend
click and assert the announced percentages renormalize as `PieRender.test.ts` already asserts for
the visible rows.

**Fixed with four tests, no source change.** `test/components/PieAnnouncement.test.ts` covers the pie
branch of `getTooltipAnnouncement`, which had never run: the announcement speaks the same slice
percentages the visible rows show, a percent-only `pie.tooltipValues` does not fall back to raw slice
values, and the announced percentages renormalize against the unfiltered slices — with the
`adjustForFiltering: false` case pinned separately, so a sighted and a listening user get the same
shares either way.

Verified to bite: forcing the `chartConfig.type === CHART_TYPE_PIE && pieLabelTypeUsesPercent(...)`
gate to false fails all four. `git diff` on `packages/mochart/src` is empty afterwards.

Selectors are built from `mochartCssClasses`. Typecheck and lint clean.

### TEST-11 — coverage is measured and gated in one of the nine published packages
**Low · Test gap · [mochart/vitest.config.ts:14](packages/mochart/vitest.config.ts#L14) is the only `coverage` block** — **Fixed**

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

**Fixed, and the finding's own fix would have gated nothing.** A `thresholds` block is only evaluated when
coverage actually runs, and neither package's `test` script enabled it — export's was `vitest run`, editor's
`npm run generate && vitest run`. Demonstrated: with a thresholds block but no `--coverage`, forcing
`statements=99` on export still exits 0 and never measures; with `--coverage` the same threshold errors. So the
script change was mandatory, and it is what makes CI's `npm test --workspaces --if-present` gate anything.

Both packages now carry a coverage block matching core's shape — `provider: 'v8'`, `include: ['src/**']`,
`reporter: ['text', 'html']` — and pass `--coverage` in their `test` script, with `@vitest/coverage-v8` declared
as a devDependency as core does. Neither needs an `exclude`: export has one `src/index.ts`, and editor's
`model.ts`/`types.ts` are type-only, so they emit nothing and never appear in the report.

**The finding's export thresholds were stale and would have lowered the bar.** It cites 30 tests at
88.08/77.77/80.65, measured before
[TEST-1](#test-1--png-export-success-paths-have-never-been-executed) landed. Actual now: 35 tests at 95.38%
statements / 84.7% branches / 93.54% functions / 95.26% lines. Its proposed 88/77/80/88 floor would have sat
7–13 points *below* reality — the opposite of the "whisker under" pattern it was copying. Thresholds set from
measurement instead:

| | statements | branches | functions | lines |
|---|---|---|---|---|
| export actual / threshold | 95.38 / **94** | 84.7 / **84** | 93.54 / **93** | 95.26 / **95** |
| editor actual / threshold | 85.84 / **85** | 71.25 / **71** | 88.15 / **88** | 90.6 / **90** |

Editor's numbers matched the finding exactly. Its `src/support.ts` is the weak spot at 12.5% statements and 0%
branches, which these thresholds record rather than hide.

Verified through the real npm scripts, not a vitest invocation: `npm test -w @mochart/export` (35 tests) and
`npm test -w @mochart/editor` (25 tests) both run coverage and exit 0, and raising export's statements
threshold to 97 fails with `Coverage for statements (94.87%) does not meet global threshold (97%)` while all 35
tests still pass — so the non-zero exit comes from the gate, not the suite. The lockfile is resynced with the
two new devDependencies.

### TEST-12 — B12's fix has no direct assertion, and the golden suite normalizes away the artifact
**Low · Weak test · [render/dom.ts:87](packages/mochart/src/render/dom.ts#L87); [render.test.ts:307](packages/mochart/test/render/render.test.ts#L307); [golden.test.ts:455](packages/mochart/test/golden/golden.test.ts#L455)** — **Fixed**

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

**Fixed on both halves.** `render.test.ts` gains a direct test of the `removeAttribute('style')` branch —
object-to-null and the string form — plus a clarifying assertion on the existing case that `{height: null}` is
truthy, so it empties the declaration while the attribute stays. That is why the old test never reached the
branch.

And `golden.test.ts`'s `stripEmptyStyles` is gone rather than re-commented. Its comment claimed "the goldens keep
the artifact", which is stale: zero snapshots contain `style=""`. Since neither the static nor the animated path
leaves one behind any more, the two sides of that equality can be compared as-is — the normalization was
absorbing exactly the regression B12's fix exists to prevent.

Verified to bite by removing the branch itself, not something adjacent: the new test then fails alone
(`1 failed | 33 passed`), and the golden suite's 130 tests pass with the normalization dropped. A first attempt
at the bite proof patched the generic `removeAttribute` instead and broke three unrelated tests — worth noting,
because it shows the new test is specific to this branch rather than to attribute removal in general.

`dom.ts` is untouched afterwards.

Note this finding's agent was interrupted by a server error partway through, having written the `render.test.ts`
half and restored the source it had patched; the `stripEmptyStyles` half and both bite proofs were completed
by hand.

### TEST-13 — mid-animation assertions that can silently not run
**Low · Weak test · [FollowerAnimation.test.ts:165-183](packages/mochart/test/components/FollowerAnimation.test.ts#L165)** — **Fixed**

Both wick-glue loops guard their assertion on a DOM query: the filtering loop `break`s the first
frame `barRects(container, 'up')` is empty, and the restore loop only asserts `if (… .length > 0)`.
Nothing records that the assertion ran. Every other loop-with-`expect` in the suite asserts a length
first — these two are the exception. The comment says these mid-animation frames are the whole point,
so a timing change could reduce the loop to zero assertions and keep only the settled-state check
that the bug never affected.

**Fix:** count the assertions and add `expect(checked).toBeGreaterThanOrEqual(2)` after each loop.

**Fixed by pinning the loop counts, and the finding's premise was verified before trusting it.** Both mid-animation
sampling loops in `FollowerAnimation.test.ts` now assert they reached their glue assertion at least twice, so a
timing change cannot silently reduce the test to its settled checks. Headroom was measured first — each loop runs
all four samples today, so `>= 2` is not tuned to current timing.

Four bite proofs, because the interesting one is that the *old* test was blind:

1. Cutting the animation durations from 1000 to 1 fails the filtering counter with `expected 0 to be greater than
   or equal to 2`.
2. With that same break in place, weakening both guards back to `>= 0` — which is what the old code effectively
   asserted — gives **3 passed**. So the loop really had degenerated to zero assertions and nothing caught it.
3. The restore loop's skip is real rather than hypothetical: `getVisibleSeriesPacingDeltaPercentage` excludes
   hidden series from expansion pacing, and relaxing that filter gives the restore phase a nonzero duration during
   which the restored bars are absent — failing the restore counter the same way.
4. The frames the loops do sample are still meaningful: disabling
   `adjustDeltaPercentagesForFollowerCategories` fails the glue assertion inside the loop with a 5px gap.

The third test was left alone: it calls the glue assertion unconditionally on every sampled frame, so it cannot
silently skip. "Both wick-glue loops" means the filtering and restore loops in the second test, which is right.

Targeted run green (8 files / 77 tests across the animation suites), typecheck and lint clean, and the three source
files broken for the proofs are byte-identical to HEAD afterwards. A full-suite green could not be reached at the
time: another agent was mid-edit in `packages/mochart/src`, producing a `jsdocSync` failure and, in a later run, 119
golden mismatches — `FollowerAnimation` appears in neither failure set.

One thing noticed and left: when the second test fails part-way it aborts before `chart.destroy()`, and the
`afterEach` clears the DOM and timers without destroying a leaked chart, so the third test then fails with a
misleading `TypeError`. Cosmetic — it needs a failure to surface.

### TEST-14 — e2e covers one minimal harness; the shipped gallery, editor, share menu and mobile layout have none
**Low · Test gap · [demo-basic/e2e/](packages/mochart-demo-basic/e2e/) (5 files, 429 lines)** — **Fixed**

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

Fixed with a new `packages/mochart-demo-vanilla/e2e/` suite — 12 tests across
`share`, `editor`, `export` and `mobile` — plus a phone project. 12/12, stable under
`--repeat-each=8 --workers=14` (96/96); demo-basic's 89 unchanged; lint, repo-wide
typecheck and `deadcode` all exit 0.

**Its own `playwright.config.ts`, not folded into demo-basic's.** The specs import
`@mochart/demo-common` and `@mochart/demo-data` for the copy and class constants they
build selectors from — this package's dependencies, which demo-basic declares
neither of, so hosting them in its `testDir` would give it phantom workspace
dependencies. The dev servers differ too (5179 vs 5173), so a merged config would
need a `webServer` array plus per-project `baseURL` regardless: all the cost, none of
the boundary.

**Chromium only, deliberately, plus a phone project.** TEST-15 already runs the three
README engines over library rendering, which is where engines diverge. This suite
covers demo-app plumbing — clipboard, the compressed share payload, a lazy chunk, DOM
reparenting — and one of those cannot run elsewhere at all: Playwright's
`clipboard-read` grant is Chromium-only. A second engine matrix would triple the gate
for coverage that already exists.

**The finding's `devices['iPhone 13']` pin is wrong and was not used.** It stamps a
WebKit user agent, which under Chromium is a lie and under WebKit would pin this
suite's only mobile coverage to the one engine that cannot read the clipboard. The
phone project is Chromium at 390×844 with `hasTouch` — the same viewport that
descriptor carries, which is all the width-driven fold reads. It is a *project*, not
a `setViewportSize`, so the page is **built** at that width and the fold's
initial-mount path runs rather than its resize-watcher path.

Two traps that would each have made a spec vacuous, both handled:
`followShareLink` navigates via `about:blank` first, because the copied link differs
from the copying page only by hash and Playwright's `goto` would treat that as a
same-document navigation — nothing would reload and no state would be consumed. And
the editor waits are web-first assertions on the editor's own `[data-validity]`
attribute (`pending` → `valid`/`invalid`), which only settles once the lazy chunk has
loaded *and* the linter has run; no fixed timeouts.

The share round trip asserts mode (`aria-current="page"` on the switcher segment),
config (the Invert toggle reads its pressed state off the config the view mounted
with — no CodeMirror scraping, no geometry), and the post-load hash strip. Clipboard
goes through `grantPermissions` + `navigator.clipboard.readText()`, so the real
`writeText` path is under test rather than a stub, and no assertion touches the copied
label, since that is DEMO-23's open question. A third test hand-moves a single payload
onto `/multi/` and proves the mode tag rejects it — non-vacuous because the multi test
shows a real 1×3 payload does restore.

Bite proofs: perturbing `EditableChart.placeControls` to mirror instead of reparent
failed `every folded chart control appears exactly once` with
`Reset Categories … Expected: 1, Received: 2` *and* the fold test; perturbing
`DemoSingle` to ignore `sharedState?.config` failed the round trip on
`#config-inverted`'s `aria-pressed`. Both restored, `git diff` clean.

Counts use attribute selectors rather than `getByRole`, deliberately: Playwright's
role engine skips a11y-hidden elements, and a control inside a closed
(`display: none`) panel is exactly what these counts must see.

**Dropped, with reasons:** dark-mode restyling (visual — the screenshot gate owns it,
and asserting computed colours would restate the theme logic), the random-mode share
arm (a third `ShareState` shape through the same mechanism as the two covered), the
gallery landing page, and pixel inspection of the stitched PNG. The stitched *SVG* is
inspected — the downloaded file must contain 5 `<svg` (one outer plus one per tile) —
so "stitched" is verified rather than just the filename.

**A real flake surfaced and is handled honestly, not hidden.** Under heavy parallel
load a press landing shortly after a view's first render is occasionally lost: the
element is where Playwright measured it and the hit test resolves to it, but no
`click` event arrives. Adding any instrumentation before the press made it
unreproducible (96/96, twice), so it could not be attributed. `pressUntil` presses and
asserts the resulting attribute, retrying via `expect().toPass()` — strict, no sleeps.
Worth a separate look in the demo shell.

One thing that could not be built from a constant: element ids such as
`#config-inverted` and `#grid-rows` are hard-coded in the demo's own source with no
exported constant, the same as demo-basic's `#export-svg`. Everything else comes from
`mochartCssClasses`, `demoText` aria/title strings, or `demoTabPanelId`/`demoTabId`,
with zero `mochart-*`/`demo-*` literals and nothing built on the six class names
DEMO-18 removed.

### TEST-15 — the claimed three-engine browser support is only ever tested in Chromium
**Medium · Test gap · [packages/mochart/README.md:252](packages/mochart/README.md#L252), [demo-basic/playwright.config.ts:13](packages/mochart-demo-basic/playwright.config.ts#L13), [ci.yml:33](.github/workflows/ci.yml#L33)** **[from SOL review]** — **Fixed**

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

Fixed by adding `firefox` and `webkit` Playwright projects and installing all three
engines in CI. The README was **not** narrowed — see below, its claim is now
verified rather than merely asserted.

Mechanism: Playwright tags plus per-project `grep`. The `firefox` and `webkit`
projects carry `grep: /@smoke/`; `chromium` carries none, so it still runs all 79.
Opting a test in is one field, `{ tag: smokeTag }`, with `smokeTag` exported from
`e2e/helpers.ts` and documented there. A tag beats a dedicated `smoke.spec.ts`
because the subset is then literally the same code Chromium runs and cannot drift,
and importing the constant prevents a typo'd tag string. The five tagged tests are
all pre-existing: the gallery render for `truncated-text` (picked over `stacked`
because its labels truncate, so it drives `getComputedTextLength` and the
tick-fitting path), the plot-click tooltip/crosshair test, the plot-area keyboard
traversal test, and both export tests. No new selector logic and no new `mochart-*`
literals.

Results: the smoke subset is 15/15 across the three engines, and the default full
run is 89/89 in 21.6s. Typecheck and `eslint .` clean.

**No test failed on any engine.** Because five green tests are weak evidence for
"these engines have never run this code", the `grep`s were removed temporarily and
the *entire* suite run on both: **158/158 (79 × 2)**. So nothing was skipped and
nothing was papered over.

**The finding's risk assessment does not hold.** It calls the exposure "not
theoretical" and names SVG text measurement, SVG focus/keyboard, and
`canvas.toBlob`/`XMLSerializer` as the danger areas — those are exactly the ones
that turned out fine. Its fallback arm, narrowing the README, would therefore have
been wrong. The real payoff is a standing guard against future Blink-only
regressions, not the failures it predicted.

One divergence did surface, from probing the measurement APIs directly rather than
from a failing test: **Gecko's `getBBox().width` is exactly
`getComputedTextLength() + 4.00`**, constant across font sizes 8/12/24/48px and
across strings, and not stroke-related (a `stroke: none; stroke-width: 0` clone
measures the same). Chromium's delta is 0.00; WebKit's 0.00–0.02. Core mixes the two
APIs across the truncation/layout boundary, so in Firefox they are permanently 4px
out of step — benign in direction, since `getBBox` is the larger, so layout
over-reserves rather than clips. Filed separately as TEST-21.

One thing the finding omits: the CI cache key. `actions/cache` only saves on a miss,
so the existing `…-playwright-${version}` key would have kept hitting a
chromium-only cache and re-downloading Firefox and WebKit on every run forever. The
key now ends `-chromium-firefox-webkit` so it invalidates when the engine set
changes.

### TEST-16 — the golden "randomize" transform rewrites row geometry as if it were data
**Low · Test gap · [golden.test.ts:176](packages/mochart/test/golden/golden.test.ts#L176)** — **Open**

*Found while implementing ANIM-1 part 3, not by either review pass.*

`transformValues` — the deterministic stand-in for the demo app's randomize button — maps over
`seriesConfig.property` and rewrites every one as `value * 0.6 + 7 + rowIndex`. For the range-based
chart helpers that property is **structural**, not a measurement. A heatmap row is:

```json
{ "column": "Jan",
  "row0": 6.97,        // band top    (series property)   <- rewritten
  "row0Start": 6.03,   // band bottom (rangeProperty)     <- left alone
  "row0Value": 65 }    // the actual datum (colorProperty) <- left alone
```

So the transform moves each band's *top* to ~11 against an axis pinned `max: 7`, leaves the
*bottom* at 6.03 — stretching a 0.94-tall row into a ~5-tall smear — and, because `rowIndex` is the
**data** row index, gives Jan +7 and Dec +18 so rows that were parallel fan out. The same applies
to waterfall, candlestick and OHLC, whose `property` is likewise a band edge.

Harmless while invisible. It stopped being invisible with the clip indicator: five `heatmap`
snapshots now render a clip band, which reads as "this chart is broken" to whoever looks next. The
indicator is correct — that data really is outside the pinned axis — but the state is one the app
cannot produce. `heatmap--static.html`, on real data, has no band, and the demo's own randomize
path re-runs `createHeatmap`, which recomputes `min`/`max` from the row count so the axis stays in
step.

The deeper cost is that the "updated" and animated snapshots for four chart types pin states that
can never occur, so golden coverage there is weaker than its file count suggests.

**Fix:** use each demo's declared generator. `demos.json` already carries a `generator` field for
exactly these types (`histogram`, `waterfall`, `heatmap`, `candlestick`, `candlestick-hollow`,
`ohlc`) and `@mochart/demo-common`'s `generateDemoDataProvider` re-runs the core helper on random
inputs — which is what the demo actually does, so the snapshots would pin reachable states.
Failing that, transform `rangeProperty` alongside `property` so bands at least stay coherent.

### TEST-17 — no test toggles a visibility flag on a mounted chart, and the gap hides a crash
**High · Test gap · [TextMeasurement.ts:380](packages/mochart/src/utils/TextMeasurement.ts#L380), [LegendLayout.ts:53](packages/mochart/src/layout/LegendLayout.ts#L53)** **[verified]** — **Fixed**

*Found by asking whether hiding and showing chart parts is covered; it is not.*

**The gap.** ~25 config flags hide or show part of the chart (`visible` on the chart, legend,
crosshair, tooltip and each axis; the `show*` family on axes, series, legend and tooltip). Nothing
in the suite flips one on an *already-mounted* chart:

- `ConfigUpdateSmoke.test.ts` — whose oracle is exactly right for this ("after A → B settles, the
  retained DOM must match a fresh mount of B") — contains **zero** occurrences of `visible`.
- The golden suite's config transitions change `title.text`, a series title, `renderer`, `animate`
  on/off, and remove a series ([golden.test.ts:435](packages/mochart/test/golden/golden.test.ts#L435)).
  None touch a visibility flag.
- Every other use of `visible: false` in the suite is a *static mount* that asserts the part is
  absent. Absence is checked; the transition into presence is not.

This matters more than an ordinary gap because the hidden parts are the **text-measuring** ones.
Measurement happens post-commit against real DOM, so a part that was hidden has no measurement to
carry into the frame where it becomes visible.

**The crash it hides.** Mount with `legend: { visible: false }`, then update to `visible: true`:

```
TypeError: legendItemTextRawBounds is not iterable
  at getLegendHeight   src/layout/LegendLayout.ts:53
  at Chart.derive      src/components/Chart.ts:635
  at ChartController.update
```

`getLegendItemTextRawBounds` (and `getLegendItemTextBounds` beside it) returns the `emptyBounds`
**object** when the legend is hidden and an **array** when it is visible. Layout guards the
iteration on `legendConfig.visible` — but on the transition the config already says visible while
the measurement still in state is the object from the hidden frame. The type declaration at
[layout.ts:132](packages/mochart/src/types/layout.ts#L132) states the invariant the bug breaks:
*"the layout code only iterates these behind a `legendConfig.visible` check"*. That check is on the
config; the data is a frame behind it.

Reachable from every binding — a changed config prop goes through `ChartController.update`, which
is the frame in the trace above.

**Scope, measured.** Ten other transitions were probed the same way and all converge to a fresh
mount: chart title, category axis, value axis, tick marks, grid lines, `showInLegend`, tooltip,
crosshair, series labels, axis line, base line, an axis title appearing, and legend icon shapes.
So the defect is specific to the two legend measurement functions, not systemic — but nothing
would have caught it, or would catch the next one.

**Fixed.** `getLegendItemTextBounds` and `getLegendItemTextRawBounds` returned the `emptyBounds`
*object* when the legend was hidden and an array when it was visible, so layout iterated a
non-array on the frame the legend turned visible. Both now return `TextBounds[]` with **one entry
per legend series either way**, measured or not — which is the invariant `getAllBounds` already
maintains for the visible case, since it pads to the series list it is given.

That single change fixes both the `not iterable` throw and the
`Cannot destructure property 'paddingRelativeBounds'` crash sitting behind it: `LegendLayout`
builds one layout entry per measured item while `Legend.sync` renders one per `showInLegend`
series, so an array of the wrong length made the renderer index past the end. Keeping the length
right at the source means `LegendLayout` needs no change at all.

The unmeasured filler is deliberately **not** flagged `default`: `hasDefault` "keeps retrying
bounds that could not be measured yet"
([Chart.ts:733](packages/mochart/src/components/Chart.ts#L733)), so a legend that can never be
measured while hidden would retry every frame.

`getMaxBounds` loses the guard that tolerated the non-array shape.

**Tests.** Four visibility scenarios added to `ConfigUpdateSmoke` — `legend.visible`,
`title.text` null/set, `categoryAxis.visible`, `valueAxes.visible` — each run in **both**
directions by the existing `directions()` helper, against the convergence oracle. The legend
scenario fails on the unpatched source with the original `TypeError` and passes with the fix.

One correction to the probe that found this: the original sweep reported "chart title" as
converging, but it used `title.visible`, which is not a config property — both sides rendered a
config error and compared equal. The title is hidden with `text: null`, and that transition does
converge; the scenario added here uses the real property.

### TEST-18 — tests hard-code CSS class literals instead of reading `mochartCssClasses`
**Low · Maintainability · [ChartDom.ts:8](packages/mochart/src/utils/ChartDom.ts#L8)** — **Fixed**

The class names are constants in the source so a rename is a single edit. The test and e2e suites
mostly ignore them: roughly 466 hard-coded `'.mochart-…'` literals across ~43 files, against 2
files that import `mochartCssClasses`. [API-3](#api-3--crosshair-elements-get-unnamespaced-css-classes)
renamed three classes and had to hand-patch every literal it happened to break; a rename that
missed one would leave a test asserting on a class nothing writes, which passes as a `toBe(0)` and
fails as nothing.

Golden snapshots are excluded — they are rendered output, and the literals in them are the point.

**Fix:** import `mochartCssClasses` and build named selector consts per file. Values with two
space-separated tokens need `.split(' ')` first. Although adding helpers to ChartDom.ts could be cleaner than having all the tests repeat that logic all over the place.
(see [API-4](#api-4--mochartcssclasses-values-are-not-all-class-names-contradicting-the-api-reference)).
A lint rule banning the `'.mochart-'` literal in `test/`/`e2e/` would keep it from coming back.

**Fixed for the core suite, with the helper functions the follow-up note asked for.**
`src/utils/ChartDom.ts` gained eight of them, and its own private selector getters were rewritten to use
them — which removed the four ad-hoc `.split(' ')` workarounds
[API-4](#api-4--mochartcssclasses-values-are-not-all-class-names-contradicting-the-api-reference) cites
in that file:

* `getCssClass(key)` — the bare class, for `classList.contains`
* `getIdCssClass(key, id)` — the per-item class, and it **throws** when the key has no id prefix, so
  misuse fails loudly instead of silently matching nothing
* `getCssSelector(key)` / `getIdCssSelector(key, id)` — `'.'`-joined over every *complete* token, so a
  prefix token can never leak into a selector and `chartError` correctly becomes
  `.mochart-chart.mochart-chart-error`
* `getDescendantCssSelector(...keys)` — the commonest shape in the suite
* `getCssClassMatchSelector(cssClass)` — `[class*="…"]`, preserving the deliberate substring matches on
  elements that also carry an id class
* `getChartRootCssSelector()` and `mochartVersionAttribute` — 22 tests reach the chart root that way
* a `MochartCssClassKey` type, so a renamed key breaks the build rather than leaving a dead selector,
  which is the exact failure mode the finding describes

**460 occurrences converted across 44 test files** — 437 class literals, 22 `data-mochart-version`, one
`data-mochart-focus-restored`. `grep -rnE "[.'\"\`]mochart-" packages/mochart/test --exclude-dir=__snapshots__`
now returns nothing; the five remaining `mochart-` hits are three prose comments, one filesystem path, and
`ChartDom.test.ts`'s regex that *is* the prefix-convention pin. 109 files / 1628 tests pass, typecheck,
lint and deadcode clean.

**Scoped deliberately to `packages/mochart/test`.** The finding also covers
`packages/mochart-demo-basic/e2e`, which is a separate package and cannot import these helpers without
making them public API — a decision that belongs with
[API-2](#api-2--55-layoutanimationdata-internals-ship-as-public-types). That remainder, the four
`data-mochart-version` literals `Chart.ts` still writes inline, and the finding's suggested lint rule are
filed as [TEST-19](#test-19--the-e2e-suite-and-chartts-still-carry-hard-coded-mochart--literals).

Two corrections to the finding: five test files already imported `mochartCssClasses`, not two — four of
them with hand-rolled `.split(' ')` — and its ~466 count folds in the 22 `data-mochart-version`
occurrences, which are an attribute rather than a CSS class.


---

### TEST-19 — the e2e suite and `Chart.ts` still carry hard-coded `mochart-*` literals
**Low · Maintainability · [e2e/](packages/mochart-demo-basic/e2e/), [Chart.ts:1102](packages/mochart/src/components/Chart.ts#L1102)** — **Open**

*Found while implementing [TEST-18](#test-18--the-test-suites-select-by-hard-coded-css-class-literals), not by either review pass.*

TEST-18 converted all 437 class literals in `packages/mochart/test` onto the new `ChartDom` selector
helpers. Two pockets are left:

- **`packages/mochart-demo-basic/e2e`** — 60 `mochart-*` occurrences. It is a separate package, so it
  cannot import `getCssSelector` and friends without those becoming public API, which is
  [API-2](#api-2--55-layoutanimationdata-internals-ship-as-public-types)'s question. The alternative is a
  small local selector module in the e2e directory built on the already-public `mochartCssClasses`.
- **`Chart.ts`** writes the string `'data-mochart-version'` inline at four sites
  ([:1102](packages/mochart/src/components/Chart.ts#L1102), `:1116`, `:1123`, `:1149`) while
  `ChartDom` now exports `mochartVersionAttribute` for exactly that name. `focusRestoredAttribute` in
  `src/utils/utils.ts` is the precedent to follow.

Neither is a defect today; both are the same drift risk TEST-18 removed from the core suite.

**Fix:** give the e2e directory a local selector helper over `mochartCssClasses` (no public API change),
have `Chart.ts` import `mochartVersionAttribute`, and add the lint rule TEST-18 suggested — ban a
`'mochart-'` string literal under `test/` and `e2e/` — so neither pocket can grow back.

### TEST-20 — the API coverage ratchet omits `ChartSeriesClickPayload`
**Low · Test gap · [checkApiCoverage.ts](packages/mochart-docs/scripts/checkApiCoverage.ts)** — **Fixed**

*Found while implementing [DOC-8](#doc-8--contributor-docs-omit-the-generated-apipropsframework-props-pipeline-and-its-ci-ratchets), not by either review pass.*

`checkApiCoverage.ts`'s `propInterfaces` list is what makes the ratchet walk a payload interface's members, and
`ChartSeriesClickPayload` is missing from it — so that payload's members are documented by the generator but not
guarded by the check. A member could be added to it, or lose its description, without the gate noticing.

`ChartSeriesClickPayload` is the payload for `onSeriesClick`, added late (see
[the onSeriesClick work](#api-10--charteventpayloadcategorypercentagevaluepercentage-violate-the-fraction-convention)),
which is presumably why it was never added to the list.

**Fix:** add it to `propInterfaces`, and check whether the list can be derived from the generator's own
`pageSources` groups instead of being maintained in parallel — a hand-maintained mirror of a generated list is
the same drift this ratchet exists to prevent.

**Fixed by deriving the list rather than adding one entry to it — which is the half of this finding worth having.**
`propInterfaces` is gone. The generated model already carries what the hand-list was mirroring: every group in
`api-reference.json` has an `interfaceName`, so one pass over the model now yields both the group interface names
and the documented member keys. Future payload interfaces enrol themselves.

Established as safe rather than assumed: the two lists were *exactly* congruent beforehand — model groups minus the
hand list was `['ChartSeriesClickPayload']` and the reverse was empty, so there was no legitimate divergence to
preserve. And the derivation is not circular, because `apiReferenceModel.ts` already fails the generator when an
exported interface in `types/chart.ts` has neither a page group nor an `internalInterfaces` reason: the model's
group list is therefore guaranteed to be every exported prop/payload interface except the declared internals, which
is precisely the set this check wants. The internals exemption moves to its single source rather than being lost,
and a vacuity guard was added so a model declaring zero groups fails instead of passing an empty walk.

**The finding's suggested bite does not exercise this check, and that matters.** Removing a member's JSDoc makes the
*generator* fail, and because `generateDocs` writes nothing on a failed run
([API-12](#api-12--generate-docs-writes-its-output-before-reporting-integrity-errors)), the on-disk model still
contains the key and the coverage check passes — that path was already guarded, by the generator, and
`npm test -w @mochart/docs` runs `gen` first so the gate as a whole always caught it. The mutation this check
actually guards is a member present in a documented interface but *absent from the model*. Proved with a probe
member and no regeneration: the fixed script reports it undocumented and exits 1, while the pre-fix script (run
from `git show HEAD:`) reports `✓ all 232 …` and exits 0. Same probe, opposite verdicts. The clean count moved
232 → 233, the new name being `nearestCategoryIndex`, the only member of that payload not shared with another
documented interface.

So one clause of the finding is wrong: a member *losing its description* was never the exposure — that is the
generator's own integrity error. Only the added-or-renamed-member case was.

`packages/mochart/src/types/chart.ts` was hashed before and after the probe and is byte-identical to HEAD; the
probe lines were reverted by targeted edit rather than by overwriting a file other agents were touching.

Left as a separate matter: the file header calls this ratchet "the backstop for a member quietly moving to an
undocumented interface", which is aspirational either way — a member moved into `ChartDomAccessors` or
`InternalFocus` still drops silently out of the walk, since those are deliberately not walked.
### TEST-21 — text is measured in two spaces that differ by a constant 4px in Gecko
**Low · Bug · [TextTruncation.ts:154](packages/mochart/src/utils/TextTruncation.ts#L154) vs [TextMeasurement.ts:164](packages/mochart/src/utils/TextMeasurement.ts#L164), [:182](packages/mochart/src/utils/TextMeasurement.ts#L182)** — **Fixed**

*Found while implementing [TEST-15](#test-15--the-claimed-three-engine-browser-support-is-only-ever-tested-in-chromium), not by either review pass.*

Core mixes two SVG measurement APIs across the truncation/layout boundary: `TextTruncation` fits text
to its budget with `getComputedTextLength()`, while `TextMeasurement` measures the resulting element
with `getBBox()` and then `Math.ceil`s it. The two agree in Blink and WebKit but not in Gecko.

Measured directly in all three engines (Playwright, throwaway probe):

| Engine | `getBBox().width - getComputedTextLength()` |
|---|---|
| Chromium | 0.00 exactly |
| WebKit | 0.00 – 0.02 (float rounding) |
| Firefox | **exactly 4.00** |

Constant across font sizes 8/12/24/48px and across strings (`M`, `MMMMMMMMMM`, `iiii`, `Hello world`).
Not stroke-related — a clone with `stroke: none; stroke-width: 0` measures the same, and the tick
labels carry no stroke. It is Gecko's fixed 2px-per-side inflation of text bounding boxes.

**Benign in direction, which is why nothing fails.** `getBBox` is the larger of the pair, so Firefox
over-reserves rather than under-reserves: value-axis gutters, category-axis label bands, legend items,
the title and the tooltip sizer each reserve up to ~4px more than needed. Nothing clips and nothing
oscillates, and the full e2e suite passes on Gecko unmodified. The cost is layout that is slightly
looser in Firefox than the same chart in Chrome, with no test able to notice.

**Fix:** measure one way. Either derive the text width in `TextMeasurement` from
`getComputedTextLength()` (with `getBBox()` used only for the height it is genuinely needed for), or
subtract the measured delta once per document. The first is preferable — a single source of truth for
width — but it needs care where `getBBox()` is currently measuring a `<text>` with `<tspan>` children.
Golden snapshots are produced against the synthetic font harness from
[TEST-6](#test-6--the-golden-oracle-depends-on-the-machines-fonts), so they will not move; the change
is only observable in a real Gecko browser.

Fixed by taking width from `getComputedTextLength()` — the same call truncation fits
text with — at the only two `getBBox()` call sites in the package. A new private
`getSvgWidth()` in `utils/TextMeasurement.ts` does that; `getBBox()` is still called
once per element but only its `height` is used, and both `getSvgWidthAndHeight()` and
`getSvgMaxWidthAndHeight()` route through it. No caller changed.

**The inconsistency is removed for width, not merely reduced.** Every consumer of a
measured SVG text bound reads both width and height; not one site needs the box
itself — `x`/`y` are never returned, let alone read. Height keeps a single source
too (`getBBox().height`), so no quantity is measured two ways any more. What remains
is an unfixable asymmetry rather than an inconsistency: there is no advance-based
height API, and the em-box height is genuinely wanted for descenders.

**The `<tspan>` worry was empty** — `grep tspan packages/mochart/src` returns zero
hits. Core renders one `<text>` per label with a single text node, so
`getComputedTextLength()` on the parent is exactly the string's advance at every
site. That was the main reason to look before leaping and it turned out to be a
non-issue.

**Real-browser confirmation, which is the only verification that matters here.** With
Firefox running the edited source through Vite's `development` condition, on the
grouped demo at 1280×800: value-axis tick-label group width 35 → **31** (Chromium
30), value axis width 39 → **35** (Chromium 34), series container x 44 → **40** and
first bar x 46.67 → **42.75**, both now exactly Chromium's. Legend width 688 →
**668.1**. Firefox's plot geometry lands on Chromium's to the pixel. No new
truncation appeared — truncated-label count is 0 on `grouped` and 10 on
`truncated-text` before and after, matching Chromium. Full e2e suite green on all
three engines, 89 passed.

**Nothing depended on the +4 slack**, and the argument is structural rather than
empirical: Blink and WebKit have shipped with zero slack all along, so a layout that
clipped without it would already be clipping in Chrome.

`Math.ceil` stays and is now load-bearing on purpose. When a title fits,
`TitleLayout` sets `textWidth = textRawWidth`, so truncation tests
`advance > ceil(advance)` — false. With `floor` or `round` it can go true and the
title truncates a character it had room for. Pinned by a test and a one-line comment.

`getBounds`'s `width === 0 || height === 0` → `defaultBounds` retry guard is
unaffected: it is an OR and height still comes from the box, so a hidden container
still marks itself for re-measure.

**Goldens: zero movement**, confirmed empirically. The harness's `getBBox` and
`getComputedTextLength` agree *by construction* — both are
`measureTextWidth(textContent)` — and that agreement is deliberate and documented in
the harness. The harness is not what should change: it should model one coherent
synthetic font, and the Gecko divergence belongs in a targeted unit test plus a real
browser, which is where it now lives.

New `test/utils/TextWidthMeasurement.test.ts`, 6 tests. Its fake `<text>` disagrees
with its own advance in *both* dimensions, so a width leaking in from the box and a
height leaking in from the advance both fail. Bite proofs: reverting the width source
to `getBBox().width` fails 2 tests off by exactly 4 (`expected 20 to be 16`); changing
`ceil` to `floor` fails 4, including the whole string truncating away
(`expected '' to be 'M'`).

Five corrections to the filing, four of them mine: Chromium's delta is 0.00–0.09 on
live chart labels, not 0.00 exactly (`Prefix #`: advance 55.38, box 55.46) — Firefox
was exactly 4.00 on all 56, so the headline holds. The `<tspan>` care was unnecessary.
"2px-per-side inflation" is confirmed for width only; vertically Firefox reports 20px
against Chromium's 18px, a 2px total that cannot be decomposed into inflation versus
font metrics, so nothing claims it. The tooltip sizer was never part of this — it is
measured with `getBoundingClientRect`. And the legend was understated: it loses ~20px
on the grouped demo, not ~4, because the over-reservation is per item.

Suite excluding three files being live-edited by concurrent agents: 117 files / 1627
tests pass. Those 126 failures were confirmed foreign by reverting the one-line width
change and re-running to an identical count; nothing was regenerated.



# 12. Build, tooling, packaging and CI

### TOOL-1 — only `build:pages` guards against a stale library `dist`
**High · Bug · [scripts/build-pages.mjs:18-51](scripts/build-pages.mjs#L18), [package.json:31](package.json#L31)** — **Fixed**

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

**Fixed automatically.** Took the first option: `scripts/ensure-libs-fresh.mjs` holds the mtime
check (now the only copy — `build-pages.mjs` imports `ensureLibsFresh()` and its ~35 duplicated
lines are gone), and a `prebuild` hook runs it on the root `build` and on all nine packages that
bundle against `dist`: the six galleries, `docs`, `demo-basic` and `benchmark`. Build orchestration
was not adopted here because that is a toolchain decision, not a bug fix — see
[TOOL-2](#tool-2--no-release-pipeline-no-changelog-and-no-version-tooling-for-9-public-packages),
where the same question comes up for releases.

Verified live: with a stale dist the guard fires and rebuilds (`npm run build -w
@mochart/demo-vanilla` and `-w @mochart/docs` both caught a touched lib), and a second run is
silent. All nine library dists — every one of which was stale on this checkout — are now current.
Lint and deadcode clean.

### TOOL-2 — no release pipeline, no CHANGELOG, and no version tooling for 9 public packages
**High · Missing feature · [.github/workflows/](.github/workflows/) (only `ci.yml`)** — **Open**, deferred to release time

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

**Needs an answer — not fixed.** Confirmed as described. This is the one finding in the High tier
that is a *policy* decision rather than a defect: a release pipeline encodes how you want to cut
versions, and picking Changesets (or not) shapes every future PR, so guessing costs more than
asking. Two details worth having before you choose: the packages already carry `prepack` build
hooks, so tarball freshness is handled once a workflow exists; and cross-package ranges are
`^1.0.0`, which means a coordinated bump is the only correct shape — a lone `@mochart/react`
publish against an unpublished `@mochart/core` is exactly the failure the finding names.

> **QUESTION (needs an answer):** **Which shape do you want?** (a) **[recommended]** Changesets —
> contributors add a changeset per PR, a release PR accumulates bumps and CHANGELOGs, merging it
> publishes; handles the coordinated `^1.0.0` bumps for free; (b) a tag-triggered
> `release.yml` running the CI gate then `npm publish --workspaces --provenance`, with versions
> bumped by hand — much less machinery, but nothing generates a CHANGELOG or keeps the nine
> packages in step; (c) manual publishing as today, plus only the `npm pack --dry-run`
> tarball-contents check in CI so `files` regressions are caught even without a pipeline.
>
> *Recommendation: (a), and (c) regardless of which you pick.* The pack check is independently
> worth having and costs one CI step. If you want (a), say so and I will wire up Changesets,
> `release.yml` with `--provenance`, and the pack check together.

**Deferred by decision.** The shape will be chosen at release time, so this is *not* waiting on
an answer — the question above is kept for whoever picks it up. The `npm pack --dry-run` tarball
check was offered separately and deferred with it.

### TOOL-3 — no dependency audit anywhere, and 9 known vulnerabilities are present
**High · Tooling gap · [ci.yml:20-33](.github/workflows/ci.yml#L20); no `dependabot.yml`, no `renovate.json`** — **Fixed**

CI runs lint/deadcode/typecheck/test/e2e/build but never `npm audit`. `npm audit` reports **9
vulnerabilities (3 moderate, 6 high)** today: `react-router 7.12.0–7.18.1` (high, CSRF bypass —
a direct dependency of `@mochart/demo-react`, so it ships in the deployed Pages/Cloudflare site),
`undici 7.0.0–7.28.0` (high ×5), `postcss <=8.5.22` (moderate).

**Fix:** add `npm audit --audit-level=high` to the `build-test` job (or a scheduled job so a new
advisory doesn't block unrelated PRs), and add `.github/dependabot.yml` with a weekly grouped npm check.

**Partially fixed automatically — the rest needs an answer.**

*Fixed:* the tooling gap. `.github/dependabot.yml` runs a weekly grouped npm check (dev and
production grouped separately, majors excluded so d3/Angular/framework-peer bumps land as their
own reviewable PR) plus a github-actions check. `.github/workflows/audit.yml` runs
`npm audit --audit-level=high` weekly and on demand, with `npm ci --ignore-scripts` since an audit
needs the tree resolved, not built.

Deliberately **scheduled rather than added to `build-test`**: `npm audit --audit-level=high`
exits 1 on this checkout right now, so wiring it into CI would have turned every open PR red
overnight for advisories none of them introduced. The finding offers both placements; this is the
one that does not break the build while you are away.

**Advisories: answered — fixed what ships, scoped the job to match.** `npm audit fix` took the
count from **9 to 3** with six patch bumps inside the declared ranges, so only `package-lock.json`
changed: `brace-expansion` 2.1.2→2.1.4, `fast-uri` 3.1.3→3.1.5, `nanoid` 3.3.16→3.3.18, `postcss`
8.5.19→8.5.26, `react-router` 7.18.1→7.18.2, `undici` 7.28.0→7.29.0. `npm audit --omit=dev` is now
clean: **nothing that ships has a live advisory.**

`react-router` is a direct dependency of the deployed React gallery, so it was verified in a real
browser rather than by building: clicking a gallery card navigated to `/react/single/stacked`, the
chart drew 78 bars, browser-back restored the gallery, and no console or page errors were raised.
The gallery navigates programmatically rather than through links, so that click exercises the
router path the bump touches.

**The three left are one chain with no fix: `vitepress` → its bundled `vite 5` → `esbuild`.**
VitePress has no CVE of its own, and 1.6.4 *is* the latest stable (2.0 is `alpha.19`). The CVEs are
dev-server attacks — a website reaching the dev server, path traversal in optimized-deps `.map`
handling — and three of the five are Windows-only. None reach built output. The root Vite (8.1.5)
is already outside the advisory range; only VitePress's private copy is affected.

Forcing a patched esbuild into that copy was tried three ways — a nested
`vitepress → vite → esbuild` override, a global `esbuild` override, and a `--package-lock-only`
re-resolve — and **none moved the nested copies**; `vitepress/node_modules/esbuild` stayed at
0.21.5. Overrides do work here (the existing `react` one resolves with no nested copies), so npm is
holding those subtrees. The only route left is regenerating the lockfile from scratch, which churns
every dependency, and Vite 5.4.21 declares `esbuild ^0.21.3`, so a jump to 0.28 would likely break
the docs build anyway.

`audit.yml` therefore gates on `npm audit --omit=dev --audit-level=high`, which passes, and runs the
full audit after it with `|| true` so the dev-only advisories stay visible without turning the job
red. An audit that always fails is an audit nobody reads. Dependabot will offer the VitePress bump
once 2.0 is stable.

### TOOL-4 — `npm run deadcode` filters out knip's dependency and duplicate-export checks
**Medium · Tooling gap · [package.json:41](package.json#L41) — `knip --include exports,types,files`** — **Fixed**

The filter discards `dependencies`, `unlisted`, `binaries`, `unresolved`, `duplicates`,
`classMembers` and `enumMembers`. CI runs the filtered command, so it is green while an unfiltered
`npx knip` reports 2 unused dependencies (`@codemirror/commands`, `@codemirror/search` in
`mochart-editor`) and 1 duplicate export
(`TOP_RIGHT_BOTTOM_LEFT|MARGIN_KEYS|PADDING_KEYS` in `config/core/constants.ts`). The current
dependency hits are benign, but nothing would catch a genuinely orphaned runtime dependency shipped
to consumers of a public package.

**Fix:** change the script to plain `knip` and fix or explicitly `ignoreDependencies` the current
hits; at minimum add `dependencies,unlisted,duplicates` to the include list.

**Fixed by unfiltering the gate, and by removing the two hits it then found.** `deadcode` is now plain
`knip` instead of `knip --include exports,types,files`, so the full default issue set gates every PR:
unused and unlisted `dependencies`, missing `binaries`, `unresolved` imports, `duplicates`,
`nsExports`/`nsTypes`, `namespaceMembers` and `enumMembers`. Preferred over adding three names to the
include list because it is the stronger gate and needed no `ignoreDependencies` escape hatch.

Unfiltering immediately failed on two real hits, now removed: `@codemirror/commands` and
`@codemirror/search` were **runtime `dependencies` of the published `@mochart/editor`** and imported
nowhere — exactly the "orphaned dependency shipped to consumers" case the finding says nothing would
catch. Removing them is safe because `codemirror` still depends on both, so the installed graph is
unchanged; the editor builds, typechecks and passes its 25 tests against the trimmed manifest, and the
lockfile diff is those two lines only.

No workflow change: `ci.yml` already runs the root `deadcode` script, so it picks this up as-is.

Two of the finding's details did not survive contact. The duplicate-export hit it cites is stale —
`TOP_RIGHT_BOTTOM_LEFT` is a single export now (collapsed under
[TOOL-13](#tool-13--minor-manifest-and-config-drift)) and `knip --include duplicates` reports nothing.
And `classMembers` is not a knip 6 issue type at all, so it was never among what the filter discarded.

Two knip *configuration hints* remain (redundant `playground/*` entry patterns in `knip.json` for the
editor). Hints do not affect the exit code and are outside this finding; clearing them would mean
`--treat-config-hints-as-errors` or dropping those patterns.

### TOOL-5 — `@mochart/core` inlines its runtime dependencies but still declares them; nothing declares `sideEffects`
**Medium · Inconsistency · [mochart/vite.config.ts:3-5](packages/mochart/vite.config.ts#L3), [mochart/package.json:44](packages/mochart/package.json#L44)** **[verified]** — **Fixed**

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

**Fixed, but not the way the finding frames it, and one of its two targets must not move.**

The seven `d3-*` packages moved from `dependencies` to `devDependencies`. That arm was chosen over
externalizing them in Vite, which would have broken the documented self-contained artifacts — `dist/mochart.iife.js`
exposing the global `mochart` has to carry its own d3. `d3-*` is imported only by `src/`, which reaches a
consumer solely through the repo-internal `development` condition, so dev-only is the accurate declaration.
Nothing outside `packages/mochart` imports d3, and the packages stay installed at the root, so no resolution
in the repo changes.

**`@mochart/movalid` cannot move and stays a real dependency.** The finding lumps it in with the d3 packages;
it is not the same case. movalid's `Validator` type appears in core's *emitted declarations* —
`--listFiles` from `dist/types/index.d.ts` pulls in `packages/movalid/dist/validators.d.ts` via
`dist/types/config/validation/mochartConfig.d.ts` — so de-declaring it would break consumer type resolution
in exactly the way the `shapeUtils` reference already did
([TOOL-17](#tool-17--the-published-types-entry-references-d3-shape-types-a-consumer-cannot-resolve)).

`sideEffects` added to all nine published manifests: `["*.css"]` for `@mochart/core` and `@mochart/editor`,
the only two that ship a `css/` directory, since webpack drops a consumer's `import '@mochart/core/mochart.css'`
from a package declaring `false`; `false` for the other seven, checked mechanically — none of their `src/`
imports a stylesheet and none registers anything at module scope (no `customElements.define`, no
`globalThis`/`window` assignment), so every export is pure.

Worth tempering one claim: `sideEffects` does little for core's own bundle. The ES output is a single
Rollup-produced module that Vite already marks pure internally, so the flag mainly helps consumers of the
bindings and guarantees the CSS entry keeps working — not the "tree-shake the 500 KB bundle" the finding
implies.

Verified: core builds (526.43 kB) and the bundle is still fully inlined — a grep for bare-specifier
`import`/`export ... from` in `dist/mochart.js` returns nothing. Repo lint passes; core's own src project
typechecks clean. The lockfile was resynced with `npm install --package-lock-only --ignore-scripts`: 16
insertions, 6 deletions, marking the ten hoisted d3 packages (including `internmap`) as dev.

### TOOL-6 — the documented IIFE build is shipped but unreachable through `exports`
**Medium · Bug · [mochart/package.json:34-40](packages/mochart/package.json#L34); documented at [getting-started.md:131](packages/mochart-docs/guide/getting-started.md#L131)** — **Fixed**

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

**Fixed by exporting the two missing subpaths.** `packages/mochart/package.json`'s `exports` map gains
`"./mochart.iife.js": "./dist/mochart.iife.js"` and `"./package.json": "./package.json"`.

The public name is `./mochart.iife.js` rather than `./dist/mochart.iife.js`, keeping `dist/` an implementation
detail and staying parallel to the existing `./mochart.css` entry, which likewise hides `css/`.
`./package.json` matters separately: tooling that reads a dependency's manifest was blocked too.

Verified by resolution rather than inspection — all four specifiers now resolve where before two failed with
`ERR_PACKAGE_PATH_NOT_EXPORTED`:

```
OK  @mochart/core             -> packages/mochart/dist/mochart.js
OK  @mochart/core/mochart.css -> packages/mochart/css/mochart.css
OK  @mochart/core/mochart.iife.js -> packages/mochart/dist/mochart.iife.js
OK  @mochart/core/package.json    -> packages/mochart/package.json
```

`guide/getting-started.md` named the on-disk path `dist/mochart.iife.js`; it now names the exported specifier,
so the documented and the resolvable name agree. Docs site builds clean. No lockfile change — `exports` is not a
dependency field.

Two refinements to the finding: its cited range starts one line late (`exports` opens at :33, and 34-40 is the
body), and the blast radius is slightly wider than "a raw CDN URL that bypasses `exports`" — the map also blocked
`import.meta.resolve` inside this repo, so the repo's own tooling could not locate the artifact by specifier
either.

### TOOL-7 — `lint` and `deadcode` gate every PR but are documented nowhere
**Medium · Doc gap · [CONTRIBUTING.md:12](CONTRIBUTING.md#L12), [:150](CONTRIBUTING.md#L150); [README.md:78](README.md#L78)** — **Fixed**

CI runs `lint`, `deadcode` and `typecheck` before anything else. CONTRIBUTING's Getting-started
block lists `npm test`, `npm run typecheck` and `npm run test:e2e` but not lint or deadcode; its
"CI guardrails, in one place" table — whose stated purpose is exactly that — lists six content
checks and omits all three. The root README's Scripts section likewise omits `lint`, `deadcode`,
`build:pages`, `test:e2e` and `screenshots`. A contributor following the documented workflow to the
letter pushes and gets a CI failure from a check no document mentioned.

**Fix:** add both to the quickstart, add Lint / Dead code / Typecheck rows to the guardrails table,
and sync the README Scripts block with `package.json`.

**Fixed in both places the finding names.** `CONTRIBUTING.md` now documents the PR gate in CI's exact
order — `lint`, `deadcode`, `typecheck`, `test`, `test:e2e` — as a runnable block in Getting started,
notes that `test:e2e` needs `npx playwright install chromium` once per machine and that CI then runs
`build:pages` twice (once per base path), and adds `lint`, `deadcode` and `typecheck` rows to the
existing "CI guardrails, in one place" table. Two bullets cover what each of the two new gates actually
checks: lint is configured for bugs rather than formatting, type-aware rules cover `.ts`/`.tsx` while
`svelte-check`/`vue-tsc` cover `.svelte`/`.vue`, and knip's reachability starts from `knip.json`'s
`entry` patterns. Both notes say `lint` and `deadcode` exist only at the root and give the narrowing
forms.

The root `README.md`'s Scripts block — the second half of the finding's fix — was out of sync in both
directions and is now complete: it lists the CI gate as its own block, adds `build:libs`,
`build:pages`, `preview:pages`, `preview:pages:serve`, `screenshots` and `screenshots:compare`, and
mentions `lint:fix`. Checked mechanically: every script in the root `package.json` now appears in the
README.

Every documented command was run and exits 0, including the full e2e suite (79 tests) and
`build:pages`. `lint:fix` was verified through `eslint . --fix-dry-run` rather than by writing.
Nothing in CI turned out to lack a local equivalent; only `PAGES_BASE` differs, which the existing
"Site assembly and deployment" section already covers.

Wording note: the dead-code row describes the gate as it stands after
[TOOL-4](#tool-4--knips-most-valuable-checks-are-filtered-out-of-the-deadcode-gate) unfiltered it, so
it names the dependency check too.

### TOOL-8 — no `engines` field on any package, and CI tests exactly one Node version
**Medium · Missing feature · all 21 `package.json` files; [ci.yml:12](.github/workflows/ci.yml#L12)** — **Fixed**

No package declares a supported Node range, there is no `.nvmrc`, and CI hardcodes a single Node 22
runner with no matrix (local development here is on Node 26.5.0). Consumers get no install-time
signal about the Node floor; contributors get no version pin; and a feature that works on Node 26
locally but not on the CI runner is only discovered by accident. The `@angular/*` 22 toolchain in
particular has a narrow supported range.

**Fix:** add `"engines": {"node": ">=20.19"}` (or the real floor) to the 9 published packages and
the root, add `.nvmrc`, and give `build-test` a `strategy.matrix.node-version: [22, 24]`.

**Fixed, with the floor established by measurement rather than the finding's guess.** `engines.node` is declared
on the root manifest and on all nine published packages, `.nvmrc` pins contributors to 24, `audit.yml` now reads
that file instead of carrying a second literal, and `ci.yml`'s `build-test` runs the whole pipeline on a Node 22
and 24 matrix with `fail-fast: false`, so a Node-specific break is attributable to a leg.

**The finding's `">=20.19"` is not the real floor and is not even a possible one.** The `@angular/*` 22 toolchain
declares `^22.22.3 || ^24.15.0 || >=26.0.0`, and scanning all 343 installed packages that declare
`engines.node`: Node 20.19.0 leaves 10 incompatible, 22.12.0 leaves 26, 22.22.2 still leaves 9, and **22.22.3
leaves zero**. So the floor is exactly 22.22.3, and both matrix legs satisfy it. It was then exercised rather
than asserted: Node 22.22.3 was downloaded and `npm run typecheck` and core's suite (109 files / 1661 tests) both
run clean on it, with no snapshot churn.

**"Give `build-test` a matrix" is also not a one-line change**, which is the more useful correction. The job
uploads three named artifacts and artifact names are workflow-global, so an unguarded matrix collides on all
three and `upload-artifact@v4` fails on a duplicate name — a naive matrix would have broken both deploys. Hence a
`matrix.site` flag confining the site builds and uploads to one leg, and a per-leg trace artifact name. Proved by
a matrix expander that evaluates every step condition per leg across all four deploy-flag scenarios: as written,
each artifact is uploaded by exactly one leg (exit 0); with the guards stripped, all three are uploaded twice
(exit 1).

The `engines` declaration was proved to bite too: a scratch package with `">=99.0.0"` under
`--engine-strict` fails with `npm error notsup … Actual v26.5.0`, while `">=22.22.3"` exits 0.

Repo lint and typecheck clean; the lockfile is resynced for the ten new `engines` blocks.

Two things left deliberately: the matrix does **not** cover the Node 26 in use locally — `.nvmrc` closes that gap
from the other side by pinning contributors to a CI-tested version, and adding `'26'` to the list is a one-word
change if testing it is preferred to pinning away from it. And `CONTRIBUTING.md` still has no Node prerequisite
line pointing at `.nvmrc`.

### TOOL-9 — no SECURITY.md, issue/PR templates, `.editorconfig`, CODEOWNERS, or `bugs` field
**Medium · Missing feature · [.github/](.github/) contains only `workflows/`** — **Fixed**

Verified absent: `SECURITY.md`, `CODE_OF_CONDUCT.md`, `.editorconfig`, `.nvmrc`,
`.github/ISSUE_TEMPLATE/`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/CODEOWNERS`,
`.github/dependabot.yml`. None of the 9 published packages declares a `bugs` field, so npm renders
no "issues" link for any of them. The repo is being prepared to go public (the deploy jobs are gated
on that) — without a vulnerability-reporting channel, a security report arrives as a public issue.

**Fix:** add `SECURITY.md` with a private reporting address (and enable GitHub private vulnerability
reporting), a PR template mirroring the CONTRIBUTING checklist,
`"bugs": {"url": "https://github.com/jharris4/mochart/issues"}` to all 9 published manifests, and
`.editorconfig` matching the repo's 2-space style.

**Fixed: `SECURITY.md`, `.editorconfig`, a PR template, and the `bugs` URL on all nine published manifests.**

`SECURITY.md` points at the GitHub draft-advisory URL as the private channel, notes explicitly that the form
only exists once *Private vulnerability reporting* is enabled in repo settings and that it must be enabled
before the repo goes public, and states the support surface (latest of each of the nine packages, no maintenance
branches). No personal email address, deliberately, in a file destined for a public repo — add one there if you
want a non-GitHub fallback. The PR template mirrors CONTRIBUTING's gate list plus the conditional items
(regenerate the config and prop artifacts, read golden diffs like code, all six galleries, `stamp-version` after
a bump), linked by absolute URL since template text lands in a PR body where relative links do not resolve.

`.editorconfig` carries one exemption worth recording, because it would otherwise have broken the suite:
`insert_final_newline` is a hazard for the 451 golden snapshots. 471 tracked files end without a final newline,
451 of them snapshots, and `@vitest/snapshot` compares file snapshots untrimmed — so an editor saving one would
fail the run. Proved outside the repo rather than by touching the snapshots: a scratch `toMatchFileSnapshot`
test passed, then appending a newline to its snapshot made it fail. `src/version.ts` and `mochart-docs.html`
also lack final newlines but need no exemption; `stampVersion --check` compares a regex substitution, so a
trailing newline survives it.

No `editorconfig-checker` gate was added, deliberately: CONTRIBUTING states ESLint carries no formatting rules,
so a formatting gate would contradict the repo's own stance.

The `bugs` field the agent was fenced away from is now on all nine manifests. The companion idea — a
`check-manifests` gate asserting every published manifest declares it — is worth having and would have landed red
before the field existed; it is a small follow-up now that it does.

Nothing executable was added, so no new CI gate; lint, typecheck and deadcode are unaffected.

Two staleness notes: the finding lists `.nvmrc` as absent, but it exists now and `audit.yml` reads it via
`node-version-file`; and its title names `CODE_OF_CONDUCT.md`, `CODEOWNERS` and `dependabot.yml`, which its
**Fix:** paragraph does not ask for and which remain absent.

### TOOL-10 — `prebuild` writes into a tracked source file on every install
**Low · Inconsistency · [mochart/package.json:54](packages/mochart/package.json#L54) → [stampVersion.ts:18](packages/mochart/scripts/stampVersion.ts#L18); target [src/version.ts](packages/mochart/src/version.ts) is git-tracked** — **Fixed**

`stampVersion.ts` rewrites the tracked `src/version.ts` whenever it differs from `package.json`. It
runs as `prebuild`, which runs under `prepack` **and** under the root `prepare` → `build:libs`
chain — i.e. on every `npm install` and every CI `npm ci`. The moment `version` is bumped, a plain
`npm install` leaves the working tree dirty with a file the author did not edit. Nothing gates the
file's freshness the way `jsdocSync.test.ts` gates the generated JSDoc.

**Fix:** emit `version.ts` into the gitignored `generated/` directory, or add a `--check` mode plus
a test that fails when the tracked file is out of sync (mirroring the `jsdocSync` pattern).

**Fixed with `--check` plus the companion test.** `stampVersion.ts` takes a `--check` flag (mirroring
`generateJsdoc.ts`'s convention) that never writes and exits 1 with the command to run when
`src/version.ts` disagrees with `package.json`. `prebuild` now runs `--check`, so nothing on the
install or build path mutates tracked source — root `prepare` → `build:libs` → core `prebuild`, and
every plain `npm run build`, only verify. The write is still automatic where it matters: `prepack` is
`npm run stamp-version && npm run build`, so a published tarball always carries the declared version.
A manual bump is `npm run stamp-version -w @mochart/core`.

The finding's other option — emitting into the gitignored `generated/` — was not taken because it
would move a module `src/index.ts` and `src/components/Chart.ts` import, a larger change than the
problem warrants.

`test/config/versionSync.test.ts` pins the tracked file to `package.json` the way `jsdocSync.test.ts`
pins the generated JSDoc. It is not redundant with `prebuild --check`: the check only runs on a build,
so a version bump can be committed with the stamp missing and nothing notices until someone builds; the
test makes it a normal test failure instead of a failed install.

Verified end to end, including the drift path in a scratchpad copy: with a bumped manifest, `--check`
exits 1 with the message, the write mode stamps it, and a re-run passes. `deadcode` clean.

### TOOL-11 — CI hygiene: duplicated site build, uncached browsers, discarded failure traces
**Low · Tooling gap · [ci.yml:26-42](.github/workflows/ci.yml#L26)** — **Fixed**

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

**All three parts fixed, with one deliberate departure on part 1.**

**(1) Duplicated site build.** Two job-level env flags mirror the deploy jobs' `if:` expressions
verbatim (`DEPLOY_PAGES`, `DEPLOY_CLOUDFLARE`), and each deploy-specific build *and its matching upload*
is gated on the corresponding flag. Gating both builds and stopping there — what the finding asks for —
would leave the VitePress build and all 12 demo Vite builds completely unexercised on a PR, because
nothing else runs them: the docs package's `test` script runs its generators and coverage checks, not
`vitepress build`. So a third `Build site` step with `PAGES_BASE: /` runs only when *neither* deploy flag
is set, and uploads nothing. Net: a PR or non-main push now runs **one** site build instead of two; main
with one variable set runs one; main with both set runs two, which is irreducible — the two hosts need
different `base` values and `build-pages.mjs` wipes `site/` per run.

The artifact path was traced rather than assumed: each deploy job's condition is exactly the flag that
gated its build and upload, and the Pages upload runs before the Cloudflare build wipes `site/`. In the
one-variable case the other artifact is absent but the job needing it is skipped by the same condition,
so no path reaches a deploy without its artifact.

**(2) Browser cache.** `actions/cache@v4` over `~/.cache/ms-playwright`, keyed
`${{ runner.os }}-playwright-<resolved version>` where the version is read from
`@playwright/test/package.json` *after* `npm ci` — the resolved version, not the `^` range, which is the
exact invalidation boundary since browser revisions are pinned to the package version. No `restore-keys`,
which would carry stale revisions into a re-saved, fattening cache. `--with-deps` still runs
unconditionally: the apt packages are not in the cached path, and `playwright install` skips the download
for revisions already present.

**(3) Failure traces.** `if: failure() && steps.e2e.outcome == 'failure'` uploads
`packages/mochart-demo-basic/test-results` as `playwright-traces` with a 7-day retention, scoped to the
e2e step's own outcome so a lint or unit failure does not fire a "no files found" upload. **The finding is
wrong about `playwright-report/`**: the config uses `reporter: 'list'` only, so no HTML report is ever
produced and uploading that path could only warn. Adding an `html` reporter would mean editing
`playwright.config.ts`, which is a separate decision.

Validated statically, since Actions cannot run here: `yaml-lint` passes, the parsed step order is
checkout → setup-node → npm ci → lint → deadcode → typecheck → test → playwright version → cache →
playwright install → e2e → trace upload (on e2e failure) → the three conditional site builds with their
uploads. The version step's `run` body was executed locally under `bash -e` and printed
`version=1.61.1`. It is written as a `version="$(…)"` assignment rather than an inlined substitution
because under `bash -e` an inlined failure would still exit 0 and silently emit the key
`Linux-playwright-`; the assignment form aborts.

### TOOL-12 — ESLint's type-aware rules are silently off for two workspaces and all `*.config.ts`
**Low · Tooling gap · [eslint.config.mjs:56-62](eslint.config.mjs#L56)** — **Fixed**

The type-aware block (`no-floating-promises`, `no-misused-promises`, `await-thenable`,
`unbound-method`) carries `ignores: ['**/*.config.ts', 'packages/mochart-docs/**',
'packages/mochart-demo-common/scripts/**']` because those files "belong to no tsconfig". The
config's own header calls `no-floating-promises` "the highest-value rule in the config", and it is
disabled across the entire docs package — which contains the `checkExamples`/`checkApiCoverage`/
`checkSectionCoverage` async scripts that gate the docs build. A dropped `await` there fails open.

**Fix:** give `packages/mochart-docs` and `packages/mochart-demo-common/scripts` a tsconfig that
includes their scripts (widening `include` may be enough) so `projectService: true` can type them,
then remove them from the ignore list.

Fixed by cutting the type-aware block's `ignores` from three entries to one, so
`no-floating-promises` and the rest now cover all of `packages/mochart-docs`
(including the three docs-build gate scripts) and
`packages/mochart-demo-common/scripts`. The two genuinely unclaimed files under
`packages/mochart-docs/reference/` are handled with
`projectService: { allowDefaultProject: [...] }` rather than an ignore, so they
are still type-checked. `**/*.config.ts` stays ignored — those files are not in
any tsconfig's `include` — with a corrected comment saying so.

Proof the rules now bite: `eslint --stdin --stdin-filename <path>` with
`async function boom(): Promise<void> {} boom();` errors on all 8 probed paths
under the new config and exits 0 under the old one.

### TOOL-13 — minor manifest and config drift
**Low · Inconsistency** — **Fixed**

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

**Fixed, all four bullets.**

* **Tool-version drift.** `mochart-svelte`'s `svelte-check` `^4.1.4` → `^4.7.3` and `mochart-docs`'
  `vue` `^3.5.13` → `^3.5.40`, aligning each on what its sibling packages already declare and on the
  single copy actually installed (`svelte-check@4.7.3`, `vue@3.5.40`, no nested copies). `mochart-vue`'s
  `vue` **peer** range `^3.3.0` is deliberately wide and was left alone — that is a consumer range, not
  tool drift. `syncpack`/`overrides` was the finding's alternative and is not worth a new dependency for
  two ranges.
* **Missing `lint` script** added to `@mochart/editor`, the only workspace without one. `eslint` is a
  hoisted root devDependency, so nothing new was needed, and `npm run lint -w @mochart/editor` exits 0.
* **`eslint.config.mjs`** says 20 workspaces in both places (`packages/*` holds exactly 20).
* **The alias constants are collapsed.** `MARGIN_KEYS` and `PADDING_KEYS` are gone; the two use sites in
  `config/validation/validators.ts` take `TOP_RIGHT_BOTTOM_LEFT` directly, which reads correctly there —
  margin and padding share the same four keys, and that is the point. Preferred over the finding's other
  option of a `knip.json` ignore, which would have suppressed nothing: the `deadcode` gate runs
  `knip --include exports,types,files`, so the duplicate-export check that produced the hit is not
  enabled at all.

`package-lock.json` was refreshed with `npm install --package-lock-only` — **necessary**, not
bookkeeping: `npm ci` fails outright when a manifest range no longer matches the range recorded in the
lockfile, so widening the two ranges without it would have broken CI. The diff is exactly those two
range strings; no dependency resolved differently.

Repo-wide typecheck, lint and deadcode clean; core's suite passes.

### TOOL-14 — every docs-site sourcemap maps nothing but vitepress internals
**Medium · Bug · [.vitepress/config.ts:62](packages/mochart-docs/.vitepress/config.ts#L62)** **[verified]** — **Fixed**

The docs config asks for sourcemaps — `vite: { build: { sourcemap: true }, plugins: [depSourcemaps()] }`
— and the build honours the request in form only. Measured on an assembled `site/`:

- **123** of 123 JS chunks carry a `sourceMappingURL`, and **all 123** targets exist.
- **All 123** of those maps contain exactly one source:
  `node_modules/vitepress/dist/client/app/index.js`.

So no docs page, no `LiveChart` component, no `examples/*.ts`, and no mochart source is mapped.
Stepping into anything on the deployed docs site lands in compiled output, which is the state the
config was changed to prevent. The other five galleries map their sources correctly from the same
`depSourcemaps` plugin, so the plugin itself works — something in the VitePress build is discarding
or replacing the upstream maps.

Note VitePress bundles its own Vite 5 while the repo runs Vite 8
([TOOL-3](#tool-3--no-dependency-audit-anywhere-and-9-known-vulnerabilities-are-present) covers the
security side of that split, and `scripts/dep-sourcemaps.ts` is deliberately structurally typed
because of it). A plugin written against one major running inside the other is the first thing to
rule out.

**Fix:** determine whether `depSourcemaps` is reached at all under VitePress's Vite, and whether
VitePress's own client build strips maps. If the plugin is the problem, register it through
VitePress's own Vite instance rather than the repo's.

**Fixed in `scripts/dep-sourcemaps.ts` — and the finding's diagnosis was wrong.** The plugin *was*
reached under VitePress's Vite; it fired on all 12 dist bundles in both the client and SSR passes. The
real cause is rollup semantics: a map returned from `transform` is read as one link in the chain
mapping back to *the code the plugin received* — the dist file — rather than as that file's own
original map, so rollup resolves source index 0 to the dist bundle and drops the rest. Rolldown (Vite 8,
what the galleries use) tolerates it; rollup (Vite 5, what VitePress bundles) does not. Returning the map
from `load` makes it the module's `originalSourcemap`, which both majors handle.

Measured on two full docs builds, comparing every emitted `.js.map`: unique sources went from **125 to
386**. `packages/mochart/dist/mochart.js`, `mochart-export/dist/index.js` and `movalid/dist/validators.js`
are gone from the maps, replaced by **172 `packages/mochart/src/**.ts` files** plus 86 d3 sources riding
along in core's map. Spot-checked with `@jridgewell/trace-mapping`: in `assets/chunks/theme.*.js.map`,
generated 4:56115 resolves to `chart/ChartController.ts:20`, `export class ChartController {`, against
generated text `CO=class{constructor(e,t,r){…}`.

It also fixed a Vite 8 defect nobody had filed: the `transform` path copied each dep map's own relative
spellings verbatim, so shipped gallery maps say `../../../../../src/render/dom.ts`, which resolves to a
`packages/src/…` path that does not exist. `load` rebases them.

Cost, stated because it is a deployed artifact: sourcemap bytes go from 2.79 MB to 3.96 MB (+42%), since
`sourcesContent` now carries the TypeScript sources instead of one dist bundle. Shipped JS is unchanged
bar 360 bytes of minifier noise, and build time did not move.

Two adjacent gaps left alone: `packages/mochart/vite.config.ts` does not use this plugin, so movalid code
bundled into core still debugs as movalid's dist inside core's own map; and VitePress ships no maps for
its own client.

Corrections to the finding's numbers, for anyone rereading it: there were 69 `.js.map` files with 125
sources before, not "123 maps with exactly one source" — the VitePress theme, Vue runtime and six
demo-common sources were already mapped. What was unmapped was precisely the pre-built dist bundles, so
the consequence it describes was real even though the measurement was not.

### TOOL-15 — the Angular gallery bundles the library without mapping any of it
**Low · Bug · [mochart-demo-angular/vite.config.ts:10](packages/mochart-demo-angular/vite.config.ts#L10)** **[verified]** — **Fixed**

`build: { sourcemap: true }` and `depSourcemaps()` are set the same way as in the other galleries,
but the emitted maps cover only the demo's own files. Unique sources across each built gallery's
maps:

| Gallery | Unique sources | mochart core mapped |
|---|---|---|
| lit | 367 | ~202 files |
| react | 363 | ~200 files |
| vanilla | 345 | ~196 files |
| **angular** | **96** | **none** |

The core is in that bundle — the gallery renders charts — so debugging the library from the Angular
demo lands in compiled output. The symptom is confirmed; the cause is not. The candidates are
`@analogjs/vite-plugin-angular` not preserving upstream maps through its AOT transform, or
`depSourcemaps` not reaching core under that plugin. Note this config also aliases
`@mochart/angular` to source, so the binding *is* mapped while core is not, which points at how
core resolves rather than at the plugin ordering.

Low rather than Medium because the other five galleries map correctly, so the library can be
debugged from any of them; this costs a developer the Angular-specific path only.

**Fixed, and neither cause the finding proposes is the real one.** `depSourcemaps()` does reach core — a
probe in its `load` hook showed it returning maps for `packages/mochart/dist/mochart.js` and
`mochart-export/dist/index.js`. The maps are destroyed afterwards by a *different* plugin inside
`angular()`: `@analogjs/vite-plugin-angular-optimizer`, which is build-only and whose transform matches
every `/\.[cm]?js$/` module, returning `{ code, map: { mappings: '' } }` — an empty map — for anything that
is not an Angular `fesm20*` file. That also explains the clue the finding read as a resolution problem:
`@mochart/angular` survives because it is aliased to `.ts` and never matches the optimizer's `.js` filter.

Isolation runs on the Angular gallery, as unique mapped sources / core source files: baseline 98 / 0;
optimizer removed 463 / 172; optimizer's non-`fesm` branch short-circuited 442 / 172; re-attaching the map
after `transform` 98 / 0 — a dead link mid-chain cannot be revived, which is why the fix has to stop the
wipe rather than repair it.

`depSourcemaps` now records the ids whose maps it supplied and, in `configResolved`, wraps the optimizer's
transform handler so those specific modules pass through untouched. Blast radius is exactly the dist files
this plugin owns; everything else still goes through the optimizer. Where the plugin is absent — the five
other galleries, the benchmark, the editor playground, the vite-5 docs site — the lookup returns undefined
and the hook is a no-op, so no demo config needed editing.

This does reach into another plugin's internals, so I added the guard that was missing: if the optimizer is
present but no longer exposes `transform.handler`, it now warns rather than silently returning us to
dist-only maps.

Verified: Angular gallery unique mapped sources 98 → 431 and core source files 0 → 172, with emitted JS
byte-identical (`cmp`-equal chunks) and only the map growing, 479 KB → 2.36 MB; a sample entry resolves to
`chart/FocusController.ts` with its `sourcesContent`. The vanilla gallery is unchanged at 347 / 172 either
way, the vite-5 docs site builds, and the Angular dev server still starts (the optimizer is
`apply: 'build'`). `scripts` typecheck and repo lint clean.

Still unmapped in that gallery: third-party `.js` deps that ship no map to attach (Angular `fesm2022`,
rxjs, seedrandom, lodash.merge, fflate) lose even their identity mappings to the optimizer, which is why
431 rather than an optimizer-free 463. Changing that means skipping the optimizer for all non-Angular
files, which is upstream's call.

### TOOL-16 — `@mochart/svelte` is the one published package that ships no sourcemaps
**Low · Tooling gap · [mochart-svelte/package.json](packages/mochart-svelte/package.json)** **[verified]** — **Fixed**

`svelte-package -i src -o dist` emits no `.js.map`, and its CLI has no option to ask for one
(`-i`, `-o`, `-p`, `-t`, `-w`, `--tsconfig` — nothing for maps). So this is a tool limitation, not
a misconfiguration. Every sibling ships maps with full `sourcesContent`:

| Package | `.js.map` | sources |
|---|---|---|
| @mochart/core | 2 | 522 |
| @mochart/vue | 8 | 8 |
| @mochart/angular · @mochart/react | 7 each | 7 each |
| @mochart/lit | 5 | 5 |
| **@mochart/svelte** | **0** | — |

Narrower than it sounds. Only four files are generated — `index.js`, `host.js`, `types.js`,
`placeholders.svelte.js` — and the three `.svelte` components are copied through unchanged, so most
of the package already *is* its source. `files` ships `src`, and the `development` export condition
resolves to `./src/index.ts`, so a consumer who wants real sources has a supported route.

**Fix:** the honest options are to document the `development` condition as the way to debug this
package, or to post-process `svelte-package`'s output to attach maps, or to build the four
generated files with a tool that emits them. Given three of the seven output files need no mapping
at all, documenting is probably the right trade — but it should be a decision rather than an
omission.

Fixed by shipping declaration maps; `.js.map` deliberately declined, with the
reasoning below.

`dist` now carries 4 `.d.ts.map` files (was 0) for the real TypeScript surface —
`host`, `index`, `placeholders.svelte`, `types`. Their `sources` resolve on disk and
`npm pack --dry-run` confirms the maps and every referenced `src/*.ts` ship in the
tarball. Resolution was proven beyond path existence by decoding the VLQ mappings:
`types.d.ts:8` (`export interface ChartRef {`) maps to `src/types.ts:12`, the exact
declaration; `host.d.ts:2` → `src/host.ts:7`; `index.d.ts:1` → `src/index.ts:1`.

**The finding's "Fix:" paragraph omits the actual fix.** It lists document /
post-process / rebuild-with-another-tool and never mentions `declarationMap`.
`@sveltejs/package` forces only `sourceMap` off; declaration maps are supported and
none were emitted purely because `tsconfig.json` never asked. So this was half a
config omission, not wholly a tool limitation, and the table's `.js.map`-only framing
hid four maps that were available for free.

**The three `.svelte` declaration maps had to be dropped.** Turning on
`declarationMap` first emitted 7, but the component ones were unusable twice over.
Their `sources` read `../src/Chart.svelte.ts`, a file that does not exist —
svelte2tsx tries to strip that `.ts` but its guard joins a temp-dir-relative path
against `rootDir`, lands outside the package, and never fires. And fixing the path
would have made it worse: the mappings are in svelte2tsx's virtual TSX coordinate
space, so most segments point past EOF of the real component (`Chart.svelte.d.ts`
maps `declare const Chart` to line 33 of a 19-line file; 5 of `ChartHost.svelte`'s
11 mapped lines point at lines 72–74 of a 64-line file). So
`scripts/prune-component-maps.mjs` deletes any `.d.ts.map` whose `sources` do not
resolve and strips the dangling `sourceMappingURL`. The criterion is
unresolvable-sources rather than the filename, because a first pass on
`*.svelte.d.ts.map` wrongly ate `placeholders.svelte.d.ts.map` — that one is a
plain-TS runes module whose map is correct.

Verified by diffing the new `dist` against a build with the original command: the
only differences are the 4 added maps and their 4 comment lines; the 3 component
`.d.ts` files are byte-identical.

**`.js.map` declined, with the numbers.** Both barriers are real — `sourceMap: false`
is passed as `existingOptions` to `parseJsonConfigFileContent`, where TS's `extend`
lets the first argument win, and `transpile_ts` returns only `outputText`, discarding
`sourceMapText`. Producing maps means reimplementing that private transpile step.
What it buys: only 4 JS files exist, two with zero logic (`index.js` is 2 lines of
re-exports, `types.js` is `export {};`). The other two total 151 lines, and
`svelte-package` neither bundles nor minifies — diffing `src/host.ts` against
`dist/host.js` shows the delta is stripped type annotations and a 4-space reindent,
with identifiers and all comments intact. The three components, which are the actual
public API, are published as `.svelte` files with nothing to map. So the cost is a
build-time reimplementation of an undocumented third-party internal, coupling this
package's build to options any patch release could change; the gain is type
annotations and indentation on 151 lines of already-readable JS.

The `development` export condition is documented in the README as the supported
route for stepping through the real sources. No docs-site page was added: no
markdown under `packages/mochart-docs/` mentions sourcemaps, debugging or the
`development` condition for *any* binding — that story lives only in package
READMEs (currently vue and angular) — so the README is the right place.

Two further corrections: "the three `.svelte` components are copied through
unchanged" is not quite right — `vitePreprocess({ script: true })` strips the TS from
`<script lang="ts">` (`Chart.svelte` 697 B → 596 B), though the conclusion drawn from
it holds. And `scripts/dep-sourcemaps.ts` needs nothing: it only pairs `.js` with
`.map` and never looks at `.d.ts.map`. `scripts/ensure-libs-fresh.mjs` already stats
`tsconfig.build.json` behind an `existsSync` guard, so the new one is picked up
automatically.

Build, typecheck (163 files, 0 errors), lint and 17/17 tests all clean.



---

### TOOL-17 — the published `types` entry references `d3-shape` types a consumer cannot resolve
**Medium · Bug (packaging) · [dist/types/utils/shapeUtils.d.ts:2](packages/mochart/src/utils/shapeUtils.ts), [src/types/d3.d.ts](packages/mochart/src/types/d3.d.ts)** — **Fixed**

*Found while investigating [TOOL-5](#tool-5--the-d3-dependencies-are-declared-but-never-resolved-from-the-published-bundle), not by either review pass.*

`getSymbolGenerator`'s emitted declaration reads
`import("d3-shape").SymbolGenerator`, and it is reached through the *default* `types` condition — so it
is part of the published surface. `d3-shape@3.2.0` ships no `types` field and no `.d.ts`, and
`@types/d3-shape` is declared nowhere in the repo. Locally the reference is satisfied by the ambient
`src/types/d3.d.ts`, but `tsc` does not re-emit an ambient declaration source, so
`dist/types/types/d3.d.ts` does not exist in the built output.

Demonstrated against the built artifact:

```
$ npx tsc --noEmit --strict --moduleResolution bundler --module esnext \
    packages/mochart/dist/types/utils/shapeUtils.d.ts
dist/types/utils/shapeUtils.d.ts(2,86): error TS7016: Could not find a declaration file for
  module 'd3-shape'
```

So a TypeScript consumer importing anything that pulls in `shapeUtils` gets an implicit `any` under
`noImplicitAny`, or an error under `strict`. It predates TOOL-5 and is independent of it, but it must be
handled alongside it: moving `d3-*` out of `dependencies` would otherwise look like the cause.

**Fix:** give `getSymbolGenerator` a locally-declared return type so nothing in the emitted `.d.ts`
names `d3-shape` (smaller), or emit the ambient declarations into `dist/types` and point the `types`
export at a barrel that includes them.

**Fixed by declaring the type locally.** `getSymbolGenerator` now returns a small non-exported interface
rather than d3's, so nothing in the emitted declarations names `d3-shape`. It needs two members, not one:
`SeriesMarkers.ts:115` chains `symbolGenerator.size(...)()`, so a bare call signature fails to compile.

Verified against the built artifact rather than the source: `dist/types/utils/shapeUtils.d.ts` now contains
zero `d3-` references, as does `dist/types/` as a whole, and
`tsc --noEmit --strict --ignoreConfig --moduleResolution bundler --module esnext` over both that file and
the package entry `dist/types/index.d.ts` exits 0 — where before it reported
`TS7016: Could not find a declaration file for module 'd3-shape'`. (`--ignoreConfig` is needed or TS 6
refuses with `TS5112` because a tsconfig is present.)

Taken over emitting the ambient declarations into `dist/types`, which would have meant a barrel and a
changed `types` export target for one function's return value.

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
**Medium · Bug · [validators.ts:763](packages/movalid/src/validators.ts#L763) vs the `Validator` interface at [:33](packages/movalid/src/validators.ts#L33)** — **Fixed**

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

**Fixed by attaching the extensions, not by splitting the type.** `validators.conditional` now calls
`addExtensions(validatorFunction)` instead of `addExtensions(validatorFunction, true, false)`, so
`orEqual`, `orOneOf` and `or` exist at runtime exactly as the `Validator` interface declares.
`addExtensions`'s `messageExtensions`/`extensions` parameters are gone with their four recursive
call sites, because no path can now ask for a partial validator, and the stale source comment above
`interface Validator` documenting the gap is deleted. That also makes the README's "Every validator
can be extended" true, which it was not.

The finding's first option — a narrower `ConditionalValidator = Omit<Validator, 'orEqual' | 'orOneOf'
| 'or'>` — was prototyped and rejected because it is not a movalid-only change: it produces 10 errors
in `@mochart/core`, at `config/validation/seriesConfig.ts` lines 140-175 and
`config/validation/mochartConfig.ts:124,159`, where the category-axis and series validator maps stop
being assignable to `Record<string, Validator>`. Making the compiler reject `.orEqual` on a conditional
would mean widening core's validator map types too, which is a larger change than the finding
describes and not obviously the right shape.

Behaviour is additive: nothing in the repo called these methods on a conditional. An extended
conditional keeps `validatorName: 'conditional'`, gains the extension name, and appends the extension
text to the matched rule's message. Two tests in the existing `conditional validator` block cover all
three methods plus `withMessage(...).orEqual(...)` chaining and the composed message; both fail without
the fix with `c.orEqual is not a function`. movalid 385 tests, core 1612 tests, repo-wide typecheck,
lint and deadcode all pass.

### VAL-3 — the `numeric` family accepts single-element arrays
**Medium · Bug · [validators.ts:123](packages/movalid/src/validators.ts#L123)** **[verified]** — **Fixed**

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

**Fixed by gating on scalar type first.** `customTypeValidatorDefinitions.numeric` now tests
`typeValidators.number(v) || (typeValidators.string(v) && v.trim() !== '')` before
`Number.isFinite(Number(v))`, so the global `isFinite`'s coercion is gone and `[5]`, `[' 5 ']`, `{}` and
friends no longer validate. `numericMin`/`Max`/`MinMax` call `customTypeValidators.numeric` first, so
they inherit it with no edit of their own.

Two deliberate deviations from the finding's suggested one-liner, both worth recording:

* `typeValidators.number`/`.string` rather than bare `typeof`. That is the surrounding style — `integer`,
  `color`, `datePrimitive` and `dateAny` all gate through `typeValidators` — and bare `typeof` would have
  silently started rejecting boxed `new Number(5)`, which `typeValidators.number` still accepts. That
  would have created a fresh sibling disagreement of exactly the kind this finding is about.
* The `v.trim() !== ''` clause. The finding's literal form is a regression: `Number('')` and
  `Number('   ')` are both `0`, so `numeric('')` would have started passing where `parseFloat('')` had
  correctly rejected it. Without the clause the fix trades one coercion hole for another.

Seven tests: four single-element-array cases across `numeric`, `numericMin`, `numericMax` and
`numericMinMax`, plus object, empty-string and whitespace-string guards pinning the two deviations. The
array cases fail against the old implementation. movalid 392 tests, core 1614 tests, typecheck and lint
pass — nothing in the repo depended on `[5]` validating.

Note the finding's line reference is stale: `numeric` is at `validators.ts:119-122`; `:123` is `integer`.

### VAL-4 — `regexp()` is stateful when handed a global-flagged regex
**Medium · Bug · [validators.ts:259](packages/movalid/src/validators.ts#L259)** **[verified]** — **Fixed**

`(regex: RegExp) => v => regex.test(v)` closes over the caller's `RegExp`. With a `/g` (or `/y`)
flag, `test` advances `lastIndex`, so the same validator alternates results on identical input:

```
regexp(/a/g) repeated: true false true
```

Core's own two uses are flagless, so this is latent — but a public validator that returns a
different answer each call for identical input is essentially undebuggable from the outside.

**Fix:** reset `regex.lastIndex = 0` before each test, or clone without the stateful flags at
construction: `new RegExp(regex.source, regex.flags.replace(/[gy]/g, ''))`.

**Fixed by cloning the regex and resetting `lastIndex` per test.** `regexp()` now builds one clone —
`new RegExp(regex.source, regex.flags)` — and zeroes its `lastIndex` before each `.test`, so the
validator is stateless across calls and never writes to an object the caller owns.

The finding's two options are each half right, and taking either verbatim would have been wrong.
Resetting `lastIndex` on the caller's own regex fixes the alternating result but still mutates their
object, and silently rewrites a regex that arrived with a deliberate non-zero `lastIndex`. Cloning
*with the flags stripped*, as suggested, changes matching semantics for `/y`: sticky anchors the match
at `lastIndex`, so `regexp(/a/y)('ba')` must be `false`, and a flag-stripped clone returns `true`.
Keeping every flag on the clone preserves both `y`'s intent and the `/i` that core's
`numberFormatRegexp` relies on, while making `g` and `y` deterministic.

Five tests in the existing `regexp` block: repeated calls with a global and with a sticky regex, sticky
matching staying anchored, the caller's `lastIndex` left untouched, and a pre-set `lastIndex` ignored.
Four fail against the old one-liner; the sticky-anchoring one passes either way and exists to pin the
semantics against the flag-stripping alternative. movalid 397 tests, typecheck, lint and build clean;
core's typecheck is clean and its validation suites pass — its three `regexp` call sites use neither
`g` nor `y`, so the change is behaviour-neutral there.

### VAL-5 — `instanceOf`'s error message inlines the entire class source
**Medium · Bug · [validators.ts:211](packages/movalid/src/validators.ts#L211)** **[verified]** — **Fixed**

`message: (type) => "should be an instanceof " + type` string-coerces the constructor:

```
"should be an instanceof class MyThing{static{__name(this,\"MyThing\")}greet(){return\"hi\"}}"
"should be an instanceof function Date() { [native code] }"
```

The package's headline claim is "human-readable error messages"; here the whole (possibly minified)
class body ends up in a user-facing string.

**Fix:** `"should be an instanceof " + (type.name || 'the given class')`.

**Fixed exactly as recommended.** `instanceOf`'s message is now
`'should be an instanceof ' + (type.name || 'the given class')`, so a named class or built-in reads
`should be an instanceof Date` instead of the constructor's whole source text. A genuinely anonymous
class expression, whose `.name` is empty, falls back to `the given class` rather than producing a
dangling message.

Three tests cover a named class, a built-in constructor and the anonymous fallback; all three fail
against the old message. movalid 400 tests, typecheck and lint clean; core typecheck and its 1626 tests
pass.

Blast radius is zero beyond the message text: `instanceOf` has no call site outside movalid — core never
uses it — so no core validation output or golden snapshot is affected. Worth noting for anyone rereading
the finding: the `static{__name(this,"MyThing")}` form in its first example is esbuild-transformed
output, not raw source; the tests assert against the raw form.

### VAL-6 — `equal()` renders functions and symbols as "undefined"
**Low · Bug · [validators.ts:94](packages/movalid/src/validators.ts#L94)** — **Fixed**

`printAny` falls through to `JSON.stringify`, which returns `undefined` for functions and
drops symbols: `equal(fn).errorMessage` → `"should be equal to undefined"`. Misleading rather than
merely terse.

**Fix:** add a `typeof value === 'function' || typeof value === 'symbol'` branch returning
`String(value)` (or the function's `name`).

*(README gaps: see [DOC-10](#doc-10--the-movalid-readmes-validator-and-chain-lists-are-each-missing-one-member).)*

**Fixed with two branches in `printAny`, before the `JSON.stringify` fallback.** A function prints as
`function <name>` (or `an anonymous function`), and a symbol as `String(value)`, which is already the
readable `Symbol(desc)` form. Because `printArray` and `printObject` recurse through `printAny`,
function and symbol *members* of array and object arguments print too.

The fix reaches further than the finding's title suggests: `printAny` is shared by `equal`, `notEqual`,
`orEqual`'s "or be equal to" suffix, and `appendValue`, which builds the value suffix on every
`getErrorMessage(v)`. All four were printing `undefined`.

Deliberate deviation: the finding offered `String(value)` *or* the function's name, and functions take
the name. `String(fn)` inlines the whole function source — minified or esbuild-transformed in a built
consumer — which is exactly the defect
[VAL-5](#val-5--instanceofs-message-inlines-the-whole-class-source) just removed from `instanceOf`. The
wording and the `value.name ||` fallback mirror what landed there.

Four tests in the existing `equal` block: a named function, an anonymous one, a symbol, and an object
argument carrying both. All four fail without the branches, printing `undefined`. movalid 404 tests,
typecheck and lint clean; core typecheck clean and its 1628 tests pass, with no golden churn — core never
passes a function or symbol to a value-printing validator.

One adjacent hole found here and filed separately rather than folded in:
[VAL-7](#val-7--printany-throws-on-a-bigint-argument). Same fallthrough, worse failure mode.

The finding's line reference is off by a few: the fallthrough is inside `printAny` at
`validators.ts:79-93`; `:94` is `printArray`.

---

### VAL-7 — `printAny` throws on a `bigint` argument
**Low · Bug · [validators.ts:79-93](packages/movalid/src/validators.ts#L79)** — **Fixed**

*Found while implementing [VAL-6](#val-6--equals-error-message-prints-undefined-for-a-function-or-symbol-argument), not by either review pass.*

The same fallthrough VAL-6 fixed for functions and symbols reaches `JSON.stringify` for a `bigint`,
which **throws** `TypeError: Do not know how to serialize a BigInt` rather than misprinting. So
`validators.equal(1n).errorMessage` crashes while building the message, and the crash surfaces from
whichever validator was being described — `equal`, `notEqual`, `orEqual` or any
`getErrorMessage(value)` suffix, since all four share `printAny`.

Not reachable from mochart: no core config value is a bigint. It matters because movalid is a
general-purpose validation library, and a host validating bigint ids or amounts hits it on the error
path, which is the worst place to throw.

**Fix:** add a `typeof value === 'bigint'` branch returning `String(value) + 'n'` (the literal form, so
the message is unambiguous against a same-digit number) alongside the function and symbol branches.

**Fixed as recommended.** A `typeof value === 'bigint'` branch returns `String(value) + 'n'`, so
`validators.equal(1n).errorMessage` reads `should be equal to 1n` instead of throwing
`TypeError: Do not know how to serialize a BigInt`. The `n` suffix is deliberate: without it the message
for `1n` and for `1` would be identical, which is the kind of ambiguity that makes an error message
useless.

One test in the `equal` block. Confirmed to bite: removing the branch fails it with the original
TypeError, i.e. the crash is on the message path exactly as filed. movalid 405 tests, typecheck and lint
clean.

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
