<script>
  // Svelte wrapper around mochart's `createChart`: takes an enhanced config
  // (`mochartConfig`) and a data provider. Omit `width`/`height` to have the
  // chart track the container div's size.
  import { createChart } from 'mochart';
  import ChartHost from './ChartHost.svelte';

  let props = $props();
</script>

<ChartHost create={createChart} {...props} />
