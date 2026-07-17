import Chart from '../components/Chart';
import { FocusController } from './FocusController';
import { StaticDataSource } from './StaticDataSource';
import { AnimatedDataSource } from './AnimatedDataSource';
import type { ChartDataSource, ChartDataSourceInput, InternalFocus } from './ChartDataSource';
import type { ChartProps } from '../components/Chart';
import type { ManagedChartProps } from '../types/chart';

/**
 * Composes the pieces of a managed chart around the Chart renderer: the
 * FocusController holds focus/filter state, the data source (static or
 * animated) turns config + data + focus into chartData/focusData, and this
 * controller pushes the combined result into the mounted Chart. Focus events
 * raised inside the chart flow back through here (remapped by the source when
 * a tween is running) and out to the host callbacks.
 */
export class ChartController {
  private chart = new Chart();
  private focus = new FocusController();
  private source: ChartDataSource;
  private props: ManagedChartProps;
  private lastInput: ChartDataSourceInput;
  private destroyed = false;

  constructor(container: Element, props: ManagedChartProps) {
    this.props = props;
    this.source = this.createSource();
    this.lastInput = this.buildInput();
    this.source.start(this.lastInput);
    this.chart.mount(container, null, this.chartProps());
  }

  update(props: ManagedChartProps): void {
    if (this.destroyed) {
      return;
    }
    const prev = this.props;
    // reconcile notifies through the callbacks that were in effect when the
    // change was made, matching the old willReceiveProps ordering
    this.focus.reconcile(prev, props, prev);
    this.props = props;
    this.applyInput();
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.source.dispose();
    this.chart.destroy();
  }

  private isAnimated(): boolean {
    const { mochartConfig } = this.props;
    return Boolean(mochartConfig && mochartConfig.animationConfig.animate);
  }

  private createSource(): ChartDataSource {
    return this.isAnimated() ? new AnimatedDataSource(this.push) : new StaticDataSource();
  }

  private buildInput(): ChartDataSourceInput {
    const { mochartConfig, dataProvider } = this.props;
    const { filteredSeriesIds, focusedGroupIndex, focusedSeriesAxisId, focusedSeriesId } = this.focus;
    return { mochartConfig, dataProvider, filteredSeriesIds, focusedGroupIndex, focusedSeriesAxisId, focusedSeriesId };
  }

  /** Recompute the source output for the current props + focus state and push it into the Chart. */
  private applyInput(): void {
    const prevInput = this.lastInput;
    const input = this.buildInput();
    this.lastInput = input;
    if (this.source.animated !== this.isAnimated()) {
      this.source.dispose();
      this.source = this.createSource();
      this.source.start(input);
    }
    else {
      this.source.update(prevInput, input);
    }
    this.push();
  }

  /** Push current output into the Chart renderer. Also the animated source's per-frame emit. */
  private push = (): void => {
    if (this.destroyed) {
      return;
    }
    this.chart.update(this.chartProps());
  }

  private chartProps(): ChartProps {
    const {
      mochartConfig, dataProvider, loading, error, style, width, height,
      onChartClick, onChartMouseEnter, onChartMouseMove, onChartMouseLeave, onTitleClick, onSeriesLayoutInfoChange,
      getLoadingComponent, getErrorComponent, getNoDataComponent, getNoSizeComponent, getNoSeriesComponent, getConfigErrorComponent
    } = this.props;
    return { mochartConfig, dataProvider, loading, error, style, width, height, standalone: true,
      chartData: this.source.chartData, focusData: this.source.focusData,
      onFocus: this.handleFocus, onSeriesFilter: this.handleSeriesFilter,
      onChartClick, onChartMouseEnter, onChartMouseMove, onChartMouseLeave, onTitleClick, onSeriesLayoutInfoChange,
      getLoadingComponent, getErrorComponent, getNoDataComponent, getNoSizeComponent, getNoSeriesComponent, getConfigErrorComponent };
  }

  private handleFocus = (focus: InternalFocus): void => {
    const snapshot = this.focus.applyFocus(this.source.remapFocus(focus));
    this.applyInput();
    this.props.onFocus?.(snapshot);
  }

  private handleSeriesFilter = (seriesId: string): void => {
    const snapshot = this.focus.toggleSeriesFilter(seriesId);
    this.applyInput();
    this.props.onSeriesFilter?.(snapshot);
  }
}
