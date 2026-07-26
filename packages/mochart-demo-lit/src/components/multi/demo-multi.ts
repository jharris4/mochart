import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { PropertyValues } from 'lit';

import { demoText } from '@mochart/demo-common';
import type { SwitchableDemoMode } from '@mochart/demo-common';

import { LightElement } from '../misc/LightElement';
import { backToDemosButton, modeSwitcher, siteRootButton } from '../misc/mode-switcher';
import '../misc/theme-toggle-button';

import './charts-tab';
import '../misc/error-tab';

import type { DemoData } from '../../types';

@customElement('demo-multi')
export class DemoMulti extends LightElement {
  @property({ attribute: false }) demoData!: DemoData;
  @property({ attribute: false }) initialDemoId!: string;
  @property({ attribute: false }) siteRootUrl: string | undefined = void 0;
  @property({ attribute: false }) onModeChanged!: (nextDemoMode: SwitchableDemoMode) => void;
  @property({ attribute: false }) onBackToDemos!: () => void;

  @state() private demoId = '';

  override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('initialDemoId')) {
      this.demoId = this.initialDemoId;
    }
  }

  override render(): unknown {
    return html`<div class="mochart-demo-container multi">
      <div class="mochart-demo-tabs-container">
        <div class="mochart-demo-nav-group">
          ${siteRootButton(this.siteRootUrl)}
          ${backToDemosButton(this.onBackToDemos)}
          <ul class="demo-tabs">
            <li class="demo-tab-item">
              <button type="button" class="demo-tab active">${demoText.tabs.chart}</button>
            </li>
          </ul>
        </div>
        <div class="mochart-demo-nav-group">
          ${modeSwitcher({ demoMode: 'multi', onModeChanged: this.onModeChanged })}
          <theme-toggle-button></theme-toggle-button>
        </div>
      </div>
      <div class="mochart-demo-content-pane">
        <div class="mochart-demo-content">
          <error-tab .active=${true} .content=${() =>
            html`<charts-tab .active=${true} .demoObject=${this.demoData.demoObjectMap[this.demoId]}></charts-tab>`}></error-tab>
        </div>
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'demo-multi': DemoMulti;
  }
}
