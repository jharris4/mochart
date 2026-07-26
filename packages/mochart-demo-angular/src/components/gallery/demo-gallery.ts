import { Component, Input } from '@angular/core';
import type { OnInit } from '@angular/core';

import { getGallerySections } from '@mochart/demo-common';

import { Icon } from '../misc/icon';
import { SiteRootButton, ThemeToggleButton } from '../misc/mode-switcher';

import type { DemoData, GalleryItem, GallerySection } from '../../types';

const pageIcons: Record<'transition' | 'rotation', string> = {
  transition: 'right-left',
  rotation: 'repeat'
};

/**
 * The demo gallery landing page (the /demos route): the curated demos, the
 * feature-coverage test demos in a collapsed section, and the standalone
 * showcase pages. Collapsed sections use native details/summary: no state to
 * manage and keyboard/screen-reader behavior comes for free.
 */
@Component({
  selector: 'app-demo-gallery',
  imports: [Icon, SiteRootButton, ThemeToggleButton],
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
                    <button type="button" class="demo-list-item" (click)="onItemClick(item)">
                      @if (item.kind === 'page') {
                        <app-icon [name]="pageIcons[item.mode]" [fixedWidth]="true" />
                      }
                      <span class="mochart-demo-item-title">{{ item.title }}</span>
                      @if (item.description !== undefined) {
                        <span class="mochart-demo-item-description">{{ item.description }}</span>
                      }
                    </button>
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
                    <button type="button" class="demo-list-item" (click)="onItemClick(item)">
                      @if (item.kind === 'page') {
                        <app-icon [name]="pageIcons[item.mode]" [fixedWidth]="true" />
                      }
                      <span class="mochart-demo-item-title">{{ item.title }}</span>
                      @if (item.description !== undefined) {
                        <span class="mochart-demo-item-description">{{ item.description }}</span>
                      }
                    </button>
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
  @Input({ required: true }) onOpenPage!: (mode: 'transition' | 'rotation') => void;

  readonly pageIcons = pageIcons;

  sections: GallerySection[] = [];

  ngOnInit(): void {
    this.sections = getGallerySections(this.demoData);
  }

  onItemClick(item: GalleryItem): void {
    if (item.kind === 'demo') {
      this.onOpenDemo(item.id);
    }
    else {
      this.onOpenPage(item.mode);
    }
  }
}
