<script lang="ts">
  import { demoText } from '@mochart/demo-common';
  import type { SwitchableDemoMode } from '@mochart/demo-common';

  import ChartsTab from './ChartsTab.svelte';
  import ErrorTab from '../misc/ErrorTab.svelte';
  import BackToDemosButton from '../misc/BackToDemosButton.svelte';
  import ModeSwitcher from '../misc/ModeSwitcher.svelte';
  import NotesMenu from '../misc/NotesMenu.svelte';
  import SiteRootButton from '../misc/SiteRootButton.svelte';
  import ThemeToggleButton from '../misc/ThemeToggleButton.svelte';

  import type { DemoData } from '../../types';

  interface Props {
    demoData: DemoData;
    initialDemoId: string;
    siteRootUrl?: string;
    onModeChanged: (nextDemoMode: SwitchableDemoMode) => void;
    onBackToDemos: () => void;
  }

  let { demoData, initialDemoId, siteRootUrl = undefined, onModeChanged, onBackToDemos }: Props = $props();

  // Props intentionally seed local state with their initial value only; the
  // $effect.pre below re-syncs everything when the routed demo changes.
  // svelte-ignore state_referenced_locally
  let demoId = $state(initialDemoId);

  // svelte-ignore state_referenced_locally
  let previousInitialDemoId = initialDemoId;
  $effect.pre(() => {
    if (initialDemoId !== previousInitialDemoId) {
      previousInitialDemoId = initialDemoId;
      demoId = initialDemoId;
    }
  });
</script>

<div class="mochart-demo-container multi">
  <div class="mochart-demo-tabs-container">
    <div class="mochart-demo-nav-group">
      <SiteRootButton {siteRootUrl} />
      <BackToDemosButton {onBackToDemos} />
      <ul class="demo-tabs">
        <li class="demo-tab-item">
          <button type="button" class="demo-tab active">
            {demoText.tabs.chart}
          </button>
        </li>
      </ul>
      <NotesMenu title={demoData.demoObjectMap[demoId].title} notes={demoData.demoObjectMap[demoId].notes} />
    </div>
    <div class="mochart-demo-nav-group">
      <ModeSwitcher demoMode="multi" {onModeChanged} />
      <ThemeToggleButton />
    </div>
  </div>
  <div class="mochart-demo-content-pane">
    <div class="mochart-demo-content">
      <ErrorTab active={true}>
        <ChartsTab active={true} demoObject={demoData.demoObjectMap[demoId]} />
      </ErrorTab>
    </div>
  </div>
</div>
