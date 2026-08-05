<script lang="ts">
  // Internal component shared by Chart and DefaultChart: mounts the chart via
  // `create` into the div below, pushes prop changes through the chart handle,
  // and destroys the chart when the component is destroyed.
  import { getAllContexts, onMount } from 'svelte';
  import { mountChartHost } from './host';
  import type { CreateChartFn, HostHandle } from './host';
  import type { BaseChartProps } from './types';

  type ChartHostProps = BaseChartProps & {
    create: CreateChartFn;
    [key: string]: any;
  };

  let { create, class: className = undefined, style = undefined, ...chartProps }: ChartHostProps = $props();

  let container: HTMLDivElement;
  let host: HostHandle | null = null;
  let firstSync = true;
  // captured at init time: placeholders mount with this component's contexts
  const componentContext = getAllContexts();

  onMount(() => {
    host = mountChartHost(create, container, { ...chartProps }, componentContext);
    return () => {
      const current = host;
      host = null;
      current?.destroy();
    };
  });

  $effect(() => {
    // Spreading reads every chart prop so this effect tracks them all; the
    // first run happens right after onMount with identical props, so skip it.
    const next = { ...chartProps };
    if (firstSync) {
      firstSync = false;
      return;
    }
    host?.update(next);
  });
</script>

<div
  bind:this={container}
  class={className}
  {style}
  style:width={typeof chartProps.width === 'number' ? `${chartProps.width}px` : undefined}
  style:height={typeof chartProps.height === 'number' ? `${chartProps.height}px` : undefined}
></div>
