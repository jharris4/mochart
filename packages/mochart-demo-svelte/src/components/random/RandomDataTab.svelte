<script lang="ts">
  import { formatData } from '@mochart/demo-common';

  import { untrack } from 'svelte';

  import TextAreaContent from '../misc/TextAreaContent.svelte';

  interface Props {
    active?: boolean;
    data: unknown;
  }

  let { active = false, data }: Props = $props();

  // Props intentionally seed local state with their initial value only; the
  // $effect.pre below re-syncs on later prop changes.
  // svelte-ignore state_referenced_locally
  let dataText = $state(formatData(data));

  // svelte-ignore state_referenced_locally
  let previousData = data;
  $effect.pre(() => {
    const nextData = data;
    untrack(() => {
      if (nextData !== previousData) {
        previousData = nextData;
        dataText = formatData(nextData);
      }
    });
  });
</script>

<div class={"mochart-demo-tab-container col data" + (active ? " active" : "")}>
  <div class="mochart-demo-tab-content">
    <TextAreaContent value={dataText} onChange={() => {}} />
  </div>
</div>
