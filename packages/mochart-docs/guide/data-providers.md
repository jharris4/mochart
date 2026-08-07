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
also gets its keying checked against `categoryAxis.property`. Note that a
property absent from every row is not an error: it reads as all-`undefined`,
which is valid missing-value data.

```js
import { enhanceConfig, getDataErrors, ArrayOfObjectsDataProvider } from '@mochart/core';

const errors = getDataErrors(enhanceConfig(config), new ArrayOfObjectsDataProvider(data, 'month'));
// e.g. ["series values must be numeric or undefined for property: revenue"]
```

This is the same check the docs run over every example on this site in CI.
