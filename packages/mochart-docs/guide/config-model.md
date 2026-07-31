# The config model

A mochart config is a plain, JSON-serializable object made of per-concern
**sections**. Every section — and almost every property inside one — is optional and
falls back to a sensible default, so configs only say what differs from the
defaults.

```js
const config = {
  version: '1.0.0',
  titleConfig: { … },        // chart title
  groupAxisConfig: { … },    // the category axis (requires `property`)
  seriesConfigs: [ … ],      // one entry per series (each requires `property`)
  seriesAllConfig: { … },    // values shared by every series
  seriesAxisConfigs: [ … ],  // one or more value axes
  legendConfig: { … },
  tooltipConfig: { … },
  crosshairConfig: { … },
  animationConfig: { … },
  // …
};
```

The [config reference](/reference/) lists every section and is generated from
the library's own validators, defaults, and descriptions — it can't drift
from the code.

## Object sections and list sections

Sections come in two shapes:

- **Object sections** configure a single thing: `titleConfig`,
  `groupAxisConfig`, `legendConfig`, `tooltipConfig`, `crosshairConfig`,
  `animationConfig`, `chartConfig`, `plotConfig`, `colorPaletteConfig`.
- **List sections** configure a collection and take an array of config
  objects: `seriesConfigs`, `seriesAxisConfigs`, `seriesGroupConfigs`,
  `seriesStackConfigs`, `linearGradientConfigs`, `radialGradientConfigs`.
  Passing a single object instead of an array is allowed and treated as a
  one-entry list.

## Shared `*All` sections

Every list section has a companion `*AllConfig` section — `seriesAllConfig`,
`seriesAxisAllConfig`, and so on — whose values apply to **every** entry of
the list. A value set on an individual entry wins over the shared one:

```js
seriesAllConfig: { renderer: 'bar', strokeWidth: 2 },
seriesConfigs: [
  { property: 'revenue' },                      // bar, strokeWidth 2
  { property: 'target', renderer: 'line' }      // line, strokeWidth 2
]
```

## Cross-references and id defaulting

Entries in list sections are wired together by id: a series names its value
axis via [`axis`](/reference/seriesConfigs#seriesConfigs.axis), its stack via
[`stack`](/reference/seriesConfigs#seriesConfigs.stack), and its group via
[`group`](/reference/seriesConfigs#seriesConfigs.group), each matching an
`id` in the corresponding section.

When exactly one target exists, the reference defaults to it — with a single
`seriesAxisConfigs` entry (or none at all) you never need to mention axis
ids, and with a single `seriesStackConfigs` entry every series joins that
stack automatically (see the [stacked bars recipe](/recipes/stacked-bars)).
Validation reports references that don't resolve.

## Validation

Configs are validated with [@mochart/movalid](https://github.com/jharris4/mochart/tree/main/packages/movalid),
producing human-readable messages rather than schema jargon:

```js
import { validateConfig, getDefaults } from '@mochart/core';

const { valid, errors, warnings } = validateConfig(config, getDefaults(config));
// e.g. "seriesConfigs[1] - had 1 invalid properties: valueFormt"
```

Editor and tooling integrations can request structured locations while
retaining the same validation result:

```js
import { validateConfigDetailed, getDefaults } from '@mochart/core';

const { diagnostics } = validateConfigDetailed(config, getDefaults(config));
// [{
//   path: ['seriesConfigs', 1, 'axis'],
//   severity: 'error',
//   message: 'should equal the id property of one of the seriesAxisConfigs: "missing"',
//   source: 'mochart'
// }]
```

`path` contains object keys and array indexes leading to the relevant config
value. Top-level problems that cannot be assigned to one property use an
empty path.

Two things validation insists on:

- **`version`** must equal the current config format version (`'1.0.0'`).
  Configs written against an older format can be upgraded with
  `migrateConfig(config)`.
- **Unknown properties** produce warnings, and a config with warnings is
  rejected in strict mode — typos surface immediately instead of being
  silently ignored.

When a chart receives an invalid config it renders its
[config error state](/guide/chart-states) instead of a broken chart.

## Enhancement

`createDefaultChart` validates and defaults the raw config for you on every
update. The lower-level `createChart` expects that work done up front via
`enhanceConfig`:

```js
import { enhanceConfig } from '@mochart/core';

const mochartConfig = enhanceConfig(config);
// validated, defaults applied, *All sections merged, references resolved
```

`enhanceConfig` returns a `MochartConfig` — the fully-built form with every
default applied and cross-references resolved — which is what the renderer
consumes. Data can then be checked against it with
`getDataErrors(mochartConfig, dataProvider)` (see
[Data providers](/guide/data-providers)).
