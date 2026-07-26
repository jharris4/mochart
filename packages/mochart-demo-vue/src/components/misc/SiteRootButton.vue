<script setup lang="ts">
import { demoText } from '@mochart/demo-common';

import Icon from './Icon.vue';

// Link back to the docs site root (a real anchor so middle-click works).
// Renders nothing when no site root is configured (standalone dev/build).
interface Props {
  siteRootUrl?: string;
}

const props = withDefaults(defineProps<Props>(), {
  siteRootUrl: void 0
});
</script>

<template>
  <a v-if="props.siteRootUrl !== void 0" class="demo-btn demo-btn-secondary mochart-demo-site-root-button"
     :href="props.siteRootUrl" :title="demoText.siteRootLink.tooltip" :aria-label="demoText.siteRootLink.aria">
    <Icon name="house" /> {{ demoText.siteRootLink.shortLabel }}
  </a>
</template>
