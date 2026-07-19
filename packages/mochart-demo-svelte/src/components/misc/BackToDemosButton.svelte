<script lang="ts">
  // Back link from a demo view to the gallery landing page.
  import { demoText } from '@mochart/demo-common';

  import Icon from './Icon.svelte';

  interface Props {
    onBackToDemos: () => void;
  }

  let { onBackToDemos }: Props = $props();
</script>

<button type="button" class="btn btn-secondary mochart-demo-back-button"
        title={demoText.backToDemos.tooltip} aria-label={demoText.backToDemos.aria}
        onclick={onBackToDemos}>
  <Icon name="chevron-left" /> {demoText.backToDemos.label}
</button>
