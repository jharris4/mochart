import { Component, ElementRef, Input, ViewChild, signal } from '@angular/core';
import type { AfterViewInit, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';

import { Chart } from '@mochart/angular';
import { exportChartsPNG, exportChartsSVG } from '@mochart/export';

import { getChartExportOptions, buildMochartDemoConfig, consumeShareState, getDataProvidersForDataCount } from '@mochart/demo-common';
import type { MultiShareState, ShareState } from '@mochart/demo-common';

import { ChartsControls } from './charts-controls';
import { createElementSize } from '../misc/element-size';

import type { Demo, DataRow, FilteredSeriesIds, ChartDataProviderLike, MochartDemoConfig } from '../../types';

const scrollWidthOffset = 20;

const defaultChartRows = 2;
const defaultChartCols = 2;

const defaultRate = 2000;

function clampGrid(value: number): number {
  return Math.min(4, Math.max(1, Math.round(value)));
}

@Component({
  selector: 'app-charts-tab',
  imports: [Chart, ChartsControls],
  styles: [':host { display: contents; }'],
  template: `
    <div [class]="'mochart-demo-tab-container demo-layout-col chart' + (active ? ' active' : '')">
      <div #grid class="multi-charts-sizer">
        @if (gridWidth() > 0) {
          <div class="multi-charts">
            @for (dataProvider of dataProviders(); track $index; let i = $index) {
              <div class="multi-mochart-chart">
                <mochart-chart [mochartConfig]="mochartDemoConfig()!.mochartConfig" [dataProvider]="dataProvider"
                               [width]="chartWidth" [height]="chartHeight"
                               (seriesFilter)="onSeriesFilter($event)" (focus)="onChartFocus(i, $event)" />
              </div>
            }
          </div>
        }
      </div>
      <app-charts-controls [playing]="playing()" [onRowsChange]="onRowsChange" [onColsChange]="onColsChange"
                           [onStepBackwardClick]="onStepBackwardClick" [onStepForwardClick]="onStepForwardClick"
                           [onPlayBackwardClick]="onPlayBackwardClick" [onPlayForwardClick]="onPlayForwardClick"
                           [onStopClick]="onStopClick" [onRateChange]="onRateChange"
                           [initialRows]="chartRows()" [initialCols]="chartCols()" [initialRate]="rate()"
                           [exportPng]="onExportPng" [exportSvg]="onExportSvg" [getShareState]="getShareState" />
    </div>
  `
})
export class ChartsTab implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input({ required: true }) demoObject!: Demo;
  @Input() active = false;

  @ViewChild('grid', { static: true }) gridElement!: ElementRef<HTMLDivElement>;

  private intervalId: ReturnType<typeof setInterval> | null = null;

  playing = signal(false);
  chartRows = signal(defaultChartRows);
  chartCols = signal(defaultChartCols);
  rate = signal(defaultRate);
  mochartDemoConfig = signal<MochartDemoConfig | null>(null);
  data = signal<DataRow[]>([]);
  dataCount = signal(0);
  currentDataCount = signal(0);
  dataProviders = signal<ChartDataProviderLike[]>([]);
  focusedGroupIndices = signal<number[]>([]);
  focusedGroupIndex = signal(-1);
  focusedSeriesAxisId = signal<string | null>(null);
  focusedSeriesId = signal<string | null>(null);
  filteredSeriesIds = signal<FilteredSeriesIds>({});

  // Measured size of the charts grid.
  private elementSize = createElementSize();
  gridWidth = this.elementSize.width;
  gridHeight = this.elementSize.height;

  ngOnInit(): void {
    // A share link restores the grid size, playback step and interval.
    const shared = this.consumeMultiShareState();
    const rows = shared ? clampGrid(shared.rows) : defaultChartRows;
    const cols = shared ? clampGrid(shared.cols) : defaultChartCols;
    const rate = shared ? shared.interval : defaultRate;
    this.chartRows.set(rows);
    this.chartCols.set(cols);
    this.rate.set(rate);
    const mochartDemoConfig = buildMochartDemoConfig(this.demoObject.config);
    this.mochartDemoConfig.set(mochartDemoConfig);
    const data = this.demoObject.data;
    this.data.set(data);
    const dataCount = data.length;
    this.dataCount.set(dataCount);
    // A shared step seeks the playback position; otherwise start on the full set.
    const currentDataCount = shared !== null && dataCount > 0
      ? ((Math.round(shared.step) % dataCount) + dataCount) % dataCount
      : dataCount;
    this.currentDataCount.set(currentDataCount);
    this.dataProviders.set(getDataProvidersForDataCount(mochartDemoConfig.mochartConfig, data, rows * cols, currentDataCount));
    this.focusedGroupIndices.set(this.dataProviders().map(() => -1));
  }

  private consumeMultiShareState(): MultiShareState | null {
    const shared = consumeShareState('multi');
    return shared !== null && shared.mode === 'multi' ? shared : null;
  }

  private getChartContainers(): Element[] {
    const grid = this.gridElement?.nativeElement;
    return grid ? Array.from(grid.querySelectorAll('.multi-mochart-chart')) : [];
  }

  onExportPng = (): void => {
    const containers = this.getChartContainers();
    if (containers.length > 0) {
      void exportChartsPNG(containers, { cols: this.chartCols(), ...getChartExportOptions() });
    }
  };

  onExportSvg = (): void => {
    const containers = this.getChartContainers();
    if (containers.length > 0) {
      exportChartsSVG(containers, { cols: this.chartCols(), ...getChartExportOptions() });
    }
  };

  getShareState = (): ShareState => ({
    mode: 'multi', rows: this.chartRows(), cols: this.chartCols(), step: this.currentDataCount(), interval: this.rate()
  });

  ngAfterViewInit(): void {
    this.elementSize.observe(this.gridElement.nativeElement);
  }

  private initFocusAndFiltered(): void {
    this.focusedGroupIndex.set(-1);
    this.focusedSeriesAxisId.set(null);
    this.focusedSeriesId.set(null);
    this.filteredSeriesIds.set({});
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (Object.values(changes).some(change => change.firstChange)) {
      return;
    }
    if (changes['demoObject']) {
      this.mochartDemoConfig.set(buildMochartDemoConfig(this.demoObject.config));
      this.initFocusAndFiltered();
      this.playing.set(false);
      this.data.set(this.demoObject.data);
      this.dataCount.set(this.data().length);
      this.currentDataCount.set(this.dataCount());
      this.dataProviders.set(getDataProvidersForDataCount(this.mochartDemoConfig()!.mochartConfig, this.data(), this.chartRows() * this.chartCols(), this.currentDataCount()));
      this.focusedGroupIndices.set(this.dataProviders().map(() => -1));
    }
    if (changes['active']) {
      this.onStopClick();
    }
  }

  onRateChange = (nextRate: number): void => {
    this.rate.set(nextRate);
  };

  onRowsChange = (nextChartRows: number): void => {
    this.chartRows.set(nextChartRows);
    this.currentDataCount.set(this.dataCount());
    this.dataProviders.set(getDataProvidersForDataCount(this.mochartDemoConfig()!.mochartConfig, this.data(), this.chartRows() * this.chartCols(), this.currentDataCount()));
    this.focusedGroupIndices.set(this.getFocusedGroupIndices(this.dataProviders()));
  };

  onColsChange = (nextChartCols: number): void => {
    this.chartCols.set(nextChartCols);
    this.currentDataCount.set(this.dataCount());
    this.dataProviders.set(getDataProvidersForDataCount(this.mochartDemoConfig()!.mochartConfig, this.data(), this.chartRows() * this.chartCols(), this.currentDataCount()));
    this.focusedGroupIndices.set(this.getFocusedGroupIndices(this.dataProviders()));
  };

  onStepBackwardClick = (): void => {
    this.currentDataCount.set(this.dataCount() + (this.currentDataCount() - 1) % this.dataCount());
    this.dataProviders.set(getDataProvidersForDataCount(this.mochartDemoConfig()!.mochartConfig, this.data(), this.chartRows() * this.chartCols(), this.currentDataCount()));
    this.focusedGroupIndices.set(this.getFocusedGroupIndices(this.dataProviders()));
  };

  onStepForwardClick = (): void => {
    this.currentDataCount.set((this.currentDataCount() + 1) % this.dataCount());
    this.dataProviders.set(getDataProvidersForDataCount(this.mochartDemoConfig()!.mochartConfig, this.data(), this.chartRows() * this.chartCols(), this.currentDataCount()));
    this.focusedGroupIndices.set(this.getFocusedGroupIndices(this.dataProviders()));
  };

  private getFocusedGroupIndices(nextDataProviders: ChartDataProviderLike[]): number[] {
    const { mochartConfig } = this.mochartDemoConfig()!;
    if (this.focusedGroupIndex() >= 0) {
      const groupValue = this.data()[this.focusedGroupIndex()][mochartConfig.groupAxisConfig.property ?? ''];
      return this.getFocusedGroupIndicesForValue(nextDataProviders, groupValue);
    }
    else {
      return nextDataProviders.map(() => -1);
    }
  }

  private getFocusedGroupIndicesForValue(nextDataProviders: ChartDataProviderLike[], groupValue: unknown): number[] {
    let count, i;
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

  onPlayBackwardClick = (): void => {
    this.playing.set(true);
    this.intervalId = setInterval(this.onStepBackwardClick, this.rate());
  };

  onPlayForwardClick = (): void => {
    this.playing.set(true);
    this.intervalId = setInterval(this.onStepForwardClick, this.rate());
  };

  onStopClick = (): void => {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }
    this.intervalId = null;
    this.playing.set(false);
  };

  ngOnDestroy(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.elementSize.disconnect();
  }

  onChartFocus(chartIndex: number, focusData: { focusedSeriesAxisId?: string | null; focusedSeriesId?: string | null; focusedGroupIndex?: number }): void {
    const { focusedSeriesAxisId: seriesAxisId, focusedSeriesId: seriesId } = focusData;
    let groupIndex = focusData.focusedGroupIndex;
    const { mochartConfig } = this.mochartDemoConfig()!;
    let nextFocusedGroupIndices = this.focusedGroupIndices();
    if (groupIndex !== void 0 && groupIndex >= 0) {
      const groupValue = this.dataProviders()[chartIndex].getGroupValues()[groupIndex];
      let i, count = this.data().length;
      for (i = 0; i < count; i++) {
        if (this.data()[i][mochartConfig.groupAxisConfig.property ?? ''] === groupValue) {
          groupIndex = i;
          break;
        }
      }
      if (groupIndex !== this.focusedGroupIndex()) {
        nextFocusedGroupIndices = this.getFocusedGroupIndicesForValue(this.dataProviders(), groupValue);
      }
    }
    else if (this.focusedGroupIndex() >= 0) {
      nextFocusedGroupIndices = this.dataProviders().map(() => -1);
    }
    if (groupIndex !== void 0) {
      this.focusedGroupIndex.set(groupIndex);
    }
    if (seriesAxisId !== void 0) {
      this.focusedSeriesAxisId.set(seriesAxisId);
    }
    if (seriesId !== void 0) {
      this.focusedSeriesId.set(seriesId);
    }
    this.focusedGroupIndices.set(nextFocusedGroupIndices);
  }

  // The chart owns filter toggling now and reports the whole map.
  onSeriesFilter = ({ filteredSeriesIds: nextFilteredSeriesIds }: { filteredSeriesIds: FilteredSeriesIds }): void => {
    this.filteredSeriesIds.set({ ...nextFilteredSeriesIds });
  };

  get chartWidth(): number {
    return Math.floor((this.gridWidth() - scrollWidthOffset) / this.chartCols());
  }

  get chartHeight(): number {
    return Math.floor(this.gridHeight() / this.chartRows());
  }
}
