import Chart from '../components/Chart';
import { isDataProviderValid } from '../data/ChartData';
import { FocusController } from './FocusController';
import { StaticDataSource } from './StaticDataSource';
import { AnimatedDataSource } from './AnimatedDataSource';
import type { ChartDataSource, ChartDataSourceInput, InternalFocus } from './ChartDataSource';
import type { ChartProps } from '../components/Chart';
import type { ManagedChartProps } from '../types/chart';
import type { CategoryValue } from '../types/data';
import type { EnhancedMochartConfig } from '../types/enhanced';

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
  private lastCategoryValues: readonly CategoryValue[] | null = null;
  private destroyed = false;
  private reducedMotion: MediaQueryList | null;

  constructor(container: Element, props: ManagedChartProps) {
    // environments without matchMedia (SSR) count as no preference
    this.reducedMotion = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    this.reducedMotion?.addEventListener('change', this.handleReducedMotionChange);
    this.props = props;
    this.focus.applyExternal(props);
    this.source = this.createSource();
    this.lastInput = this.buildInput();
    this.captureCategoryValues();
    this.source.start(this.lastInput);
    this.chart.mount(container, null, this.chartProps());
  }

  update(props: ManagedChartProps): void {
    if (this.destroyed) {
      return;
    }
    const prev = this.props;
    const changes = this.focus.reconcile(prev, props, this.lastCategoryValues);
    this.props = props;
    this.focus.applyExternal(props);
    this.applyInput();
    // notify after the commit: a host may synchronously update() again from these
    if (changes.focus) {
      prev.onFocus?.(changes.focus);
    }
    if (changes.seriesFilter) {
      prev.onSeriesFilter?.(changes.seriesFilter);
    }
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.reducedMotion?.removeEventListener('change', this.handleReducedMotionChange);
    this.source.dispose();
    this.chart.destroy();
  }

  private isAnimated(): boolean {
    const { mochartConfig } = this.props;
    if (!mochartConfig || !mochartConfig.animation.animate) {
      return false;
    }
    return !(mochartConfig.accessibility.respectReducedMotion && this.reducedMotion?.matches);
  }

  /** applyInput swaps the data source when the effective animate flag flipped. */
  private handleReducedMotionChange = (): void => {
    if (!this.destroyed) {
      this.applyInput();
    }
  }

  private createSource(): ChartDataSource {
    return this.isAnimated() ? new AnimatedDataSource(this.push) : new StaticDataSource();
  }

  /** Snapshot the committed category ordering (the sources' read gate); reconcile remaps focus from it. */
  private captureCategoryValues(): void {
    const mochartConfig = this.props.mochartConfig as EnhancedMochartConfig | null | undefined;
    const { dataProvider } = this.props;
    this.lastCategoryValues = mochartConfig?.validation.valid && dataProvider && isDataProviderValid(dataProvider)
      ? [...dataProvider.getCategoryValues()]
      : null;
  }

  private buildInput(): ChartDataSourceInput {
    const mochartConfig = this.props.mochartConfig as EnhancedMochartConfig;
    const { dataProvider } = this.props;
    const { filteredSeriesIds, focusedCategoryIndex, focusedValueAxisId, focusedSeriesId } = this.focus;
    return { mochartConfig, dataProvider, filteredSeriesIds, focusedCategoryIndex, focusedValueAxisId, focusedSeriesId };
  }

  /** Recompute the source output for the current props + focus state and push it into the Chart. */
  private applyInput(): void {
    const prevInput = this.lastInput;
    const input = this.buildInput();
    this.lastInput = input;
    // the ordering can only change when the source re-reads: a config or provider identity change
    if (input.mochartConfig !== prevInput.mochartConfig || input.dataProvider !== prevInput.dataProvider) {
      this.captureCategoryValues();
    }
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
      onChartClick, onSliceClick, onSeriesClick, onChartMouseEnter, onChartMouseMove, onChartMouseLeave, onTitleClick, onSeriesLayoutBoundsChange,
      getLoadingComponent, getErrorComponent, getNoDataComponent, getNoSizeComponent, getNoSeriesComponent, getConfigErrorComponent
    } = this.props;
    return { mochartConfig: mochartConfig as EnhancedMochartConfig, dataProvider, loading, error, style, width, height, standalone: true,
      chartData: this.source.chartData, focusData: this.source.focusData,
      initialAnimationPercentage: this.source.initialAnimationPercentage,
      onFocus: this.handleFocus, onSeriesFilter: this.handleSeriesFilter,
      onChartClick, onSliceClick, onSeriesClick, onChartMouseEnter, onChartMouseMove, onChartMouseLeave, onTitleClick, onSeriesLayoutBoundsChange,
      getLoadingComponent, getErrorComponent, getNoDataComponent, getNoSizeComponent, getNoSeriesComponent, getConfigErrorComponent };
  }

  private handleFocus = (focus: InternalFocus): void => {
    const snapshot = this.focus.applyFocus(this.source.remapFocus(focus));
    this.applyInput();
    this.props.onFocus?.(snapshot);
  }

  private handleSeriesFilter = (seriesId: string): void => {
    const followerSeriesIds = (this.props.mochartConfig?.series ?? [])
      .filter(seriesConfig => seriesConfig.followSeries === seriesId)
      .map(seriesConfig => seriesConfig.id);
    const prevFocusedSeriesId = this.focus.focusedSeriesId;
    const snapshot = this.focus.toggleSeriesFilter(seriesId, followerSeriesIds);
    this.applyInput();
    this.props.onSeriesFilter?.(snapshot);
    if (this.focus.focusedSeriesId !== prevFocusedSeriesId) {
      this.props.onFocus?.(this.focus.focus());
    }
  }
}
