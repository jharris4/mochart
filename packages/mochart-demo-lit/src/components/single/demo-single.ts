import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { PropertyValues } from 'lit';

import { LightElement } from '../misc/LightElement';

import '../demos/demos-tab';
import './chart-tab';
import './config-tab';
import './data-tab';
import '../misc/error-tab';

import type { DemoData, DemoMode, DemoConfig, DataRow, OnDemoModeChanged, OnDemoChanged } from '../../types';

type DataError = string | boolean | null;

const eventKeyChart = 1;
const eventKeyConfig = 2;
const eventKeyData = 3;
const eventKeyDemo = 4;

function getActiveKeyForInitialDemoId(initialDemoId: string): number {
  return initialDemoId === 'demos' ? eventKeyDemo : eventKeyChart;
}

@customElement('demo-single')
export class DemoSingle extends LightElement {
  @property({ attribute: false }) demoData!: DemoData;
  @property({ attribute: false }) demoMode!: DemoMode;
  @property({ attribute: false }) initialDemoId!: string;
  @property({ attribute: false }) onDemoModeChanged!: OnDemoModeChanged;
  @property({ attribute: false }) onDemoChanged!: OnDemoChanged;

  @state() private activeKey = eventKeyChart;
  @state() private demoId = '';
  // Config/data edits made on the Config/Data tabs stay "pending" until the
  // Chart tab is shown again (so the chart animates one combined change).
  private pendingConfig: DemoConfig | null = null;
  private pendingData: DataRow[] | null = null;
  private pendingDataError: DataError = false;
  @state() private config: DemoConfig | null = null;
  @state() private data: DataRow[] | null = null;
  @state() private dataError: DataError = false;
  @state() private viewingConfig: DemoConfig | null = null;
  @state() private viewingData: DataRow[] | null = null;
  @state() private viewingDataError: DataError = false;

  override willUpdate(changed: PropertyValues<this>): void {
    if (!changed.has('initialDemoId')) {
      return;
    }
    const initialDemoId = this.initialDemoId;
    if (!this.hasUpdated) {
      this.activeKey = getActiveKeyForInitialDemoId(initialDemoId);
      this.demoId = initialDemoId;
      this.config = initialDemoId !== 'demos' ? this.demoData.demoObjectMap[initialDemoId].config : null;
      this.data = initialDemoId !== 'demos' ? this.demoData.demoObjectMap[initialDemoId].data : null;
      this.dataError = false;
      this.viewingConfig = this.config;
      this.viewingData = this.data;
      this.viewingDataError = false;
      return;
    }
    // When the routed demo changes, reload its config/data (and promote them
    // straight to the visible chart, matching the react demo's lifecycle).
    this.activeKey = getActiveKeyForInitialDemoId(initialDemoId);
    this.demoId = initialDemoId;
    if (initialDemoId === 'demos') {
      this.config = null;
      this.data = null;
      this.dataError = null;
      this.viewingConfig = null;
      this.viewingData = null;
    }
    else {
      this.config = this.demoData.demoObjectMap[initialDemoId].config;
      this.data = this.demoData.demoObjectMap[initialDemoId].data;
      this.dataError = null;
      this.pendingConfig = this.config;
      this.pendingData = this.data;
      this.chartShown();
    }
  }

  private chartShown(): void {
    if (this.pendingConfig !== null || this.pendingData !== null || this.pendingDataError !== null) {
      if (this.pendingConfig !== null) {
        this.viewingConfig = this.pendingConfig;
        this.pendingConfig = null;
      }
      if (this.pendingData !== null) {
        this.viewingData = this.pendingData;
        this.pendingData = null;
      }
      if (this.pendingDataError !== null) {
        this.viewingDataError = this.pendingDataError;
        this.pendingDataError = null;
      }
    }
  }

  private handleSelect(nextActiveKey: number): void {
    const previousActiveKey = this.activeKey;
    this.activeKey = nextActiveKey;
    if (nextActiveKey === eventKeyChart && previousActiveKey !== eventKeyChart) {
      this.chartShown();
    }
  }

  private onConfigChange = (nextPendingConfig: DemoConfig): void => {
    this.pendingConfig = nextPendingConfig;
  };

  private onConfigReset = (): void => {
    const resetConfig = { ...this.demoData.demoObjectMap[this.demoId].config };
    this.pendingConfig = resetConfig;
    this.config = resetConfig;
  };

  private onDataChange = (nextPendingData: DataRow[]): void => {
    this.pendingData = nextPendingData;
    this.pendingDataError = false;
  };

  private onDataError = (errorMessage: string): void => {
    this.pendingDataError = errorMessage;
  };

  private onDataReset = (): void => {
    // give it a new array reference so children know to update
    this.pendingData = this.demoData.demoObjectMap[this.demoId].data.slice();
    this.pendingDataError = false;
  };

  private onDemoChange = (nextDemoId: string): void => {
    this.onDemoChanged(nextDemoId);
  };

  private renderTab(eventKey: number, label: string): unknown {
    return html`<li class="nav-item">
      <button type="button" class=${'nav-link' + (this.activeKey === eventKey ? ' active' : '')}
              @click=${() => this.handleSelect(eventKey)}>
        ${label}
      </button>
    </li>`;
  }

  override render(): unknown {
    const demosTab = html`<demos-tab .active=${this.activeKey === eventKeyDemo} .demoData=${this.demoData} .demoMode=${this.demoMode} .demoId=${this.demoId}
        .onDemoModeChanged=${this.onDemoModeChanged} .onDemoChange=${this.onDemoChange}></demos-tab>`;
    return html`<div class="mochart-demo-container">
      <div class="mochart-demo-tabs-container">
        <ul class="nav nav-tabs">
          ${this.renderTab(eventKeyDemo, 'Demos')}
          ${this.renderTab(eventKeyChart, 'Chart')}
          ${this.renderTab(eventKeyConfig, 'Config')}
          ${this.renderTab(eventKeyData, 'Data')}
        </ul>
      </div>
      ${this.initialDemoId === 'demos'
        ? html`<div class="mochart-demo-content-pane">
            <div class="mochart-demo-content single-tab">${demosTab}</div>
          </div>`
        : html`<div class="mochart-demo-content-pane">
            <div class="mochart-demo-content">
              <error-tab .active=${this.activeKey === eventKeyDemo} .content=${() => demosTab}></error-tab>
              <error-tab .active=${this.activeKey === eventKeyChart} .content=${() =>
                html`<chart-tab .active=${this.activeKey === eventKeyChart} .config=${this.viewingConfig} .data=${this.viewingData} .dataError=${this.viewingDataError}></chart-tab>`}></error-tab>
              <error-tab .active=${this.activeKey === eventKeyConfig} .content=${() =>
                html`<config-tab .active=${this.activeKey === eventKeyConfig} .config=${this.config!} .onConfigChange=${this.onConfigChange} .onConfigReset=${this.onConfigReset}></config-tab>`}></error-tab>
              <error-tab .active=${this.activeKey === eventKeyData} .content=${() =>
                html`<data-tab .active=${this.activeKey === eventKeyData} .config=${this.viewingConfig!} .data=${this.data!}
                    .onDataChange=${this.onDataChange} .onDataError=${this.onDataError} .onDataReset=${this.onDataReset}></data-tab>`}></error-tab>
            </div>
          </div>`}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'demo-single': DemoSingle;
  }
}
