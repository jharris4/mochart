<script lang="ts">
  // Link back to the docs site root (a real anchor so middle-click works).
  // Renders nothing when no site root is configured (standalone dev/build).
  import { demoText } from '@mochart/demo-common';

  import Icon from './Icon.svelte';

  interface Props {
    siteRootUrl?: string;
  }

  let { siteRootUrl = undefined }: Props = $props();
</script>

{#if siteRootUrl !== undefined}
  <a class="demo-btn demo-btn-secondary mochart-demo-site-root-button" href={siteRootUrl}
     title={demoText.siteRootLink.tooltip} aria-label={demoText.siteRootLink.aria}>
    <Icon size="lg" fixedWidth={true} name="house" /><span class="btn-label">{demoText.siteRootLink.shortLabel}</span>
  </a>
{/if}
