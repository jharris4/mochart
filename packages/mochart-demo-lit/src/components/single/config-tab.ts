import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { PropertyValues } from 'lit';

import { buildMochartDemoConfig, copyDemoConfig, formatMochartDemoConfig, parseConfig, slowAnimationConfig, toggleConfigProperty, toggleConfigSection } from '@mochart/demo-common';

import type { DemoConfigView } from '@mochart/demo-common';

import { LightElement } from '../misc/LightElement';
import { textAreaContent, buttonWithTooltip, icon } from '../misc/templates';

import type { DemoConfig, MochartDemoConfig } from '../../types';

@customElement('config-tab')
export class ConfigTab extends LightElement {
  @property({ attribute: false }) active = false;
  @property({ attribute: false }) config!: DemoConfig;
  @property({ attribute: false }) onConfigChange!: (config: DemoConfig) => void;
  @property({ attribute: false }) onConfigReset!: () => void;

  @state() private showDefaults = false;
  @state() private mochartDemoConfig!: MochartDemoConfig;
  @state() private demoConfig!: DemoConfigView;
  @state() private configText = '';
  @state() private errorMessage: string | null = null;

  override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('config')) {
      this.mochartDemoConfig = buildMochartDemoConfig(this.config);
      this.demoConfig = copyDemoConfig(this.mochartDemoConfig);
      this.configText = formatMochartDemoConfig(this.demoConfig, this.hasUpdated ? this.showDefaults : false);
    }
  }

  private onTextChange = (nextConfigText: string): void => {
    this.configText = nextConfigText;
    this.errorMessage = null;
  };

  private resetConfig = (): void => {
    this.onConfigReset();
  };

  private updateShowDefaults(nextShowDefaults: boolean): void {
    try {
      const newConfig = JSON.parse(this.configText);
      const newMochartDemoConfig = buildMochartDemoConfig(newConfig);
      const { configValidation } = newMochartDemoConfig;
      const { valid } = configValidation;
      if (valid) {
        this.showDefaults = nextShowDefaults;
        this.configText = formatMochartDemoConfig(newMochartDemoConfig, nextShowDefaults);
        this.errorMessage = null;
      }
      else {
        const { errors, warnings } = configValidation;
        if (errors.length > 0) {
          console.warn('errors: ', errors);
        }
        if (warnings.length > 0) {
          console.warn('warnings: ', warnings);
        }
        this.errorMessage = 'Invalid chart config — details in the browser console';
      }
    }
    catch (error) {
      console.warn('Invalid Chart Config JSON: ' + this.configText);
      this.errorMessage = 'Invalid JSON';
    }
  }

  private toggleConfigDefaults = (): void => {
    this.updateShowDefaults(!this.showDefaults);
  };

  private toggleConfigInverted = (): void => {
    this.demoConfig = toggleConfigProperty(this.demoConfig, 'plotConfig', 'inverted', true) ?? this.demoConfig;
    this.configText = formatMochartDemoConfig(this.demoConfig, this.showDefaults);
  };

  private toggleConfigAnimationSlow = (): void => {
    this.demoConfig = toggleConfigSection(this.mochartDemoConfig, this.demoConfig, 'animationConfig', slowAnimationConfig) ?? this.demoConfig;
    this.configText = formatMochartDemoConfig(this.demoConfig, this.showDefaults);
  };

  private applyConfig = (): void => {
    const newConfig = parseConfig(this.configText);
    if (newConfig !== null) {
      this.onConfigChange(newConfig);
    }
  };

  // Live JSON validity — disables Apply and shows an inline hint while the
  // editor holds unparseable text.
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
    const inverted = this.demoConfig.configWithDefaults.plotConfig.inverted;
    const invertedIcon = inverted ? 'chart-bar' : 'chart-column';
    const slow = this.demoConfig.configWithDefaults.animationConfig === slowAnimationConfig;
    const slowIcon = slow ? 'hourglass' : 'hourglass-end';
    const jsonError = this.jsonError;
    const footerError = jsonError ?? this.errorMessage;
    return html`<div class=${'mochart-demo-tab-container col config' + (this.active ? ' active' : '')}>
      <div class="mochart-demo-tab-content">
        ${textAreaContent({ value: this.configText, onChange: this.onTextChange })}
      </div>
      <div class="mochart-demo-tab-footer">
        <div class="btn-toolbar" role="toolbar">
          ${buttonWithTooltip(
            { id: 'config-reset', label: 'Reset', tooltipText: "Restore this demo's original config", tooltipPlacement: 'top-start', onClick: this.resetConfig, ariaLabel: 'Reset' },
            icon({ size: 'lg', fixedWidth: true, name: 'arrow-rotate-left' })
          )}
          ${buttonWithTooltip(
            { id: 'config-defaults', label: 'Defaults', pressed: this.showDefaults, tooltipText: 'Show or hide the default config values merged into the JSON', tooltipPlacement: 'top-start', onClick: this.toggleConfigDefaults, ariaLabel: 'Toggle Defaults' },
            icon({ size: 'lg', fixedWidth: true, name: this.showDefaults ? 'eye' : 'eye-slash' })
          )}
          ${buttonWithTooltip(
            { id: 'config-inverted', label: 'Invert', pressed: !!inverted, tooltipText: 'Swap the chart between vertical and horizontal orientation', tooltipPlacement: 'top-start', onClick: this.toggleConfigInverted, ariaLabel: 'Toggle Inverted' },
            icon({ size: 'lg', fixedWidth: true, name: invertedIcon })
          )}
          ${buttonWithTooltip(
            { id: 'config-animate-slow', label: 'Slow', pressed: slow, tooltipText: 'Slow all animations down so transitions are easy to watch', tooltipPlacement: 'top-start', onClick: this.toggleConfigAnimationSlow, ariaLabel: 'Toggle Slow' },
            icon({ size: 'lg', fixedWidth: true, name: slowIcon })
          )}
          ${buttonWithTooltip(
            { id: 'config-apply', label: 'Apply', disabled: jsonError !== null, tooltipText: 'Apply this config — the chart updates when you return to the Chart tab', tooltipPlacement: 'top-start', onClick: this.applyConfig, ariaLabel: 'Apply' },
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
    'config-tab': ConfigTab;
  }
}
