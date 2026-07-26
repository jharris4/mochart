import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ref } from 'lit/directives/ref.js';
import type { PropertyValues } from 'lit';

import { chart } from '@mochart/lit';
import { exportChartsPNG, exportChartsSVG } from '@mochart/export';

import { getChartExportOptions, buildMochartDemoConfig, consumeShareState, getDataProvidersForDataCount } from '@mochart/demo-common';
import type { ShareState } from '@mochart/demo-common';

import { LightElement } from '../misc/LightElement';
import { ElementSizeController } from '../misc/ElementSizeController';
import './charts-controls';

import type { Demo, DataRow, FilteredSeriesIds, ChartDataProviderLike, MochartDemoConfig } from '../../types';

const scrollWidthOffset = 20;

const defaultChartRows = 2;
const defaultChartCols = 2;

function clampGrid(value: number): number {
  return Math.min(4, Math.max(1, Math.round(value)));
}

@customElement('charts-tab')
export class ChartsTab extends LightElement {
  @property({ attribute: false }) demoObject!: Demo;
  @property({ attribute: false }) active = false;

  private intervalId: ReturnType<typeof setInterval> | null = null;

  @state() private playing = false;
  @state() private chartRows = defaultChartRows;
  @state() private chartCols = defaultChartCols;
  private rate = 2000;
  @state() private mochartDemoConfig!: MochartDemoConfig;
  @state() private data: DataRow[] = [];
  private dataCount = 0;
  private currentDataCount = 0;
  @state() private dataProviders: ChartDataProviderLike[] = [];
  @state() private focusedGroupIndices: number[] = [];
  private focusedGroupIndex = -1;
  private focusedSeriesAxisId: string | null = null;
  private focusedSeriesId: string | null = null;
  @state() private filteredSeriesIds: FilteredSeriesIds = {};

  // Measured size of the charts grid.
  private size = new ElementSizeController(this);

  private initFocusAndFiltered(): void {
    this.focusedGroupIndex = -1;
    this.focusedSeriesAxisId = null;
    this.focusedSeriesId = null;
    this.filteredSeriesIds = {};
  }

  // A shared `step` seeks the playback position; otherwise start on the full set.
  private initForDemoObject(step?: number): void {
    this.mochartDemoConfig = buildMochartDemoConfig(this.demoObject.config);
    this.initFocusAndFiltered();
    this.playing = false;
    this.data = this.demoObject.data;
    this.dataCount = this.data.length;
    this.currentDataCount = step !== void 0 && this.dataCount > 0
      ? ((Math.round(step) % this.dataCount) + this.dataCount) % this.dataCount
      : this.dataCount;
    this.dataProviders = getDataProvidersForDataCount(this.mochartDemoConfig.mochartConfig, this.data, this.chartRows * this.chartCols, this.currentDataCount);
    this.focusedGroupIndices = this.dataProviders.map(() => -1);
  }

  override willUpdate(changed: PropertyValues<this>): void {
    if (!this.hasUpdated) {
      // A share link restores the grid size, playback step and interval.
      const shared = consumeShareState('multi');
      const sharedMulti = shared && shared.mode === 'multi' ? shared : null;
      let step: number | undefined;
      if (sharedMulti) {
        this.chartRows = clampGrid(sharedMulti.rows);
        this.chartCols = clampGrid(sharedMulti.cols);
        this.rate = sharedMulti.interval;
        step = sharedMulti.step;
      }
      this.initForDemoObject(step);
      return;
    }
    if (changed.has('demoObject')) {
      this.initForDemoObject();
    }
    if (changed.has('active')) {
      this.onStopClick();
    }
  }

  // The whole grid exports as one tiled image; share captures the grid size,
  // playback step and interval so the link restores the same view.
  private getChartContainers(): Element[] {
    return Array.from(this.querySelectorAll('.multi-mochart-chart'));
  }

  private onExportPng = (): void => {
    const containers = this.getChartContainers();
    if (containers.length > 0) {
      void exportChartsPNG(containers, { cols: this.chartCols, ...getChartExportOptions() });
    }
  };

  private onExportSvg = (): void => {
    const containers = this.getChartContainers();
    if (containers.length > 0) {
      exportChartsSVG(containers, { cols: this.chartCols, ...getChartExportOptions() });
    }
  };

  private getShareState = (): ShareState => ({
    mode: 'multi', rows: this.chartRows, cols: this.chartCols, step: this.currentDataCount, interval: this.rate
  });

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private onRateChange = (nextRate: number): void => {
    this.rate = nextRate;
  };

  private onRowsChange = (nextChartRows: number): void => {
    this.chartRows = nextChartRows;
    this.currentDataCount = this.dataCount;
    this.dataProviders = getDataProvidersForDataCount(this.mochartDemoConfig.mochartConfig, this.data, this.chartRows * this.chartCols, this.currentDataCount);
    this.focusedGroupIndices = this.getFocusedGroupIndices(this.dataProviders);
  };

  private onColsChange = (nextChartCols: number): void => {
    this.chartCols = nextChartCols;
    this.currentDataCount = this.dataCount;
    this.dataProviders = getDataProvidersForDataCount(this.mochartDemoConfig.mochartConfig, this.data, this.chartRows * this.chartCols, this.currentDataCount);
    this.focusedGroupIndices = this.getFocusedGroupIndices(this.dataProviders);
  };

  private onStepBackwardClick = (): void => {
    this.currentDataCount = this.dataCount + (this.currentDataCount - 1) % this.dataCount;
    this.dataProviders = getDataProvidersForDataCount(this.mochartDemoConfig.mochartConfig, this.data, this.chartRows * this.chartCols, this.currentDataCount);
    this.focusedGroupIndices = this.getFocusedGroupIndices(this.dataProviders);
  };

  private onStepForwardClick = (): void => {
    this.currentDataCount = (this.currentDataCount + 1) % this.dataCount;
    this.dataProviders = getDataProvidersForDataCount(this.mochartDemoConfig.mochartConfig, this.data, this.chartRows * this.chartCols, this.currentDataCount);
    this.focusedGroupIndices = this.getFocusedGroupIndices(this.dataProviders);
  };

  private getFocusedGroupIndices(nextDataProviders: ChartDataProviderLike[]): number[] {
    const { mochartConfig } = this.mochartDemoConfig;
    if (this.focusedGroupIndex >= 0) {
      const groupValue = this.data[this.focusedGroupIndex][mochartConfig.groupAxisConfig.property ?? ''];
      return this.getFocusedGroupIndicesForValue(nextDataProviders, groupValue);
    }
    else {
      return nextDataProviders.map(() => -1);
    }
  }

  private getFocusedGroupIndicesForValue(nextDataProviders: ChartDataProviderLike[], groupValue: unknown): number[] {
    let count: number, i: number;
    return nextDataProviders.map(dataProvider => {
      let chartGroupIndex = -1;
      const groupValues = dataProvider.getGroupValues();
      count = groupValues.length;
      for (i = 0; i < count; i++) {
        if (groupValues[i] === groupValue) {
          chartGroupIndex = i;
          break;
        }
      }
      return chartGroupIndex;
    });
  }

  private onPlayBackwardClick = (): void => {
    this.playing = true;
    this.intervalId = setInterval(this.onStepBackwardClick, this.rate);
  };

  private onPlayForwardClick = (): void => {
    this.playing = true;
    this.intervalId = setInterval(this.onStepForwardClick, this.rate);
  };

  private onStopClick = (): void => {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }
    this.intervalId = null;
    this.playing = false;
  };

  private onChartFocus(chartIndex: number, focusData: { focusedSeriesAxisId?: string | null; focusedSeriesId?: string | null; focusedGroupIndex?: number }): void {
    const { focusedSeriesAxisId: seriesAxisId, focusedSeriesId: seriesId } = focusData;
    let groupIndex = focusData.focusedGroupIndex;
    const { mochartConfig } = this.mochartDemoConfig;
    let nextFocusedGroupIndices = this.focusedGroupIndices;
    if (groupIndex !== void 0 && groupIndex >= 0) {
      const groupValue = this.dataProviders[chartIndex].getGroupValues()[groupIndex];
      let i, count = this.data.length;
      for (i = 0; i < count; i++) {
        if (this.data[i][mochartConfig.groupAxisConfig.property ?? ''] === groupValue) {
          groupIndex = i;
          break;
        }
      }
      if (groupIndex !== this.focusedGroupIndex) {
        nextFocusedGroupIndices = this.getFocusedGroupIndicesForValue(this.dataProviders, groupValue);
      }
    }
    else if (this.focusedGroupIndex >= 0) {
      nextFocusedGroupIndices = this.dataProviders.map(() => -1);
    }
    if (groupIndex !== void 0) {
      this.focusedGroupIndex = groupIndex;
    }
    if (seriesAxisId !== void 0) {
      this.focusedSeriesAxisId = seriesAxisId;
    }
    if (seriesId !== void 0) {
      this.focusedSeriesId = seriesId;
    }
    this.focusedGroupIndices = nextFocusedGroupIndices;
  }

  // The chart owns filter toggling now and reports the whole map.
  private onSeriesFilter = ({ filteredSeriesIds: nextFilteredSeriesIds }: { filteredSeriesIds: FilteredSeriesIds }): void => {
    this.filteredSeriesIds = { ...nextFilteredSeriesIds };
  };

  override render(): unknown {
    const chartWidth = Math.floor((this.size.width - scrollWidthOffset) / this.chartCols);
    const chartHeight = Math.floor(this.size.height / this.chartRows);
    return html`<div class=${'mochart-demo-tab-container demo-layout-col chart' + (this.active ? ' active' : '')}>
      <div ${ref(this.size.attach)} class="multi-charts-sizer">
        ${this.size.width > 0
          ? html`<div class="multi-charts">
              ${this.dataProviders.map((dataProvider, i) => html`<div class="multi-mochart-chart">
                ${chart({
                  mochartConfig: this.mochartDemoConfig.mochartConfig,
                  dataProvider,
                  width: chartWidth,
                  height: chartHeight,
                  onSeriesFilter: this.onSeriesFilter,
                  onFocus: (focusData: any) => this.onChartFocus(i, focusData)
                })}
              </div>`)}
            </div>`
          : null}
      </div>
      <charts-controls .playing=${this.playing} .initialRows=${this.chartRows} .initialCols=${this.chartCols} .initialRate=${this.rate}
          .onRowsChange=${this.onRowsChange} .onColsChange=${this.onColsChange}
          .onStepBackwardClick=${this.onStepBackwardClick} .onStepForwardClick=${this.onStepForwardClick}
          .onPlayBackwardClick=${this.onPlayBackwardClick} .onPlayForwardClick=${this.onPlayForwardClick}
          .onStopClick=${this.onStopClick} .onRateChange=${this.onRateChange}
          .exportPng=${this.onExportPng} .exportSvg=${this.onExportSvg} .getShareState=${this.getShareState}></charts-controls>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'charts-tab': ChartsTab;
  }
}
