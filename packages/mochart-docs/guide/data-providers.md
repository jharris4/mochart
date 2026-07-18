# Data providers

Charts read data through a small **data provider** interface, so datasets can
stay in whatever shape the host application already has. Two shapes are
supported out of the box:

```js
import { ArrayOfObjectsDataProvider, ObjectOfArraysDataProvider } from '@mochart/core';

// one object per group
new ArrayOfObjectsDataProvider(
  [{ month: 'Jan', revenue: 10 }, { month: 'Feb', revenue: 20 }],
  'month' // the group property
);

// one array per property
new ObjectOfArraysDataProvider(
  { month: ['Jan', 'Feb'], revenue: [10, 20] },
  'month'
);
```

`createDefaultChart` wraps its `data` array in an
`ArrayOfObjectsDataProvider` automatically, using
[`groupAxisConfig.property`](/reference/groupAxisConfig#groupAxisConfig.property)
as the group property. The lower-level `createChart` accepts any object
implementing the `DataProvider` interface, so a custom provider can read
straight from an existing store without copying.

## Which properties are read

The config decides which properties the chart pulls from the provider:

- the group value from `groupAxisConfig.property` (and optionally
  [`displayProperty`](/reference/groupAxisConfig#groupAxisConfig.displayProperty)
  for friendlier labels)
- each series' value from its
  [`property`](/reference/seriesConfigs#seriesConfigs.property), plus the
  optional [`rangeProperty`](/reference/seriesConfigs#seriesConfigs.rangeProperty),
  `markerProperty`, `colorProperty`, and `labelProperty`

Series values must be numeric or `undefined` — how missing values render is
controlled per series with
[`skipMissing`](/reference/seriesConfigs#seriesConfigs.skipMissing) and
[`showMissingAtBase`](/reference/seriesConfigs#seriesConfigs.showMissingAtBase).

## Validating data against a config

`getDataErrors` checks a dataset against an enhanced config — missing
properties, non-numeric series values, duplicate group values — and returns
readable messages:

```js
import { enhanceConfig, getDataErrors, ArrayOfObjectsDataProvider } from '@mochart/core';

const errors = getDataErrors(enhanceConfig(config), new ArrayOfObjectsDataProvider(data, 'month'));
// e.g. ["series values must be numeric or undefined for property: revenue"]
```

This is the same check the docs run over every example on this site in CI.
