import { Component, Input, signal } from '@angular/core';
import type { OnChanges, OnInit, SimpleChanges } from '@angular/core';

import { applyTransitionConfigEdit, buildMochartDemoConfig, formatTransitionConfig } from '@mochart/demo-common';

import { TextAreaContent } from '../misc/text-area-content';
import { ButtonWithTooltip } from '../misc/button-with-tooltip';
import { Icon } from '../misc/icon';

import type { TransitionConfig } from '../../types';

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
    this.configText.set(formatTransitionConfig(this.transitionConfig));
  }

  ngOnChanges(changes: SimpleChanges): void {
    const transitionConfigChange = changes['transitionConfig'];
    if (transitionConfigChange && !transitionConfigChange.firstChange) {
      this.configText.set(formatTransitionConfig(this.transitionConfig));
    }
  }

  onTextChange = (nextConfigText: string): void => {
    this.configText.set(nextConfigText);
    this.errorMessage.set(null);
  };

  onUpdateClick = (): void => {
    const result = applyTransitionConfigEdit(this.configText());
    if (result.ok) {
      this.errorMessage.set(null);
      this.onUpdate(result.config);
    }
    else {
      this.errorMessage.set(result.errorMessage);
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
