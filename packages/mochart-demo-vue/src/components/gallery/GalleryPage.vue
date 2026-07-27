<script setup lang="ts">
import { getGallerySections } from '@mochart/demo-common';
import type { GalleryItem } from '@mochart/demo-common';

import Icon from '../misc/Icon.vue';
import SiteRootButton from '../misc/SiteRootButton.vue';
import ThemeToggleButton from '../misc/ThemeToggleButton.vue';

import type { DemoData } from '../../types';

// The /demos landing page: curated demos, the collapsed feature-coverage
// test demos, and the standalone showcase pages.
interface Props {
  demoData: DemoData;
  siteRootUrl?: string;
  onOpenDemo: (demoId: string) => void;
  onOpenPage: (mode: 'transition' | 'rotation') => void;
}

const props = defineProps<Props>();

const pageIcons: Record<'transition' | 'rotation', string> = {
  transition: 'right-left',
  rotation: 'repeat'
};

const sections = getGallerySections(props.demoData);

function onItemClick(item: GalleryItem) {
  if (item.kind === 'demo') {
    props.onOpenDemo(item.id);
  }
  else {
    props.onOpenPage(item.mode);
  }
}
</script>

<template>
  <div class="mochart-demo-container">
    <div class="mochart-demo-gallery-header">
      <SiteRootButton :site-root-url="props.siteRootUrl" />
      <ThemeToggleButton />
    </div>
    <div class="mochart-demo-content-pane">
      <div class="mochart-demo-gallery">
        <template v-for="section in sections" :key="section.key">
          <!-- Collapsed sections use native details/summary: no state to manage
               and keyboard/screen-reader behavior comes for free. -->
          <details v-if="section.collapsed" class="mochart-demo-gallery-section">
            <summary class="mochart-demo-gallery-section-header">
              <Icon name="flask" :fixed-width="true" />
              <span class="mochart-demo-gallery-section-title">{{ section.title }}</span>
              <span v-if="section.hint !== undefined" class="mochart-demo-gallery-section-hint">{{ section.hint }}</span>
            </summary>
            <div class="demo-list">
              <button v-for="item in section.items" :key="item.kind === 'demo' ? item.id : item.mode" type="button"
                      class="demo-list-item" @click="onItemClick(item)">
                <Icon v-if="item.kind === 'page'" :name="pageIcons[item.mode]" :fixed-width="true" />
                <span class="mochart-demo-item-title">{{ item.title }}</span>
                <span v-if="item.description !== undefined" class="mochart-demo-item-description">{{ item.description }}</span>
              </button>
            </div>
          </details>
          <section v-else class="mochart-demo-gallery-section">
            <div class="mochart-demo-gallery-section-header">
              <span class="mochart-demo-gallery-section-title">{{ section.title }}</span>
              <span v-if="section.hint !== undefined" class="mochart-demo-gallery-section-hint">{{ section.hint }}</span>
            </div>
            <div class="demo-list">
              <button v-for="item in section.items" :key="item.kind === 'demo' ? item.id : item.mode" type="button"
                      class="demo-list-item" @click="onItemClick(item)">
                <Icon v-if="item.kind === 'page'" :name="pageIcons[item.mode]" :fixed-width="true" />
                <span class="mochart-demo-item-title">{{ item.title }}</span>
                <span v-if="item.description !== undefined" class="mochart-demo-item-description">{{ item.description }}</span>
              </button>
            </div>
          </section>
        </template>
      </div>
    </div>
  </div>
</template>
