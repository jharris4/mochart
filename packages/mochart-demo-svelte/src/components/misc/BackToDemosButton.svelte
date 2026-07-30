<script lang="ts">
  // Back link from a demo view to the gallery landing page.
  import { demoText } from '@mochart/demo-common';

  import Icon from './Icon.svelte';

  interface Props {
    onBackToDemos: () => void;
  }

  let { onBackToDemos }: Props = $props();
</script>

<button type="button" class="demo-btn demo-btn-secondary mochart-demo-back-button"
        title={demoText.backToDemos.tooltip} aria-label={demoText.backToDemos.aria}
        onclick={onBackToDemos}>
  <Icon size="lg" fixedWidth={true} name="chevron-left" /><span class="btn-label">{demoText.backToDemos.label}</span>
</button>
