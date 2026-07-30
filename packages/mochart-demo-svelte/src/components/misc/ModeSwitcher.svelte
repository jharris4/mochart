<script lang="ts">
  // The Single/Multi/Random mode switcher shown in the demo view navigation
  // strip. Transition/rotation are standalone gallery pages, not modes, so
  // they don't appear here.
  import { demoText, getAvailableDemoModes, isPhoneViewport, watchPhoneViewport } from '@mochart/demo-common';
  import type { SwitchableDemoMode } from '@mochart/demo-common';

  import Icon from './Icon.svelte';

  interface Props {
    demoMode: SwitchableDemoMode;
    onModeChanged: (nextDemoMode: SwitchableDemoMode) => void;
  }

  let { demoMode, onModeChanged }: Props = $props();

  let isPhone = $state(isPhoneViewport());
  $effect(() => watchPhoneViewport(value => { isPhone = value; }));

  const modes = $derived(getAvailableDemoModes(isPhone));

  const modeIcons: Record<SwitchableDemoMode, string> = {
    single: 'pen-to-square',
    multi: 'window-restore',
    random: 'shuffle'
  };
</script>

<div class="mochart-demo-mode-switcher">
  <span class="demo-label">{demoText.modeSwitcher.label}</span>
  <div class="demo-toolbar" role="toolbar">
    {#each modes as mode (mode)}
      <button type="button" class={"demo-btn demo-btn-" + (mode === demoMode ? "primary" : "secondary")}
              disabled={mode === demoMode} title={demoText.modeSwitcher.modes[mode].title}
              onclick={() => onModeChanged(mode)}>
        <Icon size="lg" fixedWidth={true} name={modeIcons[mode]} /><span class="btn-label">{demoText.modeSwitcher.modes[mode].label}</span>
      </button>
    {/each}
  </div>
</div>
