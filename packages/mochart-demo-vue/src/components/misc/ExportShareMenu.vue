<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { buildShareUrl, demoText } from '@mochart/demo-common';
import type { ShareState } from '@mochart/demo-common';

import Icon from './Icon.vue';

// A collapsed export/share menu placed at the end of each mode's controls row.
// The trigger uses a share icon; the menu holds PNG / SVG downloads and (when a
// share state is provided) a copy-share-link item. The parent supplies the
// export actions so this component stays agnostic about single vs. tiled charts.
//
// The controls strips (and chart panes) use `overflow: hidden`, which would
// clip a normal absolutely-positioned dropdown that opens upward over the
// chart — and the chart's transparent interaction rect would steal clicks. So
// the menu is positioned `fixed` (measured from the trigger) at a high z-index,
// which escapes ancestor clipping and stacks above the chart.
interface Props {
  idPrefix: string;
  exportPng: () => void;
  exportSvg: () => void;
  /** Omit to hide the Share item (e.g. a chart whose state isn't shareable). */
  getShareState?: () => ShareState;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  getShareState: void 0,
  disabled: false
});

const copiedFeedbackMs = 1500;
const menuGap = 4;

const open = ref(false);
const copied = ref(false);
const coords = ref<{ bottom: number; right: number } | null>(null);
const rootElement = ref<HTMLDivElement | null>(null);
const triggerElement = ref<HTMLButtonElement | null>(null);
let revertTimer: ReturnType<typeof setTimeout> | null = null;

// Only reveal the menu once it's positioned, to avoid a flash at the origin.
const menuOpen = computed(() => open.value && coords.value !== null);

function onDocMouseDown(event: MouseEvent) {
  if (rootElement.value && !rootElement.value.contains(event.target as Node)) {
    open.value = false;
  }
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    open.value = false;
  }
}

// A fixed menu would drift on scroll/resize; just close it instead.
function onReflow() {
  open.value = false;
}

function removeListeners() {
  document.removeEventListener('mousedown', onDocMouseDown);
  document.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('scroll', onReflow, true);
  window.removeEventListener('resize', onReflow);
}

// Anchor the fixed menu just above the trigger's top-right corner, so it opens
// upward and right-aligned. Measured (before it's shown) to avoid a flash.
function toggle() {
  if (open.value) {
    open.value = false;
    return;
  }
  const rect = triggerElement.value?.getBoundingClientRect();
  if (rect) {
    coords.value = {
      bottom: window.innerHeight - rect.top + menuGap,
      right: window.innerWidth - rect.right
    };
  }
  open.value = true;
}

// Attach the outside-close listeners while the menu is open.
watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
  }
  else {
    coords.value = null;
    removeListeners();
  }
});

onBeforeUnmount(() => {
  if (revertTimer !== null) {
    clearTimeout(revertTimer);
  }
  removeListeners();
});

function runAndClose(action: () => void) {
  action();
  open.value = false;
}

function onShare() {
  if (!props.getShareState) {
    return;
  }
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
  open.value = false;
}
</script>

<template>
  <div ref="rootElement" class="btn-group dropup mochart-export-share-menu">
    <button :id="props.idPrefix + '-export-share'" ref="triggerElement" type="button"
            :class="'btn btn-secondary dropdown-toggle' + (open ? ' active' : '')"
            :disabled="props.disabled" aria-haspopup="true" :aria-expanded="open"
            :title="demoText.exportShareMenu.trigger.tooltip" :aria-label="demoText.exportShareMenu.trigger.aria"
            @click="toggle">
      <Icon size="lg" :fixed-width="true" name="share-nodes" />
    </button>
    <div :class="'dropdown-menu' + (menuOpen ? ' show' : '')"
         :style="menuOpen && coords ? { position: 'fixed', bottom: coords.bottom + 'px', right: coords.right + 'px', margin: '0', zIndex: 1080 } : void 0">
      <button type="button" class="dropdown-item" :aria-label="demoText.exportButtons.png.aria" @click="runAndClose(props.exportPng)">
        <Icon :fixed-width="true" name="file-image" /> <span class="mochart-menu-item-label">{{ demoText.exportButtons.png.label }}</span>
      </button>
      <button type="button" class="dropdown-item" :aria-label="demoText.exportButtons.svg.aria" @click="runAndClose(props.exportSvg)">
        <Icon :fixed-width="true" name="file-code" /> <span class="mochart-menu-item-label">{{ demoText.exportButtons.svg.label }}</span>
      </button>
      <template v-if="props.getShareState">
        <div class="dropdown-divider"></div>
        <button type="button" class="dropdown-item" :aria-label="demoText.shareButton.aria" @click="onShare">
          <Icon :fixed-width="true" :name="copied ? 'check' : 'link'" /> <span class="mochart-menu-item-label">{{ copied ? demoText.shareButton.tooltipCopied : demoText.shareButton.label }}</span>
        </button>
      </template>
    </div>
  </div>
</template>
