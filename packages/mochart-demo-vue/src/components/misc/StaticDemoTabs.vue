<script setup lang="ts">
// The tab strip for a view with only one pane (Multi).
//
// Not a one-tab tablist: there is nothing to switch to, and a tab that cannot be
// activated is exactly the dead button this replaces. It renders as the caption
// it always was — same markup, same styling, no roles claiming otherwise.
interface Props {
  label: string;
}

const props = defineProps<Props>();
</script>

<template>
  <ul class="demo-tabs">
    <li class="demo-tab-item"><span class="demo-tab active">{{ props.label }}</span></li>
  </ul>
</template>
