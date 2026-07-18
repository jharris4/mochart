import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import { LightElement } from '../misc/LightElement';
import { icon } from '../misc/templates';

import type { DemoData, DemoMode, OnDemoModeChanged, OnDemoChanged } from '../../types';

const modeCaptions: Record<string, string> = {
  single: 'Single: one chart with editable config, data, groups and series — pick a demo below.',
  multi: 'Multi: a grid of charts stepping through generated datasets together — pick a demo below.',
  random: 'Random: a chart fed by a seeded random data generator — pick a demo below.',
  transition: 'Transition: animates a chart between datasets — pick a demo below.',
  rotation: 'Rotation: a grid of every chart config variation.'
};

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
                      title="One chart with editable config, data, groups and series"
                      @click=${() => this.onDemoModeChanged('single', this.demoId)}>
                ${icon({ size: 'lg', name: 'pen-to-square' })} Single
              </button>
              <button type="button" class=${'btn btn-' + (isMulti ? 'primary' : 'secondary')} ?disabled=${isMulti}
                      title="A grid of charts stepping through datasets together"
                      @click=${() => this.onDemoModeChanged('multi', this.demoId)}>
                ${icon({ size: 'lg', name: 'window-restore' })} Multi
              </button>
              <button type="button" class=${'btn btn-' + (isRandom ? 'primary' : 'secondary')} ?disabled=${isRandom}
                      title="A chart fed by a seeded random data generator"
                      @click=${() => this.onDemoModeChanged('random', this.demoId)}>
                ${icon({ size: 'lg', name: 'shuffle' })} Random
              </button>
              <button type="button" class="btn btn-secondary"
                      title="Animate a chart between two datasets"
                      @click=${() => this.onDemoModeChanged('transition', this.demoId)}>
                ${icon({ size: 'lg', name: 'right-left' })} Transition
              </button>
              <button type="button" class="btn btn-secondary"
                      title="A grid of chart config variations"
                      @click=${() => this.onDemoModeChanged('rotation', this.demoId)}>
                ${icon({ size: 'lg', name: 'repeat' })} Rotation
              </button>
            </div>
          </div>
          <div class="form-group" style="margin-left: 10px;">
            <div class="btn-toolbar" role="toolbar">
              <button type="button" class=${'btn btn-' + (this.isTestMode ? 'primary' : 'secondary')} aria-pressed=${String(this.isTestMode)}
                      title="Show the test demos (intentionally invalid configs for exercising error handling)"
                      @click=${this.onTestModeToggle}>
                ${icon({ size: 'lg', name: 'flask' })} Test Demos
              </button>
            </div>
          </div>
        </form>
        ${modeCaptions[this.demoMode] ? html`<div class="mochart-demo-caption">${modeCaptions[this.demoMode]}</div>` : null}
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
