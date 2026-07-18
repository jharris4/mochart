import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { PropertyValues } from 'lit';

import { LightElement } from '../misc/LightElement';
import { textAreaContent, buttonWithTooltip, icon } from '../misc/templates';

import { formatRandomConfig, validateRandomConfig } from '@mochart/demo-common';

import type { RandomConfigWithValid } from '../../types';

@customElement('random-config-tab')
export class RandomConfigTab extends LightElement {
  @property({ attribute: false }) active = false;
  @property({ attribute: false }) randomConfig!: RandomConfigWithValid;
  @property({ attribute: false }) onUpdate!: (config: RandomConfigWithValid) => void;
  @property({ attribute: false }) onReset!: () => void;

  @state() private configText = '';
  @state() private errorMessage: string | null = null;

  override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('randomConfig')) {
      this.configText = formatRandomConfig(this.randomConfig);
    }
  }

  private onTextChange = (nextConfigText: string): void => {
    this.configText = nextConfigText;
    this.errorMessage = null;
  };

  private onUpdateClick = (): void => {
    try {
      const newConfig = JSON.parse(this.configText);
      newConfig.valid = validateRandomConfig(newConfig);
      this.errorMessage = newConfig.valid ? null : 'Config has invalid values — details in the browser console';
      this.onUpdate(newConfig);
    }
    catch (error) {
      console.warn('Invalid Random Config JSON: ' + this.configText);
      this.errorMessage = 'Invalid JSON';
    }
  };

  private get jsonError(): string | null {
    try {
      JSON.parse(this.configText);
      return null;
    }
    catch (error) {
      return 'Invalid JSON';
    }
  }

  override render(): unknown {
    const jsonError = this.jsonError;
    const footerError = jsonError ?? this.errorMessage;
    return html`<div class=${'mochart-demo-tab-container col config' + (this.active ? ' active' : '')}>
      <div class="mochart-demo-tab-content">
        ${textAreaContent({ value: this.configText, onChange: this.onTextChange })}
      </div>
      <div class="mochart-demo-tab-footer">
        <div class="btn-toolbar" role="toolbar">
          ${buttonWithTooltip(
            { id: 'config-reset', label: 'Reset', tooltipText: 'Restore the original random generator config', tooltipPlacement: 'top-start', onClick: () => this.onReset(), ariaLabel: 'Reset' },
            icon({ size: 'lg', fixedWidth: true, name: 'arrow-rotate-left' })
          )}
          ${buttonWithTooltip(
            { id: 'config-apply', label: 'Apply', disabled: jsonError !== null, tooltipText: 'Apply this generator config to the random chart', tooltipPlacement: 'top-start', onClick: this.onUpdateClick, ariaLabel: 'Apply' },
            icon({ size: 'lg', fixedWidth: true, name: 'check' })
          )}
          ${footerError ? html`<span class="mochart-demo-footer-error" role="alert">${footerError}</span>` : nothing}
        </div>
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'random-config-tab': RandomConfigTab;
  }
}
