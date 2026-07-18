import { Component, Input, signal } from '@angular/core';
import type { OnChanges, OnInit, SimpleChanges } from '@angular/core';

import { buildMochartDemoConfig } from '@mochart/demo-common';

import { TextAreaContent } from '../misc/text-area-content';
import { ButtonWithTooltip } from '../misc/button-with-tooltip';
import { Icon } from '../misc/icon';

import type { DemoConfig, MochartDemoConfig } from '../../types';

// The with/without-defaults config views the editor toggles between. Config
// sections are intentionally loose (`any`) — they are arbitrary user JSON.
interface DemoConfigView {
  configWithDefaults: Record<string, any>;
  configWithoutDefaults: Record<string, any>;
}

const slowAnimationConfig = {
  "animate": true,
  "initialDuration": 5000,
  "expansionDuration": 3000,
  "valueChangeDuration": 5000,
  "collapseDuration": 3000,
  "focusDuration": 2500
};

function formatConfig(config: unknown): string {
  return JSON.stringify(config, null, '\t');
}

function formatMochartDemoConfig(demoConfig: DemoConfigView, showDefaults: boolean): string {
  const { configWithDefaults, configWithoutDefaults } = demoConfig;
  return formatConfig(showDefaults ? configWithDefaults : configWithoutDefaults);
}

function copyDemoConfig(demoConfig: DemoConfigView | MochartDemoConfig): DemoConfigView {
  const { configWithDefaults, configWithoutDefaults } = demoConfig;
  return JSON.parse(JSON.stringify({ configWithDefaults, configWithoutDefaults }));
}

function parseConfig(configText: string): DemoConfig | null {
  try {
    return JSON.parse(configText);
  }
  catch (error) {
    console.warn('Invalid Chart Config JSON: ' + configText);
    return null;
  }
}

@Component({
  selector: 'app-config-tab',
  imports: [TextAreaContent, ButtonWithTooltip, Icon],
  styles: [':host { display: contents; }'],
  template: `
    <div [class]="'mochart-demo-tab-container col config' + (active ? ' active' : '')">
      <div class="mochart-demo-tab-content">
        <app-text-area-content [value]="configText()" [onChange]="onTextChange" />
      </div>
      <div class="mochart-demo-tab-footer">
        <div class="btn-toolbar" role="toolbar">
          <app-button-with-tooltip id="config-reset" label="Reset" tooltipText="Restore this demo's original config" tooltipPlacement="top-start"
                                   [onClick]="resetConfig" aria-label="Reset">
            <app-icon size="lg" [fixedWidth]="true" name="arrow-rotate-left" />
          </app-button-with-tooltip>
          <app-button-with-tooltip id="config-defaults" label="Defaults" [pressed]="showDefaults()"
                                   tooltipText="Show or hide the default config values merged into the JSON" tooltipPlacement="top-start"
                                   [onClick]="toggleConfigDefaults" aria-label="Toggle Defaults">
            <app-icon size="lg" [fixedWidth]="true" [name]="showDefaults() ? 'eye' : 'eye-slash'" />
          </app-button-with-tooltip>
          <app-button-with-tooltip id="config-inverted" label="Invert" [pressed]="!!inverted"
                                   tooltipText="Swap the chart between vertical and horizontal orientation" tooltipPlacement="top-start"
                                   [onClick]="toggleConfigInverted" aria-label="Toggle Inverted">
            <app-icon size="lg" [fixedWidth]="true" [name]="invertedIcon" />
          </app-button-with-tooltip>
          <app-button-with-tooltip id="config-animate-slow" label="Slow" [pressed]="slow"
                                   tooltipText="Slow all animations down so transitions are easy to watch" tooltipPlacement="top-start"
                                   [onClick]="toggleConfigAnimationSlow" aria-label="Toggle Slow">
            <app-icon size="lg" [fixedWidth]="true" [name]="slowIcon" />
          </app-button-with-tooltip>
          <app-button-with-tooltip id="config-apply" label="Apply" [disabled]="jsonError !== null"
                                   tooltipText="Apply this config — the chart updates when you return to the Chart tab" tooltipPlacement="top-start"
                                   [onClick]="applyConfig" aria-label="Apply">
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
export class ConfigTab implements OnInit, OnChanges {
  @Input() active = false;
  @Input({ required: true }) config!: DemoConfig;
  @Input({ required: true }) onConfigChange!: (config: DemoConfig) => void;
  @Input({ required: true }) onConfigReset!: () => void;

  showDefaults = signal(false);
  errorMessage = signal<string | null>(null);
  mochartDemoConfig = signal<MochartDemoConfig | null>(null);
  demoConfig = signal<DemoConfigView | null>(null);
  configText = signal('');

  ngOnInit(): void {
    this.mochartDemoConfig.set(buildMochartDemoConfig(this.config));
    this.demoConfig.set(copyDemoConfig(this.mochartDemoConfig()!));
    this.configText.set(formatMochartDemoConfig(this.demoConfig()!, false));
  }

  ngOnChanges(changes: SimpleChanges): void {
    const configChange = changes['config'];
    if (configChange && !configChange.firstChange) {
      this.mochartDemoConfig.set(buildMochartDemoConfig(this.config));
      this.demoConfig.set(copyDemoConfig(this.mochartDemoConfig()!));
      this.configText.set(formatMochartDemoConfig(this.demoConfig()!, this.showDefaults()));
    }
  }

  onTextChange = (nextConfigText: string): void => {
    this.configText.set(nextConfigText);
    this.errorMessage.set(null);
  };

  resetConfig = (): void => {
    this.onConfigReset();
  };

  private updateShowDefaults(nextShowDefaults: boolean): void {
    try {
      const newConfig = JSON.parse(this.configText());
      const newMochartDemoConfig = buildMochartDemoConfig(newConfig);
      const { configValidation } = newMochartDemoConfig;
      const { valid } = configValidation;
      if (valid) {
        this.showDefaults.set(nextShowDefaults);
        this.configText.set(formatMochartDemoConfig(newMochartDemoConfig, nextShowDefaults));
        this.errorMessage.set(null);
      }
      else {
        const { errors, warnings } = configValidation;
        if (errors.length > 0) {
          console.warn('errors: ', errors);
        }
        if (warnings.length > 0) {
          console.warn('warnings: ', warnings);
        }
        this.errorMessage.set('Invalid chart config — details in the browser console');
      }
    }
    catch (error) {
      console.warn('Invalid Chart Config JSON: ' + this.configText());
      this.errorMessage.set('Invalid JSON');
    }
  }

  toggleConfigDefaults = (): void => {
    this.updateShowDefaults(!this.showDefaults());
  };

  private toggleConfigProperty(currentDemoConfig: DemoConfigView | null, section: string, key: string, defaultValue: unknown): DemoConfigView | undefined {
    if (currentDemoConfig) {
      let { configWithDefaults, configWithoutDefaults } = currentDemoConfig;
      configWithDefaults = { ...configWithDefaults };
      configWithoutDefaults = { ...configWithoutDefaults };
      const sectionConfig = configWithoutDefaults[section];
      if (!sectionConfig) {
        configWithoutDefaults[section] = { [key]: defaultValue };
        configWithDefaults[section] = { ...configWithDefaults[section], [key]: defaultValue };
      }
      else {
        configWithoutDefaults[section] = { ...sectionConfig, [key]: !sectionConfig[key] };
        configWithDefaults[section] = { ...configWithDefaults[section], [key]: !sectionConfig[key] };
      }
      return {
        configWithDefaults, configWithoutDefaults
      };
    }
    return undefined;
  }

  private toggleConfigSection(currentMochartDemoConfig: MochartDemoConfig | null, currentDemoConfig: DemoConfigView | null, section: string, defaultSection: unknown): DemoConfigView | undefined {
    if (currentMochartDemoConfig && currentDemoConfig) {
      let { configWithDefaults, configWithoutDefaults } = currentDemoConfig;
      configWithDefaults = { ...configWithDefaults };
      configWithoutDefaults = { ...configWithoutDefaults };
      const sectionConfig = configWithoutDefaults[section];
      if (!sectionConfig) {
        configWithoutDefaults[section] = defaultSection;
        configWithDefaults[section] = defaultSection;
      }
      else {
        configWithoutDefaults[section] = configWithoutDefaults[section] === defaultSection ? currentMochartDemoConfig.configWithoutDefaults[section] : defaultSection;
        configWithDefaults[section] = configWithDefaults[section] === defaultSection ? currentMochartDemoConfig.configWithDefaults[section] : defaultSection;
      }
      return {
        configWithDefaults, configWithoutDefaults
      };
    }
    return undefined;
  }

  toggleConfigInverted = (): void => {
    this.demoConfig.set(this.toggleConfigProperty(this.demoConfig(), 'plotConfig', 'inverted', true) ?? this.demoConfig());
    this.configText.set(formatMochartDemoConfig(this.demoConfig()!, this.showDefaults()));
  };

  toggleConfigAnimationSlow = (): void => {
    this.demoConfig.set(this.toggleConfigSection(this.mochartDemoConfig(), this.demoConfig(), 'animationConfig', slowAnimationConfig) ?? this.demoConfig());
    this.configText.set(formatMochartDemoConfig(this.demoConfig()!, this.showDefaults()));
  };

  applyConfig = (): void => {
    const newConfig = parseConfig(this.configText());
    if (newConfig !== null) {
      this.onConfigChange(newConfig);
    }
  };

  get inverted(): boolean {
    return !!this.demoConfig()?.configWithDefaults['plotConfig']?.inverted;
  }

  get invertedIcon(): string {
    return this.inverted ? 'chart-bar' : 'chart-column';
  }

  get slow(): boolean {
    return this.demoConfig()?.configWithDefaults['animationConfig'] === slowAnimationConfig;
  }

  get slowIcon(): string {
    return this.slow ? 'hourglass' : 'hourglass-end';
  }

  // Live JSON validity — disables Apply and shows an inline hint while the
  // editor holds unparseable text.
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
