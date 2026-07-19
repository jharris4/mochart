<script lang="ts">
  // Link back to the docs site root (a real anchor so middle-click works).
  // Renders nothing when no site root is configured (standalone dev/build).
  import { demoText } from '@mochart/demo-common';

  import Icon from './Icon.svelte';

  interface Props {
    siteRootUrl?: string;
  }

  let { siteRootUrl = void 0 }: Props = $props();
</script>

{#if siteRootUrl !== void 0}
  <a class="btn btn-secondary mochart-demo-site-root-button" href={siteRootUrl}
     title={demoText.siteRootLink.tooltip} aria-label={demoText.siteRootLink.aria}>
    <Icon name="house" /> {demoText.siteRootLink.shortLabel}
  </a>
{/if}
