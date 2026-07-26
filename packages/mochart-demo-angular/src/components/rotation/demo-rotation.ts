import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import type { AfterViewInit, OnDestroy } from '@angular/core';

import { DefaultChart } from '@mochart/angular';

import { configs, data, minWidth } from './rotationConfigs';

import { createElementSize } from '../misc/element-size';
import { BackToDemosButton, SiteRootButton, ThemeToggleButton } from '../misc/mode-switcher';

/**
 * Columns are sized from the card's measured width (not the window) so the
 * grid stays inside the padded shell.
 */
@Component({
  selector: 'app-demo-rotation',
  imports: [DefaultChart, BackToDemosButton, SiteRootButton, ThemeToggleButton],
  styles: [':host { display: contents; }'],
  template: `
    <div class="mochart-demo-container">
      <div class="mochart-demo-tabs-container">
        <div class="mochart-demo-nav-group">
          @if (siteRootUrl !== undefined) {
            <a appSiteRootButton [href]="siteRootUrl"></a>
          }
          <button appBackToDemosButton (click)="onBackToDemos()"></button>
        </div>
        <button appThemeToggleButton></button>
      </div>
      <div #charts class="rotation-charts">
        @if (colWidth > 0) {
          @for (config of configs; track $index; let i = $index) {
            <div [class]="'rotation-chart rotation-chart-' + i"
                 [style.left.px]="left(i)" [style.top.px]="top(i)" [style.width.px]="colWidth" [style.height.px]="colWidth">
              <mochart-default-chart [config]="config" [data]="data" [width]="colWidth" [height]="colWidth" />
            </div>
          }
        }
      </div>
    </div>
  `
})
export class DemoRotation implements AfterViewInit, OnDestroy {
  @ViewChild('charts', { static: true }) chartsElement!: ElementRef<HTMLDivElement>;

  @Input() siteRootUrl?: string;
  @Input({ required: true }) onBackToDemos!: () => void;

  readonly configs = configs;
  readonly data = data;

  private elementSize = createElementSize();
  chartsWidth = this.elementSize.width;

  ngAfterViewInit(): void {
    this.elementSize.observe(this.chartsElement.nativeElement);
  }

  ngOnDestroy(): void {
    this.elementSize.disconnect();
  }

  get cols(): number {
    return Math.max(1, Math.floor(this.chartsWidth() / minWidth));
  }

  get colWidth(): number {
    return Math.floor(this.chartsWidth() / this.cols);
  }

  left(i: number): number {
    return (i % this.cols) * this.colWidth;
  }

  top(i: number): number {
    return Math.floor(i / this.cols) * this.colWidth;
  }
}
