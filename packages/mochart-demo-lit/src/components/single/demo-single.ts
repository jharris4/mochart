import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { PropertyValues } from 'lit';

import { consumeSingleShareState, demoText } from '@mochart/demo-common';
import type { SwitchableDemoMode } from '@mochart/demo-common';

import { LightElement } from '../misc/LightElement';
import { backToDemosButton, modeSwitcher, siteRootButton } from '../misc/mode-switcher';
import '../misc/theme-toggle-button';

import './chart-tab';
import './config-tab';
import './data-tab';
import '../misc/error-tab';

import type { DemoData, DemoConfig, DataRow } from '../../types';

type DataError = string | boolean | null;

const eventKeyChart = 1;
const eventKeyConfig = 2;
const eventKeyData = 3;

@customElement('demo-single')
export class DemoSingle extends LightElement {
  @property({ attribute: false }) demoData!: DemoData;
  @property({ attribute: false }) initialDemoId!: string;
  @property({ attribute: false }) siteRootUrl: string | undefined = void 0;
  @property({ attribute: false }) onModeChanged!: (nextDemoMode: SwitchableDemoMode) => void;
  @property({ attribute: false }) onBackToDemos!: () => void;

  @state() private activeKey = eventKeyChart;
  @state() private demoId = '';
  // Config/data edits made on the Config/Data tabs stay "pending" until the
  // Chart tab is shown again (so the chart animates one combined change).
  // pendingConfig/pendingData are reactive so the Chart tab badge updates.
  @state() private pendingConfig: DemoConfig | null = null;
  @state() private pendingData: DataRow[] | null = null;
  private pendingDataError: DataError = false;
  @state() private config: DemoConfig | null = null;
  @state() private data: DataRow[] | null = null;
  @state() private viewingConfig: DemoConfig | null = null;
  @state() private viewingData: DataRow[] | null = null;
  @state() private viewingDataError: DataError = false;

  override willUpdate(changed: PropertyValues<this>): void {
    if (!changed.has('initialDemoId')) {
      return;
    }
    const initialDemoId = this.initialDemoId;
    if (!this.hasUpdated) {
      // A share link carries edited config/data in the URL hash; it overrides
      // the demo's own config/data for the initial mount only.
      const sharedState = consumeSingleShareState();
      this.activeKey = eventKeyChart;
      this.demoId = initialDemoId;
      this.config = sharedState?.config ?? this.demoData.demoObjectMap[initialDemoId].config;
      this.data = sharedState?.data ?? this.demoData.demoObjectMap[initialDemoId].data;
      this.viewingConfig = this.config;
      this.viewingData = this.data;
      this.viewingDataError = false;
      return;
    }
    // When the routed demo changes (history navigation between two demos),
    // reload its config/data and promote them straight to the visible chart.
    this.activeKey = eventKeyChart;
    this.demoId = initialDemoId;
    this.config = this.demoData.demoObjectMap[initialDemoId].config;
    this.data = this.demoData.demoObjectMap[initialDemoId].data;
    this.pendingConfig = this.config;
    this.pendingData = this.data;
    this.chartShown();
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

  // Applied config/data edits are held until the Chart tab is shown; badge the
  // Chart tab so it's visible that something is waiting there.
  private get hasPendingChanges(): boolean {
    return this.activeKey !== eventKeyChart && (this.pendingConfig !== null || this.pendingData !== null);
  }

  private renderTab(eventKey: number, label: string): unknown {
    const badge = eventKey === eventKeyChart && this.hasPendingChanges;
    return html`<li class="demo-tab-item">
      <button type="button" class=${'demo-tab' + (this.activeKey === eventKey ? ' active' : '')}
              title=${badge ? demoText.tabs.chartPendingTitle : nothing}
              @click=${() => this.handleSelect(eventKey)}>${label}${badge ? html`<span class="mochart-pending-badge" aria-hidden="true"></span>` : nothing}</button>
    </li>`;
  }

  override render(): unknown {
    return html`<div class="mochart-demo-container">
      <div class="mochart-demo-tabs-container">
        <div class="mochart-demo-nav-group">
          ${siteRootButton(this.siteRootUrl)}
          ${backToDemosButton(this.onBackToDemos)}
          <ul class="demo-tabs">
            ${this.renderTab(eventKeyChart, demoText.tabs.chart)}
            ${this.renderTab(eventKeyConfig, demoText.tabs.config)}
            ${this.renderTab(eventKeyData, demoText.tabs.data)}
          </ul>
        </div>
        <div class="mochart-demo-nav-group">
          ${modeSwitcher({ demoMode: 'single', onModeChanged: this.onModeChanged })}
          <theme-toggle-button></theme-toggle-button>
        </div>
      </div>
      <div class="mochart-demo-content-pane">
        <div class="mochart-demo-content">
          <error-tab .active=${this.activeKey === eventKeyChart} .content=${() =>
            html`<chart-tab .active=${this.activeKey === eventKeyChart} .config=${this.viewingConfig} .data=${this.viewingData} .dataError=${this.viewingDataError}></chart-tab>`}></error-tab>
          <error-tab .active=${this.activeKey === eventKeyConfig} .content=${() =>
            html`<config-tab .active=${this.activeKey === eventKeyConfig} .config=${this.config!} .onConfigChange=${this.onConfigChange} .onConfigReset=${this.onConfigReset}></config-tab>`}></error-tab>
          <error-tab .active=${this.activeKey === eventKeyData} .content=${() =>
            html`<data-tab .active=${this.activeKey === eventKeyData} .config=${this.viewingConfig!} .data=${this.data!}
                .onDataChange=${this.onDataChange} .onDataError=${this.onDataError} .onDataReset=${this.onDataReset}></data-tab>`}></error-tab>
        </div>
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'demo-single': DemoSingle;
  }
}
