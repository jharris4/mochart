# Data providers

Charts read data through a small **data provider** interface, so datasets can
stay in whatever shape the host application already has. Two shapes are
supported out of the box:

```js
import { ArrayOfObjectsDataProvider, ObjectOfArraysDataProvider } from '@mochart/core';

// one object per category
new ArrayOfObjectsDataProvider(
  [{ month: 'Jan', revenue: 10 }, { month: 'Feb', revenue: 20 }],
  'month' // the category property
);

// one array per property
new ObjectOfArraysDataProvider(
  { month: ['Jan', 'Feb'], revenue: [10, 20] },
  'month'
);
```

`createDefaultChart` wraps its `data` array in an
`ArrayOfObjectsDataProvider` automatically, using
[`categoryAxis.property`](/reference/categoryAxis#categoryAxis.property)
as the category property. The lower-level `createChart` accepts any object
implementing the `DataProvider` interface, so a custom provider can read
straight from an existing store without copying — see
[when the data changes](#when-the-data-changes) for how to tell the chart
the store moved.

Both built-ins guard the most common wiring mistake: a category property
that matches nothing — absent from every row, or a missing or
all-`undefined` category column — is reported through the provider's
`getError()`, and the chart renders that message as its error state
instead of silently indexing every row under the same key.

## The provider interface

A provider is a read-only lookup over one dataset. Two members are required,
four are optional:

```ts
interface DataProvider<TCategoryValue> {
  // required
  getCategoryValues(): readonly TCategoryValue[];
  getSeriesValue(categoryValue: TCategoryValue, categoryIndex: number, property: string): unknown;
  // optional
  getCategoryProperty?(): string;
  getError?(): unknown;
  getLoading?(): boolean;
  refresh?(): void;
}
```

- `getCategoryValues()` returns every category value at once, in display
  order. The chart's category count comes from this array's length, and every
  other read is indexed against it.
- `getSeriesValue(categoryValue, categoryIndex, property)` returns one
  property's value for one category. Both coordinates are passed because the
  two dataset shapes key differently: `ArrayOfObjectsDataProvider` looks the
  row up by category value and ignores the index,
  `ObjectOfArraysDataProvider` indexes the column and ignores the value. Use
  whichever your store is keyed on.

`getSeriesValue` is the interface's *only* property accessor, so it serves two
kinds of value and returns `unknown`:

| Called for | Must return |
| --- | --- |
| any series value property — see [which properties are read](#which-properties-are-read) | a number, or `undefined` for a missing value |
| `categoryAxis.displayProperty` | a string, number, or `Date` matching `categoryAxis.type`, like a raw category value |

Returning the stored cell satisfies both: a provider does not need to know
which config property asked. `getDataErrors` checks each group against its own
rule, so a number returned for a display property is reported as
`display category values must all match the specified type for property: …`,
not as a series-value problem.

The optional four are independent — implement only the ones you want:

- `getCategoryProperty()` reports which property the category values come
  from, and `getDataErrors` then flags a mismatch with
  [`categoryAxis.property`](/reference/categoryAxis#categoryAxis.property).
  Both built-ins implement it.
- `getError()` returning anything but `null`/`undefined` puts the chart in its
  error state — `''` and `0` count as errors.
- `getLoading()` returning `true` puts the chart in its loading state.
- `refresh()` is called by the chart handle's
  [`refresh()`](#when-the-data-changes) before it re-reads.

A provider missing one of the two required members is treated as invalid:
`isDataProviderValid` returns false, `getDataErrors` reports
`data provider must implement: …`, and the chart renders no data rather than
failing mid-read.

## When the data changes

The chart pulls values through the provider when it (re)computes its chart
data — not on every frame. Recomputation is triggered by prop identity:
`update` only sees a config, `data`, or `dataProvider` change when a **new
object reference** is passed. Mutating the store a custom provider reads
from — or mutating a `data` array in place — changes what the provider
*would* return, but nothing tells the chart to ask again.

Two ways to tell it:

- **Pass a new identity.** A new `data` array (default charts) or a new
  provider instance (`createChart`) — the natural fit for immutable stores.
  The change animates as a normal data update.
- **Call `refresh()`.** Re-reads the current inputs without a new
  reference: a default chart rebuilds its provider over the `data` array,
  and a `createChart` chart first calls the provider's optional `refresh()`
  hook and then re-reads it — the escape hatch made for live, store-backed
  providers. The built-in providers implement the hook by re-indexing
  their dataset, so `refresh` picks up any in-place change, including
  added, removed, and replaced rows. A custom provider that caches
  anything off its store should implement `refresh()` to invalidate that
  cache; a provider that reads straight through needs nothing.

Both paths animate to the new values. See
[Updating and destroying](/guide/getting-started#updating-and-destroying)
for the full `ChartHandle` semantics.

## Which properties are read

The config decides which properties the chart pulls from the provider:

- the category value from [`categoryAxis.property`](/reference/categoryAxis#categoryAxis.property) (and optionally
  [`displayProperty`](/reference/categoryAxis#categoryAxis.displayProperty)
  for friendlier labels)
- each series' value from its
  [`property`](/reference/series#series.property), plus the
  optional [`rangeProperty`](/reference/series#series.rangeProperty),
  [`markerProperty`](/reference/series#series.markerProperty), [`colorProperty`](/reference/series#series.colorProperty), [`labelProperty`](/reference/series#series.labelProperty),
  [`tooltipProperty`](/reference/series#series.tooltipProperty),
  [`errorLowProperty`](/reference/series#series.errorLowProperty), and
  [`errorHighProperty`](/reference/series#series.errorHighProperty).

All of them, display property included, arrive through the single
[`getSeriesValue`](#the-provider-interface) accessor.

Series values must be numeric or `undefined` — how missing values render is
controlled per series with
[`missingValues`](/reference/series#series.missingValues). Pair it with
[`missingValueMarkers`](/reference/series#series.missingValueMarkers) to
keep a marker at the missing values — most useful with
`missingValues: 'base'`, which gives the marker a position.

## Validating data against a config

`getDataErrors` checks a dataset against an enhanced config — non-numeric
series values, category values that don't match the configured type,
duplicate category values — and returns readable messages. A provider that
exposes its category property (`getCategoryProperty` — both built-ins do)
also gets its keying checked against `categoryAxis.property`. On a linear
category scale, out-of-order category values are flagged too when a `line`
or `area` series would zigzag through them; monotonic data in either
direction passes, order-independent charts (bars, scatter) are not checked,
and [`displayProperty`](/reference/categoryAxis#categoryAxis.displayProperty)
configs are exempt since their display values may legitimately fold back
across a DST-style repeated hour. Note that a *series*
property absent from every row is not an error: it reads as all-`undefined`,
which is valid missing-value data. A *category* property that matches
nothing is caught earlier — the built-in providers report it through
`getError()`, and `getDataErrors` defers to a provider-reported error
rather than repeating it.

```js
import { enhanceConfig, getDataErrors, ArrayOfObjectsDataProvider } from '@mochart/core';

const errors = getDataErrors(enhanceConfig(config), new ArrayOfObjectsDataProvider(data, 'month'));
// e.g. ["series values must be numeric or undefined for property: revenue"]
```

Who runs this check depends on the entry point. Default charts
(`createDefaultChart`, the bindings' `DefaultChart`) validate for you:
they re-run `getDataErrors` whenever the config or data changes and show
the error state when it fails. Managed charts (`createChart`, the
bindings' `Chart`) trust the enhanced config and provider they are given
— validation is the host's job there, so run `getDataErrors` whenever
your config or data changes if the inputs aren't guaranteed valid.

This is the same check the docs run over every example on this site in CI.
