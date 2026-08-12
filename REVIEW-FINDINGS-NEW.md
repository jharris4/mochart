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

**162 findings: 1 critical, 33 high, 72 medium, 56 low.** (145 from the Opus pass,
5 from the SOL pass, 12 found while implementing.)

**Status: 107 fixed, 56 open** (33 medium, 21 low, and 2 high that are waiting on an answer).
Three of the open findings are blocked on a decision rather than on work — TOOL-2, VAL-1 and
COMP-8 — and each has its question written up in `REVIEW-QUESTIONS.md`. TOOL-2 is deferred to
release time by decision rather than waiting on an answer. Nothing is partially fixed. ANIM-1's
and ANIM-2's follow-ups are both **implemented** — see their entries for what landed and where the
build revised each design.

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
**Medium · Inconsistency · [types/data.ts:183](packages/mochart/src/types/data.ts#L183)** — **Open**

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
**Low · Inconsistency · [vanilla ChartsControls.ts:120](packages/mochart-demo-vanilla/src/components/multi/ChartsControls.ts#L120)** — **Open**

`demo-form-row` (54 sites), `mochart-menu-item-label` (24), `button-with-tooltip` (6),
`demo-menu-up` (6), `mochart-demo-notes-item` (6) and `mochart-demo-notes-trigger` (6) appear in the
six demos' markup but in no `.css` file in the repo and are queried in no JS. `demo.css:783` shows
the form-row layout actually hangs off `form .demo-field`. Bootstrap-era leftovers that read as
styling hooks — the next person restyling a control strip will target `.demo-form-row` and see
nothing happen.

**Fix:** delete them from the markup, or add the rules they imply.

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

### TEST-16 — the golden "randomize" transform rewrites row geometry as if it were data
**Low · Test gap · [golden.test.ts:176](packages/mochart/test/golden/golden.test.ts#L176)**

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
**Low · Bug · [mochart-demo-angular/vite.config.ts:10](packages/mochart-demo-angular/vite.config.ts#L10)** **[verified]** — **Open**

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

### TOOL-16 — `@mochart/svelte` is the one published package that ships no sourcemaps
**Low · Tooling gap · [mochart-svelte/package.json](packages/mochart-svelte/package.json)** **[verified]** — **Open**

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
