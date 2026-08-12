<script lang="ts">
  import { demoTabId, demoTabPanelId, demoTabPendingId, demoText, nextDemoTabIndex } from '@mochart/demo-common';
  import type { DemoTab } from '@mochart/demo-common';

  // The Chart / Config / Data strip in the top bar, as an ARIA tablist.
  //
  // One place per port builds this, because the `tab` role is a package deal:
  // the roles and `aria-selected` are only half of it, the other half is the
  // keyboard contract (Left/Right wrap, Home/End, and a roving tabindex so the
  // strip is one stop rather than three). The keys themselves come from
  // `nextDemoTabIndex` in @mochart/demo-common, shared with the other five ports.
  //
  // Selection is automatic: arrowing to a tab shows its pane, which is what a
  // click already did and costs nothing here — every pane stays mounted.
  interface Props {
    tabs: readonly DemoTab[];
    activeKey: number;
    onSelect: (key: number) => void;
  }

  let { tabs, activeKey, onSelect }: Props = $props();

  let list = $state<HTMLUListElement | null>(null);

  function onKeyDown(event: KeyboardEvent) {
    const activeIndex = tabs.findIndex(tab => tab.key === activeKey);
    const nextIndex = nextDemoTabIndex(event.key, activeIndex < 0 ? 0 : activeIndex, tabs.length);
    if (nextIndex === null) {
      return;
    }
    // Home/End would scroll the pane, and the arrows are ours once focus is on a
    // tab — the tabs are the only focusable things in the strip.
    event.preventDefault();
    onSelect(tabs[nextIndex].key);
    // Every tab is already rendered, so this lands before the update that moves
    // the roving tabindex onto it.
    list?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  }
</script>

<ul bind:this={list} class="demo-tabs" role="tablist" aria-label={demoText.tabs.listAria}
    onkeydown={onKeyDown}>
  {#each tabs as tab (tab.key)}
    {@const selected = tab.key === activeKey}
    {@const pending = tab.pending === true && !selected}
    <!-- `presentation`, not `listitem`: a tablist's children are its tabs, and
         the `<li>`s are only here because the strip is styled as a list. -->
    <li class="demo-tab-item" role="presentation">
      <button type="button" id={demoTabId(tab.name)} role="tab"
              class={"demo-tab" + (selected ? " active" : "")}
              aria-selected={selected} aria-controls={demoTabPanelId(tab.name)}
              tabindex={selected ? 0 : -1}
              title={pending ? demoText.tabs.chartPendingTitle : undefined}
              aria-describedby={pending ? demoTabPendingId : undefined}
              onclick={() => onSelect(tab.key)}>
        {tab.label}{#if pending}<span class="mochart-pending-badge" aria-hidden="true"></span>{/if}
      </button>
      <!-- The badge is a decorative dot, so the tab points `aria-describedby`
           here while it shows. Hidden, and read anyway: a referenced element's
           text is exposed whether or not the element itself is. -->
      {#if tab.name === 'chart'}
        <span id={demoTabPendingId} hidden>{demoText.tabs.chartPendingTitle}</span>
      {/if}
    </li>
  {/each}
</ul>
