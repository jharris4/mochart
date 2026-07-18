<script lang="ts">
  import { demoText, getReferenceSectionIds, getReferenceSectionUrl } from '@mochart/demo-common';

  // Links into the documentation site's config reference for the sections the
  // edited config actually uses (see demo-common docsLinks).
  interface Props {
    config: Record<string, unknown> | null | undefined;
  }

  let { config }: Props = $props();

  const sectionIds = $derived(getReferenceSectionIds(config));
</script>

{#if sectionIds.length > 0}
  <div class="mochart-demo-docs-links">
    <span>{demoText.docsLinks.label} </span>
    {#each sectionIds as sectionId, index (sectionId)}
      {#if index > 0}{' · '}{/if}
      <a href={getReferenceSectionUrl(sectionId)} title={demoText.docsLinks.tooltipPrefix + sectionId}>{sectionId}</a>
    {/each}
  </div>
{/if}
