# Repo review findings

Review of the `mochart` monorepo at `c9b1857` (branch `review`), covering bugs,
test coverage gaps, and documentation.

Baseline: `npm test` (1197 core tests + all workspaces), `npm run typecheck`,
`npm run lint`, and `npm run deadcode` all pass. Core statement coverage is 96%
(branch 88%). Findings below came from reading and probing, not from failing
checks.

Items marked **Fixed** are committed on this branch, one commit each.

---

## Bugs

### B1. Stitched multi-chart exports produce invalid XML — **Fixed**

**High.** `packages/mochart-export/src/index.ts` — `getStitchedSvgText`

The outer `<svg>` was built with `createElementNS(SVG_NS, 'svg')` *and* given an
explicit `setAttribute('xmlns', SVG_NS)`. `createElementNS` already puts the
element in the SVG namespace, so `XMLSerializer` emitted the declaration twice:

```
<svg xmlns="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" width="800" …>
```

Parsing that fails with `duplicate attribute: xmlns`. Consequences:

- `exportChartsPNG` always rejects — the data-URI `<img>` never loads, so the
  `onerror` path throws "failed to rasterize the chart svg". Multi-chart PNG
  export never worked.
- `exportChartsSVG` writes a file that strict SVG consumers reject.
- `getStitchedChartsSvgText` returns unparseable markup.

The single-chart path is unaffected — it clones the live svg and never sets
`xmlns` itself.

Fixed by dropping the redundant `setAttribute`, with a regression test asserting
the markup parses and carries exactly one namespace declaration per svg.

### B2. `binValues` crashes or exhausts memory on out-of-contract options — **Fixed**

**High.** `packages/mochart/src/data/Histogram.ts` — `getBinLayout`

`binCount` was used directly as an array length and as a max index, with no
check that it was a whole finite number:

| input | before |
| --- | --- |
| `{ binCount: 2.5, nice: false }` | `TypeError: Cannot read properties of undefined (reading 'start')` |
| `{ binCount: NaN, nice: false }` | same `TypeError` |
| `{ binCount: Infinity, nice: false }` | infinite loop → heap exhaustion |
| `{ binWidth: NaN }` | `NaN` propagates into every bin edge |

Fixed by rounding a finite `binCount` down to at least 1, falling back to the
Sturges default when it is non-finite, and treating a non-finite `binWidth` as
unset (a non-positive `binWidth` was already ignored). Tests cover each case.

### B3. A tiny `binWidth` still allocates without bound

**Medium.** `packages/mochart/src/data/Histogram.ts` — `getBinLayout`

Distinct from B2 and still open: a *valid* finite positive `binWidth` can
request an arbitrary number of bins. `binValues([1…10], { binWidth: 1e-7 })`
asks for 90 million bin objects and exhausts the heap before returning.

Needs a decision: cap the bin count (and at what value — throw, or clamp and
widen the bins?). `binValues` already throws on an inverted domain, so throwing
past a cap would be consistent.

### B4. State-component factories receive an internal provider wrapper

**Medium.** `packages/mochart/src/createChart.ts` — `withFreshIdentity`

`createChart` wraps the host's `dataProvider` in a delegating copy so the
pipeline re-reads a provider it has already seen. That wrapper — not the host's
object — is what reaches the `getLoadingComponent` / `getErrorComponent` /
`getNoDataComponent` … context. Verified against a chart mounted with an
`ArrayOfObjectsDataProvider`:

```
identity === host: false | instanceof ArrayOfObjectsDataProvider: false | has refresh(): false
```

So a host factory cannot `instanceof`-check its own provider, read custom
members, or call `refresh()`. `withFreshIdentity` forwards `getCategoryProperty`,
`getError`, and `getLoading` but not `refresh` (harmless today — the handle's
`refresh()` calls the host provider directly — but it means the wrapper does not
satisfy the `DataProvider` contract it is typed as).

`createDefaultChart` is unaffected; it builds and passes a real provider.

Needs a decision: pass the host provider into the factory context, or complete
the wrapper (forward `refresh`) and document that the context provider is a
delegate.

### B5. Series labels apply the tooltip prefix/suffix only in `auto` mode

**Medium.** `packages/mochart/src/utils/ValueFormat.ts` — `getSeriesLabelFormat`

When `labelFormat` is `'auto'` the function delegates to `getSeriesFormat`,
which appends `valuePrefix`/`valueSuffix`. When `labelFormat` is an explicit d3
specifier it does not. So `valuePrefix: '$'` yields `$9` on the label with
`labelFormat: 'auto'` and `9.0` with `labelFormat: '.1f'`.

The config docs describe both as tooltip-only ("the text to prefix series values
with when showing them **in the tooltip**"), which the `auto` branch contradicts.

Needs a decision: apply prefix/suffix to labels in both branches, or neither.

### B6. `exportPNG` can hang instead of rejecting

**Low.** `packages/mochart-export/src/index.ts` — `rasterizeSvgText`

`ctx.drawImage` / `canvas.toBlob` run inside the `img.onload` handler. If either
throws synchronously — a tainted canvas raises `SecurityError` when the chart
embeds a cross-origin `<image>` — the exception escapes the handler and the
promise never settles, so `await exportPNG(...)` hangs. A `try`/`catch` around
the handler body that calls `reject` would settle it.

### B7. Stitched grid reserves empty columns

**Low.** `packages/mochart-export/src/index.ts` — `getStitchedSvgText`

`totalWidth` is always `cols * cellWidth + (cols - 1) * gap`, so exporting 2
charts with `{ cols: 4 }` yields an image half of which is blank. Clamping the
column count to the chart count would trim it.

---

## Test coverage gaps

### T1. The export stitching API had no tests — **Fixed**

**High.** `exportChartsSVG`, `exportChartsPNG`, and `getStitchedChartsSvgText`
are documented in the package README and the export guide, and none of the three
had a single test — which is why B1 shipped. Added 11 cases covering grid sizing,
cell centering, row wrapping and gaps, background handling, elements without a
chart, filename derivation, the `false`/`null` no-chart returns, keyboard-semantics
stripping, and the B1 regression.

### T2. `binValues` invalid-input paths — **Fixed**

Added with B2: fractional, non-finite, and non-positive `binCount`, and
non-finite `binWidth`.

### T3. Renderer and component function coverage

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

### T4. `ElList.destroy(true)` is never exercised

**Low.** `packages/mochart/src/render/list.ts:93-101` — the DOM-removing branch
of the keyed list's teardown is uncovered, while `RendererList.destroy` is.

### T5. No coverage thresholds

**Low.** `packages/mochart/vitest.config.ts` configures a coverage reporter but
no `thresholds`, and CI runs `npm test` rather than `test:coverage`, so coverage
can regress without failing anything. Needs a decision on the floor values.

---

## Documentation

### D1. Docs site footer claimed the wrong licence — **Fixed**

**High.** `packages/mochart-docs/.vitepress/config.ts` read "Released under the
BSD-3-Clause License." on every page of the deployed site. The project relicensed
to MIT in `c9b1857`; the root `LICENSE`, every `package.json`, and every per-package
`LICENSE` say MIT. This was the only surviving BSD reference in the repo.

### D2. The documented build target does not match what ships

**Medium.** `packages/mochart/README.md:255` and
`packages/mochart-docs/guide/getting-started.md:131` both state the published
builds target **ES2020**. `packages/mochart/vite.config.ts` sets no
`build.target`, so Vite 8's default (`baseline-widely-available`) applies, and
the shipped `dist/mochart.js` contains ES2021 logical assignment:

```
$ grep -oE '\?\?=|\|\|=|&&=' dist/mochart.js | sort | uniq -c
   2 &&=
   7 ||=
   5 ??=
```

(`tsconfig.json` targets ES2020, but esbuild, not tsc, emits the bundle.)

Needs a decision: pin `build.target: 'es2020'` so the promise is enforced, or
restate the docs to match the actual baseline.

### D3. Truncated sentence in the core README — **Fixed**

**Low.** The `onSeriesClick` bullet ended mid-clause: "…— the cartesian
`onSliceClick`". Completed to "the cartesian counterpart of `onSliceClick`".

### D4. `@mochart/movalid` has no `homepage`

**Low.** Every other publishable package sets `"homepage": "https://mochart.org"`;
movalid does not, so npm shows no project link for it. Left alone because
movalid is a standalone validator with no page on that site — the right URL is a
judgement call.

### D5. No `repository.directory` on any publishable package

**Low.** All nine publishable packages point `repository.url` at the monorepo
root without `"directory": "packages/<name>"`, so npm's "Repository" link and
provenance land on the repo root rather than the package. Standard for npm
workspaces; adding it is mechanical but touches every published manifest.

### D6. `@mochart/angular` exports no prop types

**Low.** `mochart-react`, `-vue`, `-lit`, and `-svelte` all export
`ChartProps` / `DefaultChartProps` / `BaseChartProps` / `ChartCallbackProps`
(plus `ChartRef` where applicable). `packages/mochart-angular/src/index.ts`
exports only `PlaceholderProps` and `PlaceholderComponent` — its inputs live on
the component classes instead. Defensible given Angular's decorator inputs, but
it leaves TypeScript hosts of that one binding without a named prop surface, and
neither its README nor the framework-props page calls the difference out.

---

## Checked and clean

Recorded so the next review does not redo the work:

- **Doc/code drift guards are strong.** `checkApiCoverage`, `checkSectionCoverage`,
  and `checkExamples` run under `npm test`; `apiReference.test.ts`,
  `docs.test.ts`, and `jsdocSync.test.ts` pin the generated config reference,
  the per-section description modules, and the JSDoc on `src/types/config.ts`.
  Every public export of core, export, and editor is checked for a docs mention.
- **Markdown links.** All 65 tracked `.md` files' relative links resolve. All
  absolute docs routes resolve to a page or the generated `reference/[section]`
  route; the `/vanilla/demos`-style links resolve only on the assembled site, as
  documented. VitePress dead-link detection is on (no `ignoreDeadLinks`).
- **Licence metadata.** All 20 packages declare MIT; all nine publishable ones
  ship an MIT `LICENSE` file.
- **Every publishable package has a test script.** Only private demo packages
  lack tests.
- **The recipes sidebar matches the 21 recipe pages.**
