import { html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { getGallerySections } from '@mochart/demo-common';
import type { GalleryItem, GallerySection } from '@mochart/demo-common';

import { LightElement } from '../misc/LightElement';
import { icon } from '../misc/templates';
import { siteRootButton } from '../misc/mode-switcher';
import '../misc/theme-toggle-button';

import type { DemoData } from '../../types';

const pageIcons: Record<'transition' | 'rotation', string> = {
  transition: 'right-left',
  rotation: 'repeat'
};

@customElement('gallery-page')
export class GalleryPage extends LightElement {
  @property({ attribute: false }) demoData!: DemoData;
  @property({ attribute: false }) siteRootUrl: string | undefined = void 0;
  @property({ attribute: false }) onOpenDemo!: (demoId: string) => void;
  @property({ attribute: false }) onOpenPage!: (mode: 'transition' | 'rotation') => void;

  private onItemClick(item: GalleryItem): void {
    if (item.kind === 'demo') {
      this.onOpenDemo(item.id);
    }
    else {
      this.onOpenPage(item.mode);
    }
  }

  private renderItem(item: GalleryItem): unknown {
    return html`<button type="button" class="demo-list-item"
        @click=${() => this.onItemClick(item)}>${item.kind === 'page' ? icon({ name: pageIcons[item.mode], fixedWidth: true }) : nothing}<span class="mochart-demo-item-title">${item.title}</span>${item.description !== void 0
          ? html`<span class="mochart-demo-item-description">${item.description}</span>`
          : nothing}</button>`;
  }

  private renderSection(section: GallerySection): unknown {
    const list = html`<div class="demo-list">${section.items.map(item => this.renderItem(item))}</div>`;
    const header = html`<span class="mochart-demo-gallery-section-title">${section.title}</span>${section.hint !== void 0
      ? html`<span class="mochart-demo-gallery-section-hint">${section.hint}</span>`
      : nothing}`;
    if (!section.collapsed) {
      return html`<section class="mochart-demo-gallery-section">
        <div class="mochart-demo-gallery-section-header">${header}</div>
        ${list}
      </section>`;
    }
    // Collapsed sections use native details/summary: no state to manage and
    // keyboard/screen-reader behavior comes for free.
    return html`<details class="mochart-demo-gallery-section">
      <summary class="mochart-demo-gallery-section-header">${icon({ name: 'flask', fixedWidth: true })}${header}</summary>
      ${list}
    </details>`;
  }

  override render(): unknown {
    return html`<div class="mochart-demo-container">
      <div class="mochart-demo-gallery-header">
        ${siteRootButton(this.siteRootUrl)}
        <theme-toggle-button></theme-toggle-button>
      </div>
      <div class="mochart-demo-content-pane">
        <div class="mochart-demo-gallery">
          ${getGallerySections(this.demoData).map(section => this.renderSection(section))}
        </div>
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gallery-page': GalleryPage;
  }
}
