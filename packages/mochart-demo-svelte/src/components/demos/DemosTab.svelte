<script lang="ts">
  import { demoText } from '@mochart/demo-common';

  import Icon from '../misc/Icon.svelte';

  import type { DemoData, DemoMode, OnDemoModeChanged, OnDemoChanged } from '../../types';

  interface Props {
    active?: boolean;
    demoData: DemoData;
    demoMode: DemoMode;
    demoId: string;
    onDemoModeChanged: OnDemoModeChanged;
    onDemoChange: OnDemoChanged;
  }

  let { active = false, demoData, demoMode, demoId, onDemoModeChanged, onDemoChange }: Props = $props();

  let isTestMode = $state(false);

  const modeCaptions: Record<string, string> = demoText.demosTab.modeCaptions;

  const theDemoIds = $derived(isTestMode ? demoData.testDemoIds : demoData.demoIds);
  const isSingle = $derived(demoMode === 'single');
  const isMulti = $derived(demoMode === 'multi');
  const isRandom = $derived(demoMode === 'random');
  const modeCaption = $derived(modeCaptions[demoMode] ?? '');

  function onTestModeToggle() {
    isTestMode = !isTestMode;
  }
</script>

<div class={"mochart-demo-tab-container col demos" + (active ? " active" : "")}>
  <div class="mochart-demo-modes-container">
    <form class="form-inline">
      <div class="form-group">
        <span class="form-control-plaintext">{demoText.demosTab.demoModeLabel}&nbsp;</span>
      </div>
      <div class="form-group">
        <div class="btn-toolbar" role="toolbar">
          <button type="button" class={"btn btn-" + (isSingle ? "primary" : "secondary")} disabled={isSingle}
                  title={demoText.demosTab.modes.single.title}
                  onclick={() => onDemoModeChanged('single', demoId)}>
            <Icon size="lg" name="pen-to-square" /> {demoText.demosTab.modes.single.label}
          </button>
          <button type="button" class={"btn btn-" + (isMulti ? "primary" : "secondary")} disabled={isMulti}
                  title={demoText.demosTab.modes.multi.title}
                  onclick={() => onDemoModeChanged('multi', demoId)}>
            <Icon size="lg" name="window-restore" /> {demoText.demosTab.modes.multi.label}
          </button>
          <button type="button" class={"btn btn-" + (isRandom ? "primary" : "secondary")} disabled={isRandom}
                  title={demoText.demosTab.modes.random.title}
                  onclick={() => onDemoModeChanged('random', demoId)}>
            <Icon size="lg" name="shuffle" /> {demoText.demosTab.modes.random.label}
          </button>
          <button type="button" class="btn btn-secondary"
                  title={demoText.demosTab.modes.transition.title}
                  onclick={() => onDemoModeChanged('transition', demoId)}>
            <Icon size="lg" name="right-left" /> {demoText.demosTab.modes.transition.label}
          </button>
          <button type="button" class="btn btn-secondary"
                  title={demoText.demosTab.modes.rotation.title}
                  onclick={() => onDemoModeChanged('rotation', demoId)}>
            <Icon size="lg" name="repeat" /> {demoText.demosTab.modes.rotation.label}
          </button>
        </div>
      </div>
      <div class="form-group" style="margin-left: 10px;">
        <div class="btn-toolbar" role="toolbar">
          <button type="button" class={"btn btn-" + (isTestMode ? "primary" : "secondary")} aria-pressed={isTestMode}
                  title={demoText.demosTab.testDemos.title}
                  onclick={onTestModeToggle}>
            <Icon size="lg" name="flask" /> {demoText.demosTab.testDemos.label}
          </button>
        </div>
      </div>
    </form>
    {#if modeCaption}
      <div class="mochart-demo-caption">{modeCaption}</div>
    {/if}
  </div>
  <div class="mochart-demo-list-container">
    <div class="mochart-demo-list">
      <div class="list-group">
        {#each theDemoIds as currentDemoId (currentDemoId)}
          <button type="button"
                  class={"list-group-item list-group-item-action" + (currentDemoId === demoId ? " active" : "")}
                  onclick={() => onDemoChange(currentDemoId)}>
            {demoData.demoObjectMap[currentDemoId].title}
          </button>
        {/each}
      </div>
    </div>
  </div>
</div>
