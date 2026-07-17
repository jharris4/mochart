<script lang="ts">
  import { untrack } from 'svelte';

  import TextAreaContent from '../misc/TextAreaContent.svelte';

  interface Props {
    active?: boolean;
    data: unknown;
  }

  function formatData(dataJSON: unknown): string {
    return JSON.stringify(dataJSON).replace(/,/g, ', ').replace(/},/g, '},\n');
  }

  let { active = false, data }: Props = $props();

  let dataText = $state(formatData(data));

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
