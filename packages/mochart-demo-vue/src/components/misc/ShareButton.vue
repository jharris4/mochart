<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';

import { buildShareUrl, demoText } from '@mochart/demo-common';
import type { ShareState } from '@mochart/demo-common';

import ButtonWithTooltip from './ButtonWithTooltip.vue';
import Icon from './Icon.vue';

// Copies a share link for the current chart: the single-demo URL plus the
// current config and data encoded in the hash (see demo-common shareState).
interface Props {
  idPrefix: string;
  getShareState: () => ShareState;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
});

const copiedFeedbackMs = 1500;

const copied = ref(false);
let revertTimer: ReturnType<typeof setTimeout> | null = null;

onBeforeUnmount(() => {
  if (revertTimer !== null) {
    clearTimeout(revertTimer);
  }
});

function onClick() {
  const url = buildShareUrl(props.getShareState());
  navigator.clipboard.writeText(url).then(() => {
    copied.value = true;
    if (revertTimer !== null) {
      clearTimeout(revertTimer);
    }
    revertTimer = setTimeout(() => { copied.value = false; revertTimer = null; }, copiedFeedbackMs);
  }, () => {
    // Clipboard access can be unavailable (e.g. insecure context); let the
    // user copy the link manually instead of failing silently.
    window.prompt(demoText.shareButton.tooltip, url);
  });
}
</script>

<template>
  <div class="btn-group">
    <ButtonWithTooltip :id="props.idPrefix + '-share'" :disabled="props.disabled" :label="demoText.shareButton.label"
                       :tooltip-text="copied ? demoText.shareButton.tooltipCopied : demoText.shareButton.tooltip" tooltip-placement="top-start"
                       :on-click="onClick" :aria-label="demoText.shareButton.aria">
      <Icon size="lg" :fixed-width="true" :name="copied ? 'check' : 'link'" />
    </ButtonWithTooltip>
  </div>
</template>
