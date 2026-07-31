<script module lang="ts">
  import { rotationConfigs as configs, rotationData as data } from '@mochart/demo-common';

  const minWidth = 400;
</script>

<script lang="ts">
  import { DefaultChart } from '@mochart/svelte';

  import TopBar from '../misc/TopBar.svelte';

  interface Props {
    siteRootUrl?: string;
    onBackToDemos: () => void;
  }

  let { siteRootUrl = undefined, onBackToDemos }: Props = $props();

  // Columns are sized from the card's measured width (not the window) so the
  // grid stays inside the padded shell.
  let chartsWidth = $state(0);

  const cols = $derived(Math.max(1, Math.floor(chartsWidth / minWidth)));
  const colWidth = $derived(Math.floor(chartsWidth / cols));
</script>

<div class="mochart-demo-container">
  <TopBar {siteRootUrl} {onBackToDemos} />
  <div class="rotation-charts" bind:clientWidth={chartsWidth}>
    {#if colWidth > 0}
      {#each configs as config, i (i)}
        <div class={"rotation-chart rotation-chart-" + i}
             style={`left: ${(i % cols) * colWidth}px; top: ${Math.floor(i / cols) * colWidth}px; width: ${colWidth}px; height: ${colWidth}px;`}>
          <DefaultChart {config} {data} width={colWidth} height={colWidth} />
        </div>
      {/each}
    {/if}
  </div>
</div>
