import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { LightElement } from './LightElement';

/**
 * Error-boundary stand-in for the react ErrorTab. Lit has no error-capturing
 * boundary, so this catches synchronous errors thrown while building the
 * `content` template; errors thrown inside a child element's own render
 * cycle stay with that element. Children receive their `active` prop
 * directly at the call site, as in the Vue demo.
 */
@customElement('error-tab')
export class ErrorTab extends LightElement {
  @property({ attribute: false }) active = false;
  @property({ attribute: false }) content: (() => unknown) | null = null;

  @state() private failed = false;

  override render(): unknown {
    if (this.failed) {
      return html`<div class=${'mochart-demo-tab-container error' + (this.active ? ' active' : '')}>
        <div class="alert alert-danger text-center mochart-demo-error-message" role="alert">
          An Error Occurred
        </div>
      </div>`;
    }
    try {
      return this.content !== null ? this.content() : null;
    }
    catch (error) {
      console.error(error);
      this.failed = true;
      return null;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'error-tab': ErrorTab;
  }
}
