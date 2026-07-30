<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';

import { demoText, getNotesPanelPosition } from '@mochart/demo-common';

import Icon from './Icon.vue';

// The "about this demo" button in each mode's navigation row: an info icon that
// opens the demo's `notes` (the detail kept out of its one-sentence gallery
// description) in a popover panel.
//
// Positioning follows ExportShareMenu: the surrounding panes use
// `overflow: hidden`, which would clip a normally-positioned dropdown, so the
// panel is `fixed` at coordinates measured from the trigger. This one opens
// downward from the navigation row (the export menu opens upward from the
// controls row) and is closed on scroll/resize rather than repositioned.
interface Props {
  /** Demo title, shown as the panel heading. */
  title: string;
  /** The demo's notes; nothing renders when there are none. */
  notes?: string;
}

const props = withDefaults(defineProps<Props>(), { notes: undefined });

const open = ref(false);
const coords = ref<{ top: number; left: number } | null>(null);
const rootElement = ref<HTMLDivElement | null>(null);
const triggerElement = ref<HTMLButtonElement | null>(null);

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

// A fixed panel would drift on scroll/resize; just close it instead.
function onReflow() {
  open.value = false;
}

function removeListeners() {
  document.removeEventListener('mousedown', onDocMouseDown);
  document.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('scroll', onReflow, true);
  window.removeEventListener('resize', onReflow);
}

// Positioned before the panel is shown, so it never flashes at the wrong spot.
function toggle() {
  if (open.value) {
    open.value = false;
    return;
  }
  const rect = triggerElement.value?.getBoundingClientRect();
  if (rect) {
    coords.value = getNotesPanelPosition(rect, window.innerWidth);
  }
  open.value = true;
}

// Attach the outside-close listeners while the panel is open.
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

// Close whenever the demo changes under us (history navigation between demos).
watch(() => [props.title, props.notes], () => {
  open.value = false;
});

onBeforeUnmount(removeListeners);
</script>

<template>
  <div v-if="props.notes !== undefined" ref="rootElement" class="demo-btn-group mochart-demo-notes-menu">
    <button ref="triggerElement" type="button"
            :class="'demo-btn demo-btn-secondary mochart-demo-notes-trigger' + (open ? ' active' : '')"
            aria-haspopup="true" :aria-expanded="open"
            :title="demoText.demoNotes.trigger.tooltip" :aria-label="demoText.demoNotes.trigger.aria"
            @click="toggle">
      <Icon size="lg" :fixed-width="true" name="circle-info" />
    </button>
    <div :class="'demo-menu demo-menu-notes' + (open ? ' open' : '')"
         :style="open && coords ? { position: 'fixed', top: coords.top + 'px', left: coords.left + 'px', margin: '0', zIndex: 1080 } : undefined">
      <span class="demo-menu-notes-title">{{ props.title }}</span>
      <span class="demo-menu-notes-body">{{ props.notes }}</span>
    </div>
  </div>
</template>
