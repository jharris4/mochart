<script>
  import Icon from '../misc/Icon.svelte';

  let { active = false, demoData, demoMode, demoId, onDemoModeChanged, onDemoChange } = $props();

  let isTestMode = $state(false);

  const theDemoIds = $derived(isTestMode ? demoData.testDemoIds : demoData.demoIds);
  const isSingle = $derived(demoMode === 'single');
  const isMulti = $derived(demoMode === 'multi');
  const isRandom = $derived(demoMode === 'random');

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
                  onclick={() => onDemoModeChanged('single', demoId)}>
            <Icon size="lg" name="edit" /> Single
          </button>
          <button type="button" class={"btn btn-" + (isMulti ? "primary" : "secondary")} disabled={isMulti}
                  onclick={() => onDemoModeChanged('multi', demoId)}>
            <Icon size="lg" name="window-restore" /> Multi
          </button>
          <button type="button" class={"btn btn-" + (isRandom ? "primary" : "secondary")} disabled={isRandom}
                  onclick={() => onDemoModeChanged('random', demoId)}>
            <Icon size="lg" name="random" /> Random
          </button>
          <button type="button" class="btn btn-secondary"
                  onclick={() => onDemoModeChanged('transition', demoId)}>
            <Icon size="lg" name="exchange" /> Transition
          </button>
          <button type="button" class="btn btn-secondary"
                  onclick={() => onDemoModeChanged('rotation', demoId)}>
            <Icon size="lg" name="repeat" /> Rotation
          </button>
        </div>
      </div>
      <div class="form-group" style="margin-left: 10px;">
        <div class="btn-toolbar" role="toolbar">
          <button type="button" class={"btn btn-" + (isTestMode ? "primary" : "secondary")}
                  onclick={onTestModeToggle}>
            <Icon size="lg" name="edit" /> Test Demos
          </button>
        </div>
      </div>
    </form>
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
