import { html } from 'lit';
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

  override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('transitionConfig')) {
      this.configText = formatConfig(this.transitionConfig);
    }
  }

  private onTextChange = (nextConfigText: string): void => {
    this.configText = nextConfigText;
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
              this.onUpdate(newConfig);
            }
            else {
              console.warn('Invalid Transition Config, data should be an array of arrays: ', newConfig.data);
              alert('Invalid Transition Data, should be an array of arrays');
            }
          }
          else {
            if (errors.length > 0) {
              console.warn('errors: ', errors);
            }
            if (warnings.length > 0) {
              console.warn('warnings: ', warnings);
            }
            alert('Invalid Chart Config, mochart config was not valid');
          }
        }
        else {
          console.warn('Invalid Transition Config, config should be an object: ', newConfig.config);
          alert('Invalid Chart Config, should be an object');
        }
      }
      else {
        console.warn('Invalid Transition Config, should be an object: ', this.configText);
        alert('Invalid Transition Config, should be an object');
      }
    }
    catch (error) {
      console.warn('Invalid Transition Config JSON: ', this.configText);
      alert('Invalid Transition Config JSON');
    }
  };

  override render(): unknown {
    return html`<div class=${'mochart-demo-tab-container col config' + (this.active ? ' active' : '')}>
      <div class="mochart-demo-tab-content">
        ${textAreaContent({ value: this.configText, onChange: this.onTextChange })}
      </div>
      <div class="mochart-demo-tab-footer">
        <div class="btn-toolbar" role="toolbar">
          ${buttonWithTooltip(
            { id: 'config-reset', tooltipText: 'Reset', tooltipPlacement: 'top-start', onClick: () => this.onReset(), ariaLabel: 'Reset' },
            icon({ size: 'lg', fixedWidth: true, name: 'undo' })
          )}
          ${buttonWithTooltip(
            { id: 'config-apply', tooltipText: 'Apply', tooltipPlacement: 'top-start', onClick: this.onUpdateClick, ariaLabel: 'Apply' },
            icon({ size: 'lg', fixedWidth: true, name: 'check' })
          )}
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
