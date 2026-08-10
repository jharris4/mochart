# Mochart repository findings — 2026-08-09

## Summary

The repository is in good shape overall, but this review identified eight
current issues: one high-priority, four medium-priority, and three
low-priority findings. Six directly affect `packages/mochart`.

No critical issues were found.

## Core runtime bugs

### High — Pointer payloads use the wrong coordinate frame and break when scaled

`ChartEventPayload.chartX` and `chartY` promise coordinates relative to the
chart container, but the implementation subtracts the plot rectangle's origin,
making them plot-relative. It then divides CSS-pixel coordinates from
`getBoundingClientRect()` by logical SVG dimensions. CSS scaling can therefore
produce incorrect percentages and nearest-category selection.

Evidence:

- [`packages/mochart/src/types/chart.ts`](packages/mochart/src/types/chart.ts#L5)
  defines `chartX` and `chartY` as chart-container-relative.
- [`packages/mochart/src/components/Chart.ts`](packages/mochart/src/components/Chart.ts#L363)
  calculates both coordinates from the series-background rectangle.
- [`packages/mochart/src/components/Chart.ts`](packages/mochart/src/components/Chart.ts#L775)
  uses those CSS-pixel values directly with logical plot extents.
- [`packages/mochart/src/components/SeriesBackground.ts`](packages/mochart/src/components/SeriesBackground.ts#L31)
  confirms that the referenced rectangle is the series/plot area.
- [`packages/mochart/test/components/ChartInteraction.test.ts`](packages/mochart/test/components/ChartInteraction.test.ts#L56)
  makes every bounding rectangle equal the full chart and explicitly assumes
  plot-relative coordinates, masking both problems.

Recommended fix: convert CSS coordinates into SVG user coordinates using the
rectangle's scale. Preserve plot-local coordinates for category/value
calculations, and add the plot offset when producing container-relative
`chartX` and `chartY`. Add tests with non-zero plot offsets and scaled bounding
rectangles.

### Medium — A callback-only title is inaccessible by keyboard

A title always receives a click handler, but without `title.link` it renders as
an SVG `<g>` with no `tabindex`, role, keyboard handler, or disabled semantics.
Consequently, an `onTitleClick` callback can be triggered with a pointer but
not with a keyboard.

Evidence:

- [`packages/mochart/src/components/Title.ts`](packages/mochart/src/components/Title.ts#L154)
  installs the click handler on the title root.
- [`packages/mochart/src/components/Title.ts`](packages/mochart/src/components/Title.ts#L158)
  uses an SVG anchor only when `title.link` exists; otherwise it uses `<g>`.
- [`packages/mochart-docs/guide/interaction.md`](packages/mochart-docs/guide/interaction.md#L92)
  presents `onTitleClick` as a public interaction callback without documenting
  this limitation.

Recommended fix: when `onTitleClick` is present without a link, expose button
semantics and handle Enter and Space. Add an accessibility and browser-level
regression test.

### Low — Valid large pie values collapse every slice

Both pie-normalization paths sum finite positive values directly. Two
`Number.MAX_VALUE` values overflow the total to `Infinity`, producing `[0, 0]`
fractions and zero-angle slices. This was reproduced through the built public
`computePieFractions` helper.

Evidence:

- [`packages/mochart/src/data/Pie.ts`](packages/mochart/src/data/Pie.ts#L64)
  performs the unsafe summation in the public helper.
- [`packages/mochart/src/data/PieData.ts`](packages/mochart/src/data/PieData.ts#L26)
  duplicates the same normalization for rendered slices and tooltips.
- [`packages/mochart/test/data/Pie.test.ts`](packages/mochart/test/data/Pie.test.ts#L15)
  covers negative and non-finite inputs but not overflow from individually
  valid finite inputs.

Recommended fix: normalize values by their maximum before calculating ratios,
and define what the returned `total` means when the mathematical sum exceeds
`Number.MAX_VALUE`.

## API and documentation inconsistencies

### Medium — `ChartFactoryContext` documents values the runtime does not provide

The public type says that `width` and `height` are the chart dimensions,
`mochartConfig` is null when validation fails, and `hasData` is false for an
empty dataset. At runtime:

- In-chart loading, error, and empty-state factories receive plot-area
  dimensions.
- The config-error factory receives the invalid, non-null config.
- `hasData` is primarily supplied to loading factories and is absent from
  other state factories.

Evidence:

- [`packages/mochart/src/types/chart.ts`](packages/mochart/src/types/chart.ts#L64)
  contains the public field descriptions.
- [`packages/mochart/src/components/Chart.ts`](packages/mochart/src/components/Chart.ts#L995)
  passes an invalid config to `configErrorFactory` and chart-level dimensions
  to early states.
- [`packages/mochart/src/components/Chart.ts`](packages/mochart/src/components/Chart.ts#L1234)
  passes plot dimensions to the no-series factory.
- [`packages/mochart/src/components/Chart.ts`](packages/mochart/src/components/Chart.ts#L1266)
  does the same for in-chart loading, error, and no-data content.
- [`packages/mochart-docs/guide/chart-states.md`](packages/mochart-docs/guide/chart-states.md#L70)
  repeats the ambiguous context contract.

Recommended fix: document these as state-dependent slot dimensions and
document which fields each factory receives. A clearer API would expose
unambiguous `chartWidth`, `chartHeight`, and `plotBounds` fields.

### Medium — Filtering every series does not activate the no-series state

The chart-states guide says that filtering every series through the legend
produces the no-series placeholder. Runtime displays that placeholder only
when `mochartConfig.series.length === 0`; filtering changes flags and derived
data but leaves the configured series intact.

Evidence:

- [`packages/mochart-docs/guide/chart-states.md`](packages/mochart-docs/guide/chart-states.md#L60)
  states that filtering all series enters the same state.
- [`packages/mochart/src/components/Chart.ts`](packages/mochart/src/components/Chart.ts#L1234)
  checks only the configured series count.

Recommended fix: either implement the documented all-filtered placeholder or
remove the claim. Add a regression test covering the all-filtered state.

### Low — Public advanced nullability remains inconsistent

`ManagedChartProps` allows null config and data during loading, but publicly
exported `ChartDataSourceInput` and `ChartProps` require both values. The
controller resolves this mismatch with unsafe casts before forwarding values
that may be null at runtime.

Evidence:

- [`packages/mochart/src/chart/ChartDataSource.ts`](packages/mochart/src/chart/ChartDataSource.ts#L8)
  declares the advanced public input as non-nullable.
- [`packages/mochart/src/components/Chart.ts`](packages/mochart/src/components/Chart.ts#L43)
  declares the renderer props as non-nullable.
- [`packages/mochart/src/chart/ChartController.ts`](packages/mochart/src/chart/ChartController.ts#L110)
  documents and performs the casts.
- [`packages/mochart-docs/reference/api.md`](packages/mochart-docs/reference/api.md#L220)
  advertises these types as advanced extension contracts.

The historical review document is also internally inconsistent: it reports
zero open findings while recording this issue as an open follow-up.

- [`REVIEW-FINDINGS.md`](REVIEW-FINDINGS.md#L14)
- [`REVIEW-FINDINGS.md`](REVIEW-FINDINGS.md#L216)

Recommended fix: widen and narrow the internal types at actual control-flow
boundaries, or stop presenting the affected input as a supported public
extension contract. Update the historical review summary either way.

### Low — Contributor command documentation omits CI-critical scripts

The root script list omits `lint`, `deadcode`, `test:e2e`, `build:libs`, and
`build:pages`. The "CI guardrails, in one place" table also omits lint,
dead-code analysis, typechecking, and coverage thresholds even though CI runs
them.

Evidence:

- [`README.md`](README.md#L64) contains the incomplete root script list.
- [`CONTRIBUTING.md`](CONTRIBUTING.md#L140) contains the incomplete guardrails
  table.
- [`.github/workflows/ci.yml`](.github/workflows/ci.yml#L29) shows the actual
  CI checks.

Recommended fix: document the complete pre-push/CI command set in one copyable
block and make the guardrails table match the workflow.

## Missing test coverage and features

### Medium — Claimed browser support is only tested in Chromium

The core package claims support for Chrome/Edge, Firefox, and Safari, but the
Playwright configuration defines only a Chromium project and CI installs only
Chromium. This leaves SVG measurement, keyboard/focus behavior, and image
export unverified in Firefox and WebKit.

Evidence:

- [`packages/mochart/README.md`](packages/mochart/README.md#L252) states the
  browser-support policy.
- [`packages/mochart-demo-basic/playwright.config.ts`](packages/mochart-demo-basic/playwright.config.ts#L13)
  defines only Desktop Chrome.
- [`.github/workflows/ci.yml`](.github/workflows/ci.yml#L33) installs only
  Chromium.

Recommended addition: Firefox and WebKit smoke tests, with representative
interaction, accessibility, SVG export, and PNG export cases.

## Verification performed

The following existing checks passed after sandbox-blocked server processes
were rerun with local-server access:

- Core test suite: 1,348 tests.
- Playwright E2E suite: 75 Chromium tests.
- Documentation validation: 37 examples and all public exports/chart props
  covered.
- Repository typecheck.
- ESLint.
- Dead-code analysis.
- Library build and package dry run.
- `git diff --check`.

The findings above came from source inspection and focused edge-case probes;
none were exposed by a failing repository check.
