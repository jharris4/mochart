import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import { LightElement } from '../misc/LightElement';
import { icon } from '../misc/templates';

import type { DemoData, DemoMode, OnDemoModeChanged, OnDemoChanged } from '../../types';

@customElement('demos-tab')
export class DemosTab extends LightElement {
  @property({ attribute: false }) active = false;
  @property({ attribute: false }) demoData!: DemoData;
  @property({ attribute: false }) demoMode!: DemoMode;
  @property({ attribute: false }) demoId!: string;
  @property({ attribute: false }) onDemoModeChanged!: OnDemoModeChanged;
  @property({ attribute: false }) onDemoChange!: OnDemoChanged;

  @state() private isTestMode = false;

  private onTestModeToggle = (): void => {
    this.isTestMode = !this.isTestMode;
  };

  override render(): unknown {
    const theDemoIds = this.isTestMode ? this.demoData.testDemoIds : this.demoData.demoIds;
    const isSingle = this.demoMode === 'single';
    const isMulti = this.demoMode === 'multi';
    const isRandom = this.demoMode === 'random';
    return html`<div class=${'mochart-demo-tab-container col demos' + (this.active ? ' active' : '')}>
      <div class="mochart-demo-modes-container">
        <form class="form-inline">
          <div class="form-group">
            <span class="form-control-plaintext">Demo Mode:&nbsp;</span>
          </div>
          <div class="form-group">
            <div class="btn-toolbar" role="toolbar">
              <button type="button" class=${'btn btn-' + (isSingle ? 'primary' : 'secondary')} ?disabled=${isSingle}
                      @click=${() => this.onDemoModeChanged('single', this.demoId)}>
                ${icon({ size: 'lg', name: 'edit' })} Single
              </button>
              <button type="button" class=${'btn btn-' + (isMulti ? 'primary' : 'secondary')} ?disabled=${isMulti}
                      @click=${() => this.onDemoModeChanged('multi', this.demoId)}>
                ${icon({ size: 'lg', name: 'window-restore' })} Multi
              </button>
              <button type="button" class=${'btn btn-' + (isRandom ? 'primary' : 'secondary')} ?disabled=${isRandom}
                      @click=${() => this.onDemoModeChanged('random', this.demoId)}>
                ${icon({ size: 'lg', name: 'random' })} Random
              </button>
              <button type="button" class="btn btn-secondary"
                      @click=${() => this.onDemoModeChanged('transition', this.demoId)}>
                ${icon({ size: 'lg', name: 'exchange' })} Transition
              </button>
              <button type="button" class="btn btn-secondary"
                      @click=${() => this.onDemoModeChanged('rotation', this.demoId)}>
                ${icon({ size: 'lg', name: 'repeat' })} Rotation
              </button>
            </div>
          </div>
          <div class="form-group" style="margin-left: 10px;">
            <div class="btn-toolbar" role="toolbar">
              <button type="button" class=${'btn btn-' + (this.isTestMode ? 'primary' : 'secondary')}
                      @click=${this.onTestModeToggle}>
                ${icon({ size: 'lg', name: 'edit' })} Test Demos
              </button>
            </div>
          </div>
        </form>
      </div>
      <div class="mochart-demo-list-container">
        <div class="mochart-demo-list">
          <ul class="list-group">
            ${repeat(theDemoIds, currentDemoId => currentDemoId, currentDemoId => html`<li
                class=${'list-group-item' + (currentDemoId === this.demoId ? ' active' : '')}
                role="button" tabindex="0"
                @click=${() => this.onDemoChange(currentDemoId)}
                @keydown=${(event: KeyboardEvent) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    this.onDemoChange(currentDemoId);
                  }
                }}>
              ${this.demoData.demoObjectMap[currentDemoId].title}
            </li>`)}
          </ul>
        </div>
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'demos-tab': DemosTab;
  }
}
