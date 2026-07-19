<script lang="ts">
  // The Single/Multi/Random mode switcher shown in the demo view navigation
  // strip. Transition/rotation are standalone gallery pages, not modes, so
  // they don't appear here.
  import { demoText, switchableDemoModes } from '@mochart/demo-common';
  import type { SwitchableDemoMode } from '@mochart/demo-common';

  import Icon from './Icon.svelte';

  interface Props {
    demoMode: SwitchableDemoMode;
    onModeChanged: (nextDemoMode: SwitchableDemoMode) => void;
  }

  let { demoMode, onModeChanged }: Props = $props();

  const modeIcons: Record<SwitchableDemoMode, string> = {
    single: 'pen-to-square',
    multi: 'window-restore',
    random: 'shuffle'
  };
</script>

<div class="mochart-demo-mode-switcher">
  <span class="form-control-plaintext">{demoText.modeSwitcher.label}</span>
  <div class="btn-toolbar" role="toolbar">
    {#each switchableDemoModes as mode (mode)}
      <button type="button" class={"btn btn-" + (mode === demoMode ? "primary" : "secondary")}
              disabled={mode === demoMode} title={demoText.modeSwitcher.modes[mode].title}
              onclick={() => onModeChanged(mode)}>
        <Icon size="lg" name={modeIcons[mode]} /> {demoText.modeSwitcher.modes[mode].label}
      </button>
    {/each}
  </div>
</div>
