import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { PropertyValues } from 'lit';

import validators from 'movalid';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';

import { LightElement } from '../misc/LightElement';
import { textAreaContent, buttonWithTooltip, icon } from '../misc/templates';

import type { TransitionConfig } from '../../types';

const objectValidator = validators.object();
const arrayValidator = validators.array();

function formatConfig(transitionConfig: TransitionConfig): string {
  if (transitionConfig && objectValidator(transitionConfig)) {
    let configText = '{}';
    let dataText = '[]';
    if (transitionConfig.config && objectValidator(transitionConfig.config)) {
      configText = JSON.stringify(transitionConfig.config, null, '\t');
      configText = configText.replace(/\n\t/g, '\n\t\t');
      configText = configText.replace(/\n}/g, '\n\t}');
    }
    if (transitionConfig.data && arrayValidator(transitionConfig.data)) {
      const dataArray = transitionConfig.data;
      const dataTexts: string[] = [];
      let aDataText: string;
      for (const data of dataArray) {
        if (data && arrayValidator(data)) {
          aDataText = JSON.stringify(data).replace(/},{/g, '},\n\t\t\t{').replace(/,/g, ', ');
          aDataText = aDataText.replace(/\[{/, '[\n\t\t\t{');
          aDataText = aDataText.replace(/}\]/, '}\n\t\t]');
          dataTexts.push(aDataText);
        }
      }
      dataText = '[\n\t\t' + dataTexts.join(',\n\t\t') + '\n\t]';
    }
    return '{\n' + '\t"config": ' + configText + ',\n\t"data": ' + dataText + '\n}';
  }
  else {
    return String(transitionConfig);
  }
}

@customElement('transition-config-tab')
export class TransitionConfigTab extends LightElement {
  @property({ attribute: false }) active = false;
  @property({ attribute: false }) transitionConfig!: TransitionConfig;
  @property({ attribute: false }) onUpdate!: (config: TransitionConfig) => void;
  @property({ attribute: false }) onReset!: () => void;

  @state() private configText = '';
  @state() private errorMessage: string | null = null;

  override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('transitionConfig')) {
      this.configText = formatConfig(this.transitionConfig);
    }
  }

  private onTextChange = (nextConfigText: string): void => {
    this.configText = nextConfigText;
    this.errorMessage = null;
  };

  private onUpdateClick = (): void => {
    try {
      const newConfig = JSON.parse(this.configText);
      if (objectValidator(newConfig)) {
        if (objectValidator(newConfig.config)) {
          const mochartDemoConfig = buildMochartDemoConfig(newConfig.config);
          const { configValidation } = mochartDemoConfig;
          const { valid, errors, warnings } = configValidation;
          if (valid) {
            if (arrayValidator(newConfig.data) && !newConfig.data.some((aData: unknown) => !arrayValidator(aData))) {
              this.errorMessage = null;
              this.onUpdate(newConfig);
            }
            else {
              console.warn('Invalid Transition Config, data should be an array of arrays: ', newConfig.data);
              this.errorMessage = '"data" should be an array of arrays';
            }
          }
          else {
            if (errors.length > 0) {
              console.warn('errors: ', errors);
            }
            if (warnings.length > 0) {
              console.warn('warnings: ', warnings);
            }
            this.errorMessage = 'Invalid chart config — details in the browser console';
          }
        }
        else {
          console.warn('Invalid Transition Config, config should be an object: ', newConfig.config);
          this.errorMessage = '"config" should be an object';
        }
      }
      else {
        console.warn('Invalid Transition Config, should be an object: ', this.configText);
        this.errorMessage = 'Transition config should be an object';
      }
    }
    catch (error) {
      console.warn('Invalid Transition Config JSON: ', this.configText);
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
            { id: 'config-reset', label: 'Reset', tooltipText: 'Restore the original transition config', tooltipPlacement: 'top-start', onClick: () => this.onReset(), ariaLabel: 'Reset' },
            icon({ size: 'lg', fixedWidth: true, name: 'arrow-rotate-left' })
          )}
          ${buttonWithTooltip(
            { id: 'config-apply', label: 'Apply', disabled: jsonError !== null, tooltipText: 'Apply this config to the transition charts', tooltipPlacement: 'top-start', onClick: this.onUpdateClick, ariaLabel: 'Apply' },
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
    'transition-config-tab': TransitionConfigTab;
  }
}
