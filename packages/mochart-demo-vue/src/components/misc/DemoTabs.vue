<script setup lang="ts">
import { ref } from 'vue';

import { demoTabId, demoTabPanelId, demoTabPendingId, demoText, nextDemoTabIndex } from '@mochart/demo-common';
import type { DemoTab } from '@mochart/demo-common';

// The Chart / Config / Data strip in the top bar, as an ARIA tablist.
//
// One place per port builds this, because the `tab` role is a package deal: the
// roles and `aria-selected` are only half of it, the other half is the keyboard
// contract (Left/Right wrap, Home/End, and a roving tabindex so the strip is one
// stop rather than three). The keys themselves come from `nextDemoTabIndex` in
// @mochart/demo-common, shared with the other five ports.
//
// Selection is automatic: arrowing to a tab shows its pane, which is what a
// click already did and costs nothing here — every pane stays mounted.
interface Props {
  tabs: readonly DemoTab[];
  activeKey: number;
  onSelect: (key: number) => void;
}

const props = defineProps<Props>();

const list = ref<HTMLUListElement | null>(null);

function onKeyDown(event: KeyboardEvent): void {
  const activeIndex = props.tabs.findIndex(tab => tab.key === props.activeKey);
  const nextIndex = nextDemoTabIndex(event.key, activeIndex < 0 ? 0 : activeIndex, props.tabs.length);
  if (nextIndex === null) {
    return;
  }
  // Home/End would scroll the pane, and the arrows are ours once focus is on a
  // tab — the tabs are the only focusable things in the strip.
  event.preventDefault();
  props.onSelect(props.tabs[nextIndex].key);
  // Every tab is already rendered, so this lands before the update that moves
  // the roving tabindex onto it.
  list.value?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
}

function isPending(tab: DemoTab): boolean {
  return tab.pending === true && tab.key !== props.activeKey;
}
</script>

<template>
  <ul ref="list" class="demo-tabs" role="tablist" :aria-label="demoText.tabs.listAria" @keydown="onKeyDown">
    <!-- `presentation`, not `listitem`: a tablist's children are its tabs, and
         the `<li>`s are only here because the strip is styled as a list. -->
    <li v-for="tab in props.tabs" :key="tab.key" class="demo-tab-item" role="presentation">
      <button type="button" role="tab" :id="demoTabId(tab.name)"
              :class="'demo-tab' + (tab.key === props.activeKey ? ' active' : '')"
              :aria-selected="tab.key === props.activeKey" :aria-controls="demoTabPanelId(tab.name)"
              :tabindex="tab.key === props.activeKey ? 0 : -1"
              :title="isPending(tab) ? demoText.tabs.chartPendingTitle : undefined"
              :aria-describedby="isPending(tab) ? demoTabPendingId : undefined"
              @click="props.onSelect(tab.key)">
        {{ tab.label }}<span v-if="isPending(tab)" class="mochart-pending-badge" aria-hidden="true"></span>
      </button>
      <!-- The badge is a decorative dot, so the tab points `aria-describedby`
           here while it shows. Hidden, and read anyway: a referenced element's
           text is exposed whether or not the element itself is. -->
      <span v-if="tab.name === 'chart'" :id="demoTabPendingId" hidden>{{ demoText.tabs.chartPendingTitle }}</span>
    </li>
  </ul>
</template>
