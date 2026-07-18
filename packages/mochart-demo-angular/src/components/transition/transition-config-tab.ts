import { Component, Input, signal } from '@angular/core';
import type { OnChanges, OnInit, SimpleChanges } from '@angular/core';

import validators from 'movalid';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';

import { TextAreaContent } from '../misc/text-area-content';
import { ButtonWithTooltip } from '../misc/button-with-tooltip';
import { Icon } from '../misc/icon';

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

@Component({
  selector: 'app-transition-config-tab',
  imports: [TextAreaContent, ButtonWithTooltip, Icon],
  styles: [':host { display: contents; }'],
  template: `
    <div [class]="'mochart-demo-tab-container col config' + (active ? ' active' : '')">
      <div class="mochart-demo-tab-content">
        <app-text-area-content [value]="configText()" [onChange]="onTextChange" />
      </div>
      <div class="mochart-demo-tab-footer">
        <div class="btn-toolbar" role="toolbar">
          <app-button-with-tooltip id="config-reset" label="Reset" tooltipText="Restore the original transition config" tooltipPlacement="top-start"
                                   [onClick]="onReset" aria-label="Reset">
            <app-icon size="lg" [fixedWidth]="true" name="arrow-rotate-left" />
          </app-button-with-tooltip>
          <app-button-with-tooltip id="config-apply" label="Apply" [disabled]="jsonError !== null"
                                   tooltipText="Apply this config to the transition charts" tooltipPlacement="top-start"
                                   [onClick]="onUpdateClick" aria-label="Apply">
            <app-icon size="lg" [fixedWidth]="true" name="check" />
          </app-button-with-tooltip>
          @if (footerError) {
            <span class="mochart-demo-footer-error" role="alert">{{ footerError }}</span>
          }
        </div>
      </div>
    </div>
  `
})
export class TransitionConfigTab implements OnInit, OnChanges {
  @Input() active = false;
  @Input({ required: true }) transitionConfig!: TransitionConfig;
  @Input({ required: true }) onUpdate!: (config: TransitionConfig) => void;
  @Input({ required: true }) onReset!: () => void;

  configText = signal('');
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.configText.set(formatConfig(this.transitionConfig));
  }

  ngOnChanges(changes: SimpleChanges): void {
    const transitionConfigChange = changes['transitionConfig'];
    if (transitionConfigChange && !transitionConfigChange.firstChange) {
      this.configText.set(formatConfig(this.transitionConfig));
    }
  }

  onTextChange = (nextConfigText: string): void => {
    this.configText.set(nextConfigText);
    this.errorMessage.set(null);
  };

  onUpdateClick = (): void => {
    try {
      const newConfig = JSON.parse(this.configText());
      if (objectValidator(newConfig)) {
        if (objectValidator(newConfig.config)) {
          const mochartDemoConfig = buildMochartDemoConfig(newConfig.config);
          const { configValidation } = mochartDemoConfig;
          const { valid, errors, warnings } = configValidation;
          if (valid) {
            if (arrayValidator(newConfig.data) && !newConfig.data.some((aData: unknown) => !arrayValidator(aData))) {
              this.errorMessage.set(null);
              this.onUpdate(newConfig);
            }
            else {
              console.warn('Invalid Transition Config, data should be an array of arrays: ', newConfig.data);
              this.errorMessage.set('"data" should be an array of arrays');
            }
          }
          else {
            if (errors.length > 0) {
              console.warn('errors: ', errors);
            }
            if (warnings.length > 0) {
              console.warn('warnings: ', warnings);
            }
            this.errorMessage.set('Invalid chart config — details in the browser console');
          }
        }
        else {
          console.warn('Invalid Transition Config, config should be an object: ', newConfig.config);
          this.errorMessage.set('"config" should be an object');
        }
      }
      else {
        console.warn('Invalid Transition Config, should be an object: ', this.configText());
        this.errorMessage.set('Transition config should be an object');
      }
    }
    catch (error) {
      console.warn('Invalid Transition Config JSON: ', this.configText());
      this.errorMessage.set('Invalid JSON');
    }
  };

  get jsonError(): string | null {
    try {
      JSON.parse(this.configText());
      return null;
    }
    catch (error) {
      return 'Invalid JSON';
    }
  }

  get footerError(): string | null {
    return this.jsonError ?? this.errorMessage();
  }
}
