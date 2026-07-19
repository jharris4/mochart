<script lang="ts">
  // The standalone demo gallery page (the /demos landing route): the curated
  // demos, the feature-coverage test demos in a collapsed section and the
  // standalone showcase pages.
  import { getGallerySections } from '@mochart/demo-common';
  import type { GalleryItem, GallerySection } from '@mochart/demo-common';

  import Icon from '../misc/Icon.svelte';
  import SiteRootButton from '../misc/SiteRootButton.svelte';

  import type { DemoData } from '../../types';

  interface Props {
    demoData: DemoData;
    siteRootUrl?: string;
    onOpenDemo: (demoId: string) => void;
    onOpenPage: (mode: 'transition' | 'rotation') => void;
  }

  let { demoData, siteRootUrl = void 0, onOpenDemo, onOpenPage }: Props = $props();

  const pageIcons: Record<'transition' | 'rotation', string> = {
    transition: 'right-left',
    rotation: 'repeat'
  };

  const sections = $derived(getGallerySections(demoData));

  function onItemClick(item: GalleryItem) {
    if (item.kind === 'demo') {
      onOpenDemo(item.id);
    }
    else {
      onOpenPage(item.mode);
    }
  }
</script>

{#snippet sectionHeader(section: GallerySection)}
  <span class="mochart-demo-gallery-section-title">{section.title}</span>
  {#if section.hint !== void 0}
    <span class="mochart-demo-gallery-section-hint">{section.hint}</span>
  {/if}
{/snippet}

{#snippet sectionItems(section: GallerySection)}
  <div class="list-group">
    {#each section.items as item (item.kind === 'demo' ? item.id : item.mode)}
      <button type="button" class="list-group-item list-group-item-action"
              onclick={() => onItemClick(item)}>
        {#if item.kind === 'page'}
          <Icon fixedWidth name={pageIcons[item.mode]} />
        {/if}
        <span class="mochart-demo-item-title">{item.title}</span>
        {#if item.description !== void 0}
          <span class="mochart-demo-item-description">{item.description}</span>
        {/if}
      </button>
    {/each}
  </div>
{/snippet}

<div class="mochart-demo-container">
  {#if siteRootUrl !== void 0}
    <div class="mochart-demo-gallery-header">
      <SiteRootButton {siteRootUrl} />
    </div>
  {/if}
  <div class="mochart-demo-content-pane">
    <div class="mochart-demo-gallery">
      {#each sections as section (section.key)}
        {#if section.collapsed}
          <!-- Collapsed sections use native details/summary: no state to manage
               and keyboard/screen-reader behavior comes for free. -->
          <details class="mochart-demo-gallery-section">
            <summary class="mochart-demo-gallery-section-header">
              <Icon fixedWidth name="flask" />
              {@render sectionHeader(section)}
            </summary>
            {@render sectionItems(section)}
          </details>
        {:else}
          <section class="mochart-demo-gallery-section">
            <div class="mochart-demo-gallery-section-header">
              {@render sectionHeader(section)}
            </div>
            {@render sectionItems(section)}
          </section>
        {/if}
      {/each}
    </div>
  </div>
</div>
