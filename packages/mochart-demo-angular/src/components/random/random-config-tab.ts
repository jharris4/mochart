import { Component, Input, signal } from '@angular/core';
import type { OnChanges, OnInit, SimpleChanges } from '@angular/core';

import { TextAreaContent } from '../misc/text-area-content';
import { ButtonWithTooltip } from '../misc/button-with-tooltip';
import { Icon } from '../misc/icon';

import { formatRandomConfig, validateRandomConfig } from '@mochart/demo-common';

import type { RandomConfigWithValid } from '../../types';

@Component({
  selector: 'app-random-config-tab',
  imports: [TextAreaContent, ButtonWithTooltip, Icon],
  styles: [':host { display: contents; }'],
  template: `
    <div [class]="'mochart-demo-tab-container col config' + (active ? ' active' : '')">
      <div class="mochart-demo-tab-content">
        <app-text-area-content [value]="configText()" [onChange]="onTextChange" />
      </div>
      <div class="mochart-demo-tab-footer">
        <div class="btn-toolbar" role="toolbar">
          <app-button-with-tooltip id="config-reset" label="Reset" tooltipText="Restore the original random generator config" tooltipPlacement="top-start"
                                   [onClick]="onReset" aria-label="Reset">
            <app-icon size="lg" [fixedWidth]="true" name="arrow-rotate-left" />
          </app-button-with-tooltip>
          <app-button-with-tooltip id="config-apply" label="Apply" [disabled]="jsonError !== null"
                                   tooltipText="Apply this generator config to the random chart" tooltipPlacement="top-start"
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
export class RandomConfigTab implements OnInit, OnChanges {
  @Input() active = false;
  @Input({ required: true }) randomConfig!: RandomConfigWithValid;
  @Input({ required: true }) onUpdate!: (config: RandomConfigWithValid) => void;
  @Input({ required: true }) onReset!: () => void;

  configText = signal('');
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.configText.set(formatRandomConfig(this.randomConfig));
  }

  ngOnChanges(changes: SimpleChanges): void {
    const randomConfigChange = changes['randomConfig'];
    if (randomConfigChange && !randomConfigChange.firstChange) {
      this.configText.set(formatRandomConfig(this.randomConfig));
    }
  }

  onTextChange = (nextConfigText: string): void => {
    this.configText.set(nextConfigText);
    this.errorMessage.set(null);
  };

  onUpdateClick = (): void => {
    try {
      const newConfig = JSON.parse(this.configText());
      newConfig.valid = validateRandomConfig(newConfig);
      this.errorMessage.set(newConfig.valid ? null : 'Config has invalid values — details in the browser console');
      this.onUpdate(newConfig);
    }
    catch (error) {
      console.warn('Invalid Random Config JSON: ' + this.configText());
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
