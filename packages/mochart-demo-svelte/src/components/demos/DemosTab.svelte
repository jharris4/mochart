<script lang="ts">
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

  const modeCaptions: Record<string, string> = {
    single: 'Single: one chart with editable config, data, groups and series — pick a demo below.',
    multi: 'Multi: a grid of charts stepping through generated datasets together — pick a demo below.',
    random: 'Random: a chart fed by a seeded random data generator — pick a demo below.',
    transition: 'Transition: animates a chart between datasets — pick a demo below.',
    rotation: 'Rotation: a grid of charts showing different tick label rotations — pick a demo below.'
  };

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
        <span class="form-control-plaintext">Demo Mode:&nbsp;</span>
      </div>
      <div class="form-group">
        <div class="btn-toolbar" role="toolbar">
          <button type="button" class={"btn btn-" + (isSingle ? "primary" : "secondary")} disabled={isSingle}
                  title="One chart with editable config, data, groups and series"
                  onclick={() => onDemoModeChanged('single', demoId)}>
            <Icon size="lg" name="pen-to-square" /> Single
          </button>
          <button type="button" class={"btn btn-" + (isMulti ? "primary" : "secondary")} disabled={isMulti}
                  title="A grid of charts stepping through datasets together"
                  onclick={() => onDemoModeChanged('multi', demoId)}>
            <Icon size="lg" name="window-restore" /> Multi
          </button>
          <button type="button" class={"btn btn-" + (isRandom ? "primary" : "secondary")} disabled={isRandom}
                  title="A chart fed by a seeded random data generator"
                  onclick={() => onDemoModeChanged('random', demoId)}>
            <Icon size="lg" name="shuffle" /> Random
          </button>
          <button type="button" class="btn btn-secondary"
                  title="Animate a chart between two datasets"
                  onclick={() => onDemoModeChanged('transition', demoId)}>
            <Icon size="lg" name="right-left" /> Transition
          </button>
          <button type="button" class="btn btn-secondary"
                  title="A grid of charts showing different tick label rotations"
                  onclick={() => onDemoModeChanged('rotation', demoId)}>
            <Icon size="lg" name="repeat" /> Rotation
          </button>
        </div>
      </div>
      <div class="form-group" style="margin-left: 10px;">
        <div class="btn-toolbar" role="toolbar">
          <button type="button" class={"btn btn-" + (isTestMode ? "primary" : "secondary")} aria-pressed={isTestMode}
                  title="Show the test demos (showcasing less used features)"
                  onclick={onTestModeToggle}>
            <Icon size="lg" name="flask" /> Test Demos
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
      <ul class="list-group">
        {#each theDemoIds as currentDemoId (currentDemoId)}
          <li class={"list-group-item" + (currentDemoId === demoId ? " active" : "")}
              onclick={() => onDemoChange(currentDemoId)}
              onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') { onDemoChange(currentDemoId); } }}
              role="button" tabindex="0">
            {demoData.demoObjectMap[currentDemoId].title}
          </li>
        {/each}
      </ul>
    </div>
  </div>
</div>
