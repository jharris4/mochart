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
straight from an existing store without copying.

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
[`missingValues`](/reference/series#series.missingValues).

## Validating data against a config

`getDataErrors` checks a dataset against an enhanced config — missing
properties, non-numeric series values, duplicate category values — and returns
readable messages:

```js
import { enhanceConfig, getDataErrors, ArrayOfObjectsDataProvider } from '@mochart/core';

const errors = getDataErrors(enhanceConfig(config), new ArrayOfObjectsDataProvider(data, 'month'));
// e.g. ["series values must be numeric or undefined for property: revenue"]
```

This is the same check the docs run over every example on this site in CI.
