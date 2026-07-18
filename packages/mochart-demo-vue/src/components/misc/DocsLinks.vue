<script setup lang="ts">
import { computed } from 'vue';

import { demoText, getReferenceSectionIds, getReferenceSectionUrl } from '@mochart/demo-common';

// Links into the documentation site's config reference for the sections the
// edited config actually uses (see demo-common docsLinks).
interface Props {
  config: Record<string, unknown> | null | undefined;
}

const props = defineProps<Props>();

const sectionIds = computed(() => getReferenceSectionIds(props.config));
</script>

<template>
  <div v-if="sectionIds.length > 0" class="mochart-demo-docs-links">
    <span>{{ demoText.docsLinks.label }}&nbsp;</span>
    <template v-for="(sectionId, index) in sectionIds" :key="sectionId">
      <span v-if="index > 0"> · </span>
      <a :href="getReferenceSectionUrl(sectionId)" :title="demoText.docsLinks.tooltipPrefix + sectionId">{{ sectionId }}</a>
    </template>
  </div>
</template>
