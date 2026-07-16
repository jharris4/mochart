<script>
  // Svelte wrapper around mochart's `createDefaultChart`: takes a raw `config`
  // (enhanced internally) and a plain array-of-objects `data`. Omit
  // `width`/`height` to have the chart track the container div's size.
  import { createDefaultChart } from 'mochart';
  import ChartHost from './ChartHost.svelte';

  let props = $props();
</script>

<ChartHost create={createDefaultChart} {...props} />
