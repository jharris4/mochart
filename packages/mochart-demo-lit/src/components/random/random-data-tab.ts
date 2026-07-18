import { formatData } from '@mochart/demo-common';

import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { PropertyValues } from 'lit';

import { LightElement } from '../misc/LightElement';
import { textAreaContent } from '../misc/templates';

@customElement('random-data-tab')
export class RandomDataTab extends LightElement {
  @property({ attribute: false }) active = false;
  @property({ attribute: false }) data: unknown = null;

  @state() private dataText = '';

  override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('data')) {
      this.dataText = formatData(this.data);
    }
  }

  override render(): unknown {
    return html`<div class=${'mochart-demo-tab-container col data' + (this.active ? ' active' : '')}>
      <div class="mochart-demo-tab-content">
        ${textAreaContent({ value: this.dataText, onChange: () => {} })}
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'random-data-tab': RandomDataTab;
  }
}
