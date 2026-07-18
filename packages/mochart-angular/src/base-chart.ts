import { ApplicationRef, Directive, ElementRef, EnvironmentInjector, EventEmitter, Input, Output, inject } from '@angular/core';
import type { AfterViewInit, OnChanges, OnDestroy } from '@angular/core';
import { mountChartHost } from './host';
import type { CreateChartFn, HostHandle } from './host';
import { createPlaceholderAdapter } from './placeholders';
import type { PlaceholderComponent } from './types';

/**
 * Shared input/output surface and chart lifecycle for `Chart` and
 * `DefaultChart`. The component's own host element is the container the chart
 * mounts into: explicit `width`/`height` inputs are set on it as pixel styles,
 * and whichever dimension is omitted tracks the host element's size.
 */
@Directive({
  host: {
    '[style.width.px]': 'width ?? null',
    '[style.height.px]': 'height ?? null'
  }
})
export abstract class BaseChart implements AfterViewInit, OnChanges, OnDestroy {
  /** Explicit pixel width; omit to track the host element's width. */
  @Input() width?: number;
  /** Explicit pixel height; omit to track the host element's height. */
  @Input() height?: number;
  @Input() loading?: boolean;
  @Input() error?: any;
  @Input() loadingComponent?: PlaceholderComponent;
  @Input() errorComponent?: PlaceholderComponent;
  @Input() noDataComponent?: PlaceholderComponent;
  @Input() noSizeComponent?: PlaceholderComponent;
  @Input() noSeriesComponent?: PlaceholderComponent;
  @Input() configErrorComponent?: PlaceholderComponent;

  @Output() chartClick = new EventEmitter<any>();
  @Output() chartMouseEnter = new EventEmitter<any>();
  @Output() chartMouseMove = new EventEmitter<any>();
  @Output() chartMouseLeave = new EventEmitter<any>();
  @Output() titleClick = new EventEmitter<any>();
  @Output() focus = new EventEmitter<any>();
  @Output() seriesFilter = new EventEmitter<any>();
  @Output() seriesLayoutInfoChange = new EventEmitter<any>();

  private readonly elementRef = inject(ElementRef) as ElementRef<HTMLElement>;
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly applicationRef = inject(ApplicationRef);
  private host: HostHandle | null = null;

  /** createChart or createDefaultChart from the mochart core. */
  protected abstract readonly create: CreateChartFn;
  /** The subclass-specific chart props (config and data). */
  protected abstract collectChartProps(): Record<string, any>;

  private buildProps(): Record<string, any> {
    const props: Record<string, any> = {
      ...this.collectChartProps(),
      width: this.width,
      height: this.height,
      loading: this.loading,
      error: this.error,
      loadingComponent: this.loadingComponent,
      errorComponent: this.errorComponent,
      noDataComponent: this.noDataComponent,
      noSizeComponent: this.noSizeComponent,
      noSeriesComponent: this.noSeriesComponent,
      configErrorComponent: this.configErrorComponent
    };
    // Only subscribed outputs are forwarded to the core: some core behaviors
    // (e.g. clickable-title styling) switch on the presence of a callback.
    const callbacks: [EventEmitter<any>, string][] = [
      [this.chartClick, 'onChartClick'],
      [this.chartMouseEnter, 'onChartMouseEnter'],
      [this.chartMouseMove, 'onChartMouseMove'],
      [this.chartMouseLeave, 'onChartMouseLeave'],
      [this.titleClick, 'onTitleClick'],
      [this.focus, 'onFocus'],
      [this.seriesFilter, 'onSeriesFilter'],
      [this.seriesLayoutInfoChange, 'onSeriesLayoutInfoChange']
    ];
    for (const [emitter, coreName] of callbacks) {
      if (emitter.observed) {
        props[coreName] = (payload: any) => emitter.emit(payload);
      }
    }
    return props;
  }

  ngAfterViewInit(): void {
    const placeholders = createPlaceholderAdapter(this.environmentInjector, this.applicationRef);
    this.host = mountChartHost(this.create, this.elementRef.nativeElement, this.buildProps(), placeholders);
  }

  ngOnChanges(): void {
    // Before the first render `host` is null and the mount picks up the
    // current input values itself.
    this.host?.update(this.buildProps());
  }

  ngOnDestroy(): void {
    const current = this.host;
    this.host = null;
    current?.destroy();
  }
}
