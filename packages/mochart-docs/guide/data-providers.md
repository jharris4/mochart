# Data providers

Charts read data through a small **data provider** interface, so datasets can
stay in whatever shape the host application already has. Two shapes are
supported out of the box:

```js
import { ArrayOfObjectsDataProvider, ObjectOfArraysDataProvider } from '@mochart/core';

// one object per category
new ArrayOfObjectsDataProvider(
  [{ month: 'Jan', revenue: 10 }, { month: 'Feb', revenue: 20 }]
);

// one array per property
new ObjectOfArraysDataProvider(
  { month: ['Jan', 'Feb'], revenue: [10, 20] }
);
```

Neither takes anything but the dataset: which property holds the category
values is the config's knowledge
([`categoryAxis.property`](/reference/categoryAxis#categoryAxis.property)),
and the provider is never told. `createDefaultChart` wraps its `data` array in
an `ArrayOfObjectsDataProvider` automatically. The lower-level `createChart`
accepts any object implementing the `DataProvider` interface, so a custom
provider can read straight from an existing store without copying — see
[when the data changes](#when-the-data-changes) for how to tell the chart
the store moved.

## The provider interface

A provider is a read-only **column lookup** over one dataset. One member is
required, three are optional:

```ts
/** number | string | Date | null | undefined */
type DataValue = number | string | Date | null | undefined;

interface DataProvider {
  // required
  getPropertyValues(property: string): readonly DataValue[] | undefined;
  // optional
  getError?(): unknown;
  getLoading?(): boolean;
  refresh?(): void;
}
```

`getPropertyValues(property)` returns **all values of one named data
property**, index-aligned with every other property's values, or `undefined`
when the property isn't in the data at all. That one accessor serves every
column the config names — the category property, `displayProperty`, and all
the series properties alike — so a provider does not need to know which
config property asked. Return the stored column either way; `getDataErrors`
checks each column against its own rule.

The rules the chart holds the columns to:

- **The config's category column defines the category count.** Every other
  requested column must have the same length; a mismatch is a hard data
  error naming both counts.
- **Cells hold `DataValue`s.** Series columns must be numeric, with `null`
  and `undefined` both reading as a missing value (`null` is how JSON writes
  a hole in a column, and the chart normalizes it to `undefined` internally).
  Category and display columns hold strings, numbers, or `Date`s matching
  `categoryAxis.type`.
- **A whole-column `undefined` means "not in the data".** That is distinct
  from a column of missing values, and `getDataErrors` reports which problem
  you have.

The chart treats returned arrays as read-only snapshots: it copies what it
needs during each recompute and never mutates or holds onto the array.

The optional three are independent — implement only the ones you want:

- `getError()` returning anything but `null`/`undefined` puts the chart in its
  error state — `''` and `0` count as errors.
- `getLoading()` returning `true` puts the chart in its loading state.
- `refresh()` is called by the chart handle's
  [`refresh()`](#when-the-data-changes) before it re-reads.

A provider missing `getPropertyValues` is treated as invalid:
`isDataProviderValid` returns false, `getDataErrors` reports
`data provider must implement: getPropertyValues`, and the chart renders no
data rather than failing mid-read.

A complete custom provider over a column store is one method:

```ts
const provider = {
  getPropertyValues: (property) => store.columns[property]
};
```

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
  providers. The built-in providers are stateless, so for them the re-read
  alone picks up any in-place change, including added, removed, and
  replaced rows. A custom provider that caches anything off its store
  should implement `refresh()` to invalidate that cache; a provider that
  reads straight through needs nothing.

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

All of them, category and display properties included, arrive through the
single [`getPropertyValues`](#the-provider-interface) accessor.

Series values must be numeric or missing (`null`/`undefined`) — how missing
values render is controlled per series with
[`missingValues`](/reference/series#series.missingValues). Pair it with
[`missingValueMarkers`](/reference/series#series.missingValueMarkers) to
keep a marker at the missing values — most useful with
`missingValues: 'base'`, which gives the marker a position.

## Validating data against a config

`getDataErrors` checks a dataset against an enhanced config and returns
readable messages:

- a missing category column — data with nothing under
  `categoryAxis.property` — is one loud error naming the property, since
  nothing else is checkable without it
- a *series* property absent from the data is reported as
  `no values found for property: …` — distinct from a column of legitimate
  missing values, which is valid
- a column whose length doesn't match the category column's is reported
  with both counts
- non-numeric series values, category values that don't match the
  configured type, and duplicate category values each get their own message

On a linear category scale, out-of-order category values are flagged too
when a `line` or `area` series would zigzag through them; monotonic data in
either direction passes, order-independent charts (bars, scatter) are not
checked, and [`displayProperty`](/reference/categoryAxis#categoryAxis.displayProperty)
configs are exempt since their display values may legitimately fold back
across a DST-style repeated hour.

```js
import { enhanceConfig, getDataErrors, ArrayOfObjectsDataProvider } from '@mochart/core';

const errors = getDataErrors(enhanceConfig(config), new ArrayOfObjectsDataProvider(data));
// e.g. ["series values must be numeric or missing for property: revenue"]
```

Who runs this check depends on the entry point. Default charts
(`createDefaultChart`, the bindings' `DefaultChart`) validate for you:
they re-run `getDataErrors` whenever the config or data changes and show
the error state when it fails. Managed charts (`createChart`, the
bindings' `Chart`) trust the enhanced config and provider they are given
— validation is the host's job there, so run `getDataErrors` whenever
your config or data changes if the inputs aren't guaranteed valid.

This is the same check the docs run over every example on this site in CI.
