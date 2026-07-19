---
layout: home

hero:
  name: mochart
  text: Animated interactive SVG charts
  tagline: Zero framework dependencies, staged animations, and bindings for Angular, Lit, React, Svelte, and Vue.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Config reference
      link: /reference/
    - theme: alt
      text: GitHub
      link: https://github.com/jharris4/mochart

features:
  - title: Staged animation
    details: Updates play as axis expansion → value change → axis contraction, so only one kind of change is in motion at a time — and stacked series animate as a single gapless unit.
    link: /guide/staged-animation
    linkText: How it works
  - title: No framework required
    details: Charts are drawn with a retained-mode SVG renderer — no vdom, no framework runtime. First-class bindings wrap the same core for Angular, Lit, React, Svelte, and Vue.
    link: /guide/getting-started
    linkText: Get started
  - title: Validated configuration
    details: Plain-object configs where everything is optional and defaulted, validated with human-readable error messages. The config reference is generated from the validators themselves.
    link: /reference/
    linkText: Browse the reference
---

<script setup>
import * as hero from './examples/hero'
</script>

## See it move

Every chart on this site is live. This one stacks three series into one bar
per month — **hover a legend item** to focus its series, **click one** to
filter it out of the chart (click again to bring it back), and animate to a
new dataset to watch the stack move as a single gapless unit:

<LiveChart :config="hero.config" :data="hero.data" :alt-data="hero.altData" />

```js
import { createDefaultChart } from '@mochart/core';

const chart = createDefaultChart(container, { config, data, width, height });
chart.update({ data: nextData }); // animates to the new data
```

Head to [Getting started](/guide/getting-started) for the full example, and
use **Open in demo** under any chart on this site to keep editing it in the
gallery.

## Bring your framework

The same core, wrapped idiomatically — each binding adds automatic container
sizing and passes every chart prop through:
[Angular](/guide/frameworks/angular) · [Lit](/guide/frameworks/lit) ·
[React](/guide/frameworks/react) · [Svelte](/guide/frameworks/svelte) ·
[Vue](/guide/frameworks/vue)

## Explore the demo galleries

Every binding has a full demo app — [Vanilla TypeScript](/vanilla/),
[Angular](/angular/), [Lit](/lit/), [React](/react/), [Svelte](/svelte/),
and [Vue](/vue/) — where you can browse dozens of demo charts, edit their
configs and data as JSON, share a link to your edited chart, and export
charts as SVG/PNG.
