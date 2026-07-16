<script>
  // Internal component shared by Chart and DefaultChart: mounts the chart via
  // `create` into the div below, pushes prop changes through the chart handle,
  // and destroys the chart when the component is destroyed.
  import { onMount } from 'svelte';
  import { mountChartHost } from './host.js';

  let { create, class: className = undefined, style = undefined, ...chartProps } = $props();

  let container;
  let host = null;
  let firstSync = true;

  onMount(() => {
    host = mountChartHost(create, container, { ...chartProps });
    return () => {
      const current = host;
      host = null;
      current.destroy();
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
