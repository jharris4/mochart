import { Component, Input } from '@angular/core';
import type { OnInit } from '@angular/core';

import { getGallerySections } from '@mochart/demo-common';

import { Icon } from '../misc/icon';
import { SiteRootButton, ThemeToggleButton } from '../misc/mode-switcher';
import { GalleryListItem } from './gallery-list-item';

import type { DemoData, GalleryItem, GallerySection, ShowcaseMode } from '../../types';

/**
 * The demo gallery landing page (the /demos route): the curated demos, the
 * feature-coverage test demos in a collapsed section, and the standalone
 * showcase pages. Collapsed sections use native details/summary: no state to
 * manage and keyboard/screen-reader behavior comes for free.
 */
@Component({
  selector: 'app-demo-gallery',
  imports: [GalleryListItem, Icon, SiteRootButton, ThemeToggleButton],
  styles: [':host { display: contents; }'],
  template: `
    <div class="mochart-demo-container">
      <div class="mochart-demo-gallery-header">
        @if (siteRootUrl !== undefined) {
          <a appSiteRootButton [href]="siteRootUrl"></a>
        }
        <button appThemeToggleButton></button>
      </div>
      <div class="mochart-demo-content-pane">
        <div class="mochart-demo-gallery">
          @for (section of sections; track section.key) {
            @if (!section.collapsed) {
              <section class="mochart-demo-gallery-section">
                <div class="mochart-demo-gallery-section-header">
                  <span class="mochart-demo-gallery-section-title">{{ section.title }}</span>
                  @if (section.hint !== undefined) {
                    <span class="mochart-demo-gallery-section-hint">{{ section.hint }}</span>
                  }
                </div>
                <div class="demo-list">
                  @for (item of section.items; track $index) {
                    <app-gallery-list-item [item]="item" [onOpen]="onItemClick" />
                  }
                </div>
              </section>
            } @else {
              <details class="mochart-demo-gallery-section">
                <summary class="mochart-demo-gallery-section-header">
                  <app-icon name="flask" [fixedWidth]="true" />
                  <span class="mochart-demo-gallery-section-title">{{ section.title }}</span>
                  @if (section.hint !== undefined) {
                    <span class="mochart-demo-gallery-section-hint">{{ section.hint }}</span>
                  }
                </summary>
                <div class="demo-list">
                  @for (item of section.items; track $index) {
                    <app-gallery-list-item [item]="item" [onOpen]="onItemClick" />
                  }
                </div>
              </details>
            }
          }
        </div>
      </div>
    </div>
  `
})
export class DemoGallery implements OnInit {
  @Input({ required: true }) demoData!: DemoData;
  @Input() siteRootUrl?: string;
  @Input({ required: true }) onOpenDemo!: (demoId: string) => void;
  @Input({ required: true }) onOpenPage!: (mode: ShowcaseMode) => void;

  sections: GallerySection[] = [];

  ngOnInit(): void {
    this.sections = getGallerySections(this.demoData);
  }

  // Passed to the card as a value, so it is an arrow property, not a method.
  readonly onItemClick = (item: GalleryItem): void => {
    if (item.kind === 'demo') {
      this.onOpenDemo(item.id);
    }
    else {
      this.onOpenPage(item.mode);
    }
  };
}
