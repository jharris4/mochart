import { LitElement } from 'lit';

/**
 * Base class for all demo elements: renders into light DOM (no shadow root)
 * so the globally imported bootstrap / font-awesome / demo.css styles apply,
 * matching the other framework demos, and lays out as a plain block-less
 * pass-through so the demo's flex CSS keeps working.
 */
export class LightElement extends LitElement {
  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // The custom element tag itself must not break the flex layouts the demo
    // CSS builds between its parent and its rendered children.
    this.style.display = 'contents';
  }
}
