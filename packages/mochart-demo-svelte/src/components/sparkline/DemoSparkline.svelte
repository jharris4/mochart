<script module lang="ts">
  import { demoText, inlineSparklineMetrics, tableSparklineMetrics } from '@mochart/demo-common';

  const text = demoText.sparklinePage;
</script>

<script lang="ts">
  import { DefaultChart } from '@mochart/svelte';

  import ButtonWithTooltip from '../misc/ButtonWithTooltip.svelte';
  import Icon from '../misc/Icon.svelte';
  import TopBar from '../misc/TopBar.svelte';

  interface Props {
    siteRootUrl?: string;
    onBackToDemos: () => void;
  }

  let { siteRootUrl = undefined, onBackToDemos }: Props = $props();

  // The Randomize button advances the step; every metric's dataset is a pure
  // function of it, so the charts and "Latest" cells all re-derive together.
  let step = $state(0);

  const inlineData = $derived(inlineSparklineMetrics.map(metric => metric.generate(step)));
  const tableData = $derived(tableSparklineMetrics.map(metric => metric.generate(step)));

  function onRandomize() {
    step++;
  }
</script>

<div class="mochart-demo-container">
  <TopBar {siteRootUrl} {onBackToDemos} />
  <div class="sparkline-page">
    <p class="sparkline-intro">
      {#each text.intro as segment, i (i)}
        {segment}{#if inlineSparklineMetrics[i] !== undefined}<span class="sparkline-inline"><DefaultChart
          config={inlineSparklineMetrics[i].config} data={inlineData[i]}
          width={inlineSparklineMetrics[i].width} height={inlineSparklineMetrics[i].height} /></span>{/if}
      {/each}
    </p>
    <div class="sparkline-controls">
      <ButtonWithTooltip id="sparkline-randomize" label={text.randomize.label} color="primary"
                         tooltipText={text.randomize.tooltip} tooltipPlacement="top-start"
                         onClick={onRandomize} aria-label={text.randomize.aria}>
        <Icon fixedWidth={true} name="dice" />
      </ButtonWithTooltip>
    </div>
    <table class="sparkline-table">
      <thead>
        <tr>
          <th>{text.table.metric}</th>
          <th>{text.table.latest}</th>
          <th>{text.table.trend}</th>
        </tr>
      </thead>
      <tbody>
        {#each tableSparklineMetrics as metric, i (metric.id)}
          <tr>
            <td>{metric.label}</td>
            <td class="sparkline-value">{metric.latestText(tableData[i])}</td>
            <td class="sparkline-cell">
              <DefaultChart config={metric.config} data={tableData[i]}
                            width={metric.width} height={metric.height} />
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
