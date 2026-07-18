import { Component, Input, signal } from '@angular/core';
import type { OnChanges, OnInit, SimpleChanges } from '@angular/core';

import { consumeShareState, demoText } from '@mochart/demo-common';

import { DemosTab } from '../demos/demos-tab';
import { ChartTab } from './chart-tab';
import { ConfigTab } from './config-tab';
import { DataTab } from './data-tab';
import { ErrorTab } from '../misc/error-tab';

import type { DemoData, DemoMode, DemoConfig, DataRow, OnDemoModeChanged, OnDemoChanged } from '../../types';

type DataError = string | boolean | null;

const eventKeyChart = 1;
const eventKeyConfig = 2;
const eventKeyData = 3;
const eventKeyDemo = 4;

function getActiveKeyForInitialDemoId(initialDemoId: string): number {
  return initialDemoId === 'demos' ? eventKeyDemo : eventKeyChart;
}

@Component({
  selector: 'app-demo-single',
  imports: [DemosTab, ChartTab, ConfigTab, DataTab, ErrorTab],
  styles: [':host { display: contents; }'],
  template: `
    <div class="mochart-demo-container">
      <div class="mochart-demo-tabs-container">
        <ul class="nav nav-tabs">
          <li class="nav-item">
            <button type="button" [class]="'nav-link' + (activeKey() === eventKeyDemo ? ' active' : '')"
                    (click)="handleSelect(eventKeyDemo)">
              {{ text.demos }}
            </button>
          </li>
          <li class="nav-item">
            <button type="button" [class]="'nav-link' + (activeKey() === eventKeyChart ? ' active' : '')"
                    [attr.title]="hasPendingChanges ? text.chartPendingTitle : null"
                    (click)="handleSelect(eventKeyChart)">
              {{ text.chart }}@if (hasPendingChanges) {<span class="mochart-pending-badge" aria-hidden="true"></span>}
            </button>
          </li>
          <li class="nav-item">
            <button type="button" [class]="'nav-link' + (activeKey() === eventKeyConfig ? ' active' : '')"
                    (click)="handleSelect(eventKeyConfig)">
              {{ text.config }}
            </button>
          </li>
          <li class="nav-item">
            <button type="button" [class]="'nav-link' + (activeKey() === eventKeyData ? ' active' : '')"
                    (click)="handleSelect(eventKeyData)">
              {{ text.data }}
            </button>
          </li>
        </ul>
      </div>
      @if (initialDemoId === 'demos') {
        <div class="mochart-demo-content-pane">
          <div class="mochart-demo-content single-tab">
            <app-demos-tab [active]="activeKey() === eventKeyDemo" [demoData]="demoData" [demoMode]="demoMode" [demoId]="demoId()"
                           [onDemoModeChanged]="onDemoModeChanged" [onDemoChange]="onDemoChange" />
          </div>
        </div>
      } @else {
        <div class="mochart-demo-content-pane">
          <div class="mochart-demo-content">
            <app-error-tab [active]="activeKey() === eventKeyDemo">
              <app-demos-tab [active]="activeKey() === eventKeyDemo" [demoData]="demoData" [demoMode]="demoMode" [demoId]="demoId()"
                             [onDemoModeChanged]="onDemoModeChanged" [onDemoChange]="onDemoChange" />
            </app-error-tab>
            <app-error-tab [active]="activeKey() === eventKeyChart">
              <app-chart-tab [active]="activeKey() === eventKeyChart" [config]="viewingConfig()" [data]="viewingData()" [dataError]="viewingDataError()" />
            </app-error-tab>
            <app-error-tab [active]="activeKey() === eventKeyConfig">
              <app-config-tab [active]="activeKey() === eventKeyConfig" [config]="config()!" [onConfigChange]="onConfigChange" [onConfigReset]="onConfigReset" />
            </app-error-tab>
            <app-error-tab [active]="activeKey() === eventKeyData">
              <app-data-tab [active]="activeKey() === eventKeyData" [config]="viewingConfig()!" [data]="data()!"
                            [onDataChange]="onDataChange" [onDataError]="onDataError" [onDataReset]="onDataReset" />
            </app-error-tab>
          </div>
        </div>
      }
    </div>
  `
})
export class DemoSingle implements OnInit, OnChanges {
  @Input({ required: true }) demoData!: DemoData;
  @Input({ required: true }) demoMode!: DemoMode;
  @Input({ required: true }) initialDemoId!: string;
  @Input({ required: true }) onDemoModeChanged!: OnDemoModeChanged;
  @Input({ required: true }) onDemoChanged!: OnDemoChanged;

  readonly text = demoText.tabs;

  readonly eventKeyChart = eventKeyChart;
  readonly eventKeyConfig = eventKeyConfig;
  readonly eventKeyData = eventKeyData;
  readonly eventKeyDemo = eventKeyDemo;

  activeKey = signal(eventKeyChart);

  // Config/data edits made on the Config/Data tabs stay "pending" until the
  // Chart tab is shown again (so the chart animates one combined change).
  demoId = signal('');
  pendingConfig = signal<DemoConfig | null>(null);
  pendingData = signal<DataRow[] | null>(null);
  pendingDataError = signal<DataError>(false);
  config = signal<DemoConfig | null>(null);
  data = signal<DataRow[] | null>(null);
  dataError = signal<DataError>(false);
  viewingConfig = signal<DemoConfig | null>(null);
  viewingData = signal<DataRow[] | null>(null);
  viewingDataError = signal<DataError>(false);

  ngOnInit(): void {
    const { initialDemoId } = this;
    this.activeKey.set(getActiveKeyForInitialDemoId(initialDemoId));
    this.demoId.set(initialDemoId);
    if (initialDemoId !== 'demos') {
      // A share link carries edited config/data in the URL hash; it overrides
      // the demo's own config/data for the initial mount only.
      const sharedState = consumeShareState();
      const config = sharedState?.config ?? this.demoData.demoObjectMap[initialDemoId].config;
      const data = sharedState?.data ?? this.demoData.demoObjectMap[initialDemoId].data;
      this.config.set(config);
      this.data.set(data);
      this.viewingConfig.set(config);
      this.viewingData.set(data);
    }
  }

  private chartShown(): void {
    if (this.pendingConfig() !== null || this.pendingData() !== null || this.pendingDataError() !== null) {
      if (this.pendingConfig() !== null) {
        this.viewingConfig.set(this.pendingConfig());
        this.pendingConfig.set(null);
      }
      if (this.pendingData() !== null) {
        this.viewingData.set(this.pendingData());
        this.pendingData.set(null);
      }
      if (this.pendingDataError() !== null) {
        this.viewingDataError.set(this.pendingDataError());
        this.pendingDataError.set(null);
      }
    }
  }

  handleSelect(nextActiveKey: number): void {
    const previousActiveKey = this.activeKey();
    this.activeKey.set(nextActiveKey);
    if (nextActiveKey === eventKeyChart && previousActiveKey !== eventKeyChart) {
      this.chartShown();
    }
  }

  // When the routed demo changes, reload its config/data (and promote them
  // straight to the visible chart, matching the react demo's lifecycle).
  ngOnChanges(changes: SimpleChanges): void {
    const initialDemoIdChange = changes['initialDemoId'];
    if (!initialDemoIdChange || initialDemoIdChange.firstChange) {
      return;
    }
    const { initialDemoId } = this;
    this.activeKey.set(getActiveKeyForInitialDemoId(initialDemoId));
    this.demoId.set(initialDemoId);
    if (initialDemoId === 'demos') {
      this.config.set(null);
      this.data.set(null);
      this.dataError.set(null);
      this.viewingConfig.set(null);
      this.viewingData.set(null);
    }
    else {
      this.config.set(this.demoData.demoObjectMap[initialDemoId].config);
      this.data.set(this.demoData.demoObjectMap[initialDemoId].data);
      this.dataError.set(null);
      this.pendingConfig.set(this.config());
      this.pendingData.set(this.data());
      this.chartShown();
    }
  }

  onConfigChange = (nextPendingConfig: DemoConfig): void => {
    this.pendingConfig.set(nextPendingConfig);
  };

  onConfigReset = (): void => {
    const resetConfig = { ...this.demoData.demoObjectMap[this.demoId()].config };
    this.pendingConfig.set(resetConfig);
    this.config.set(resetConfig);
  };

  onDataChange = (nextPendingData: DataRow[]): void => {
    this.pendingData.set(nextPendingData);
    this.pendingDataError.set(false);
  };

  onDataError = (errorMessage: string): void => {
    this.pendingDataError.set(errorMessage);
  };

  onDataReset = (): void => {
    // give it a new array reference so children know to update
    this.pendingData.set(this.demoData.demoObjectMap[this.demoId()].data.slice());
    this.pendingDataError.set(false);
  };

  onDemoChange = (nextDemoId: string): void => {
    this.onDemoChanged(nextDemoId);
  };

  // Applied config/data edits are held until the Chart tab is shown; badge the
  // Chart tab so it's visible that something is waiting there.
  get hasPendingChanges(): boolean {
    return this.activeKey() !== eventKeyChart && (this.pendingConfig() !== null || this.pendingData() !== null);
  }
}
