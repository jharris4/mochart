<script lang="ts">
  // The Single/Multi/Random mode switcher shown in the demo view navigation
  // strip. Transition/rotation are standalone gallery pages, not modes, so
  // they don't appear here.
  import { demoText, getAvailableDemoModes } from '@mochart/demo-common';
  import type { SwitchableDemoMode } from '@mochart/demo-common';

  import Icon from './Icon.svelte';
  import { createPhoneViewport } from './phoneViewport.svelte';

  interface Props {
    demoMode: SwitchableDemoMode;
    onModeChanged: (nextDemoMode: SwitchableDemoMode) => void;
  }

  let { demoMode, onModeChanged }: Props = $props();

  const phone = createPhoneViewport();

  const modes = $derived(getAvailableDemoModes(phone.isPhone));

  const modeIcons: Record<SwitchableDemoMode, string> = {
    single: 'pen-to-square',
    multi: 'window-restore',
    random: 'shuffle'
  };
</script>

<!-- How the current mode is marked VISUALLY depends on the width. In the strip it
     is a filled, disabled segment — plainly "you are here". On a phone the switcher
     lives in the nav overflow menu, where `.demo-menu-overflow .demo-btn:disabled`
     greys a row out and a greyed row in a list of destinations reads as
     unavailable rather than current — so there it gets the panel's `.active`
     tint instead, and is simply inert when tapped. `aria-current="page"` is
     unconditional: each mode is a route, at either width.

     The row is a named group, not a toolbar: independently tabbable buttons with
     no arrow-key handling, and the name is what makes "Single" read as a mode. -->
<div class="mochart-demo-mode-switcher">
  <span class="demo-label">{demoText.modeSwitcher.label}</span>
  <div class="demo-toolbar" role="group" aria-label={demoText.modeSwitcher.groupAria}>
    {#each modes as mode (mode)}
      <button type="button"
              class={"demo-btn demo-btn-" + (mode === demoMode ? "primary" : "secondary") + (mode === demoMode && phone.isPhone ? " active" : "")}
              disabled={mode === demoMode && !phone.isPhone} title={demoText.modeSwitcher.modes[mode].title}
              aria-current={mode === demoMode ? 'page' : undefined}
              onclick={() => { if (mode !== demoMode) { onModeChanged(mode); } }}>
        <Icon size="lg" fixedWidth={true} name={modeIcons[mode]} /><span class="btn-label">{demoText.modeSwitcher.modes[mode].label}</span>
      </button>
    {/each}
  </div>
</div>
