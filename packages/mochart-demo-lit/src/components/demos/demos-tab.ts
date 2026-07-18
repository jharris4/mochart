import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import { demoText } from '@mochart/demo-common';

import { LightElement } from '../misc/LightElement';
import { icon } from '../misc/templates';

import type { DemoData, DemoMode, OnDemoModeChanged, OnDemoChanged } from '../../types';

const modeCaptions = demoText.demosTab.modeCaptions;

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
            <span class="form-control-plaintext">${demoText.demosTab.demoModeLabel}&nbsp;</span>
          </div>
          <div class="form-group">
            <div class="btn-toolbar" role="toolbar">
              <button type="button" class=${'btn btn-' + (isSingle ? 'primary' : 'secondary')} ?disabled=${isSingle}
                      title=${demoText.demosTab.modes.single.title}
                      @click=${() => this.onDemoModeChanged('single', this.demoId)}>
                ${icon({ size: 'lg', name: 'pen-to-square' })} ${demoText.demosTab.modes.single.label}
              </button>
              <button type="button" class=${'btn btn-' + (isMulti ? 'primary' : 'secondary')} ?disabled=${isMulti}
                      title=${demoText.demosTab.modes.multi.title}
                      @click=${() => this.onDemoModeChanged('multi', this.demoId)}>
                ${icon({ size: 'lg', name: 'window-restore' })} ${demoText.demosTab.modes.multi.label}
              </button>
              <button type="button" class=${'btn btn-' + (isRandom ? 'primary' : 'secondary')} ?disabled=${isRandom}
                      title=${demoText.demosTab.modes.random.title}
                      @click=${() => this.onDemoModeChanged('random', this.demoId)}>
                ${icon({ size: 'lg', name: 'shuffle' })} ${demoText.demosTab.modes.random.label}
              </button>
              <button type="button" class="btn btn-secondary"
                      title=${demoText.demosTab.modes.transition.title}
                      @click=${() => this.onDemoModeChanged('transition', this.demoId)}>
                ${icon({ size: 'lg', name: 'right-left' })} ${demoText.demosTab.modes.transition.label}
              </button>
              <button type="button" class="btn btn-secondary"
                      title=${demoText.demosTab.modes.rotation.title}
                      @click=${() => this.onDemoModeChanged('rotation', this.demoId)}>
                ${icon({ size: 'lg', name: 'repeat' })} ${demoText.demosTab.modes.rotation.label}
              </button>
            </div>
          </div>
          <div class="form-group" style="margin-left: 10px;">
            <div class="btn-toolbar" role="toolbar">
              <button type="button" class=${'btn btn-' + (this.isTestMode ? 'primary' : 'secondary')} aria-pressed=${String(this.isTestMode)}
                      title=${demoText.demosTab.testDemos.title}
                      @click=${this.onTestModeToggle}>
                ${icon({ size: 'lg', name: 'flask' })} ${demoText.demosTab.testDemos.label}
              </button>
            </div>
          </div>
        </form>
        ${modeCaptions[this.demoMode] ? html`<div class="mochart-demo-caption">${modeCaptions[this.demoMode]}</div>` : null}
      </div>
      <div class="mochart-demo-list-container">
        <div class="mochart-demo-list">
          <div class="list-group">
            ${repeat(theDemoIds, currentDemoId => currentDemoId, currentDemoId => html`<button
                type="button"
                class=${'list-group-item list-group-item-action' + (currentDemoId === this.demoId ? ' active' : '')}
                @click=${() => this.onDemoChange(currentDemoId)}>
              <span class="mochart-demo-item-title">${this.demoData.demoObjectMap[currentDemoId].title}</span>
              ${this.demoData.demoObjectMap[currentDemoId].description !== void 0
                ? html`<span class="mochart-demo-item-description">${this.demoData.demoObjectMap[currentDemoId].description}</span>`
                : nothing}
            </button>`)}
          </div>
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
