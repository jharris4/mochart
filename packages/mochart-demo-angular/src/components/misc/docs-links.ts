import { Component, Input, computed, signal } from '@angular/core';

import { demoText, getReferenceSectionIds, getReferenceSectionUrl } from '@mochart/demo-common';

/**
 * Links into the documentation site's config reference for the sections the
 * edited config actually uses (see demo-common docsLinks).
 */
@Component({
  selector: 'app-docs-links',
  styles: [':host { display: contents; }'],
  template: `
    @if (sectionIds().length > 0) {
      <div class="mochart-demo-docs-links">
        <span>{{ text.label }}&nbsp;</span>
        @for (sectionId of sectionIds(); track sectionId; let index = $index) {
          @if (index > 0) {
            <span> · </span>
          }
          <a [href]="sectionUrl(sectionId)" [title]="text.tooltipPrefix + sectionId">{{ sectionId }}</a>
        }
      </div>
    }
  `
})
export class DocsLinks {
  readonly text = demoText.docsLinks;

  private readonly configSignal = signal<Record<string, unknown> | null | undefined>(null);

  @Input({ required: true }) set config(value: Record<string, unknown> | null | undefined) {
    this.configSignal.set(value);
  }

  readonly sectionIds = computed(() => getReferenceSectionIds(this.configSignal()));

  sectionUrl(sectionId: string): string {
    return getReferenceSectionUrl(sectionId);
  }
}
