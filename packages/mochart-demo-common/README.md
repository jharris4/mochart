# @mochart/demo-common

Shared framework-agnostic logic for the mochart demo galleries (private, not
published).

Every demo app — [@mochart/demo-vanilla](../mochart-demo-vanilla/README.md),
[@mochart/demo-angular](../mochart-demo-angular/README.md),
[@mochart/demo-lit](../mochart-demo-lit/README.md),
[@mochart/demo-react](../mochart-demo-react/README.md),
[@mochart/demo-svelte](../mochart-demo-svelte/README.md), and
[@mochart/demo-vue](../mochart-demo-vue/README.md) — implements the same
gallery in a different UI framework. This package holds the logic they all
share, so each demo package contains only its framework-specific wiring. The
JSON demo configs and datasets live separately in
[@mochart/demo-data](../mochart-demo-data/README.md).

Like `@mochart/demo-data`, this is a source-only TypeScript package: its
`exports` point straight at `src/index.ts` and the consuming demo's bundler
compiles it (no build step).

## Contents

| Module | What it provides |
| --- | --- |
| `mochartDemoConfig.ts` | `buildMochartDemoConfig` — builds the derived config bundle (built mochart config, defaults, with/without-defaults views, validation) the editors work with. |
| `configEditing.ts` | Single-demo Config tab helpers: format/parse config JSON, with/without-defaults views, and the Invert / Slow section toggles. |
| `dataEditing.ts` | Single-demo Data tab helpers: format/parse data JSON, filtered-view round-tripping, and apply-time validation. |
| `unusedDataProperties.ts` | The Data tab's "Unused" filter: collect the data properties a chart config actually reads, filter rows to them, and restore hidden properties after edits. |
| `randomGenerator.ts` | Seeded random chart data generator (`generateChartDataProvider`) behind the random demo mode. |
| `randomConfig.ts` | Validation and formatting for the random generator's config editor. |
| `transition.ts` | Transition demo: default config, data providers, and the transition-config editor's format/apply helpers. |
| `multiCharts.ts` | Multi demo: rotating per-chart data providers. |
| `rotationConfigs.ts` | Rotation demo: the generated grid of tick-label rotation configs and its dataset. |
| `types.ts` | Shared demo types (`MochartDemoConfig`, `DemoMode`, `FocusData`, …); also re-exports the `@mochart/demo-data` types. |

Everything is exported from the package root:

```ts
import { buildMochartDemoConfig, removeUnusedDataProperties } from '@mochart/demo-common';
```
