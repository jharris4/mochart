# Config Reference

Looking for something other than config? The functions and classes are in the
[API reference](/reference/api); the props each chart accepts are in
[Chart props](/reference/props) and
[Callbacks and payloads](/reference/callbacks); and what the framework
bindings call those props is in
[Framework props](/reference/framework-props).

A mochart config is a plain object made of per-concern sections. Every
section — and almost every property inside one — is optional and falls back to a
sensible default, so a minimal config only names the data properties to plot
(see [Getting started](/guide/getting-started)).

This reference is generated from the library source: the same descriptions,
validators, and defaults that power [config validation](/guide/config-model#validation)
produce these pages, so they cannot drift from the code.

The list sections (`seriesConfigs`, `seriesAxisConfigs`, gradients, groups,
stacks) take an array of config objects and have a companion `*AllConfig`
section for values shared by every entry — see
[The config model](/guide/config-model) for how sharing and defaulting work.

<script setup>
import { data } from './sections.data.ts'
</script>

<table>
  <thead>
    <tr><th>Property</th><th>Description</th><th>Default</th></tr>
  </thead>
  <tbody>
    <tr v-for="entry in data.topLevel" :key="entry.key">
      <td>
        <template v-if="entry.sectionId">
          <a :href="entry.sectionId">
            <code>{{ entry.key }}</code>
          </a>
          <template v-if="entry.allKey">
            <br />
            <code>{{ entry.allKey }}</code>
          </template>
        </template>
        <template v-else>
          <code>{{ entry.key }}</code>
        </template>
      </td>
      <td>
        {{ entry.description }}
        <template v-if="entry.allDescription">
          <br />{{ entry.allDescription }}
        </template>
      </td>
      <td>
        <code v-if="entry.defaultText">{{ entry.defaultText }}</code>
      </td>
    </tr>
  </tbody>
</table>
