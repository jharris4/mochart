import { Component, Input, signal } from '@angular/core';
import type { OnChanges, OnInit, SimpleChanges } from '@angular/core';

import { DemosTab } from '../demos/demos-tab';
import { ChartsTab } from './charts-tab';
import { ErrorTab } from '../misc/error-tab';

import type { DemoData, DemoMode, OnDemoModeChanged, OnDemoChanged } from '../../types';

const eventKeyChart = 1;
const eventKeyDemo = 2;

function getActiveKeyForInitialDemoId(initialDemoId: string): number {
  return initialDemoId === 'demos' ? eventKeyDemo : eventKeyChart;
}

@Component({
  selector: 'app-demo-multi',
  imports: [DemosTab, ChartsTab, ErrorTab],
  styles: [':host { display: contents; }'],
  template: `
    <div class="mochart-demo-container multi">
      <div class="mochart-demo-tabs-container">
        <ul class="nav nav-tabs">
          <li class="nav-item">
            <button type="button" [class]="'nav-link' + (activeKey() === eventKeyDemo ? ' active' : '')"
                    (click)="handleSelect(eventKeyDemo)">
              Demos
            </button>
          </li>
          <li class="nav-item" [style.display]="isDemos ? 'none' : null">
            <button type="button" [class]="'nav-link' + (activeKey() === eventKeyChart ? ' active' : '')"
                    (click)="handleSelect(eventKeyChart)">
              Chart
            </button>
          </li>
        </ul>
      </div>
      <div class="mochart-demo-content-pane">
        @if (isDemos) {
          <div class="mochart-demo-content single-tab">
            <app-demos-tab [active]="activeKey() === eventKeyDemo" [demoData]="demoData" [demoMode]="demoMode" [demoId]="demoId()"
                           [onDemoModeChanged]="onDemoModeChanged" [onDemoChange]="onDemoChange" />
          </div>
        } @else {
          <div class="mochart-demo-content">
            <app-error-tab [active]="activeKey() === eventKeyDemo">
              <app-demos-tab [active]="activeKey() === eventKeyDemo" [demoData]="demoData" [demoMode]="demoMode" [demoId]="demoId()"
                             [onDemoModeChanged]="onDemoModeChanged" [onDemoChange]="onDemoChange" />
            </app-error-tab>
            <app-error-tab [active]="activeKey() === eventKeyChart">
              <app-charts-tab [active]="activeKey() === eventKeyChart" [demoObject]="demoData.demoObjectMap[demoId()]" />
            </app-error-tab>
          </div>
        }
      </div>
    </div>
  `
})
export class DemoMulti implements OnInit, OnChanges {
  @Input({ required: true }) demoData!: DemoData;
  @Input({ required: true }) demoMode!: DemoMode;
  @Input({ required: true }) initialDemoId!: string;
  @Input({ required: true }) onDemoModeChanged!: OnDemoModeChanged;
  @Input({ required: true }) onDemoChanged!: OnDemoChanged;

  readonly eventKeyChart = eventKeyChart;
  readonly eventKeyDemo = eventKeyDemo;

  demoId = signal('');
  activeKey = signal(eventKeyChart);

  ngOnInit(): void {
    this.demoId.set(this.initialDemoId);
    this.activeKey.set(getActiveKeyForInitialDemoId(this.initialDemoId));
  }

  ngOnChanges(changes: SimpleChanges): void {
    const initialDemoIdChange = changes['initialDemoId'];
    if (initialDemoIdChange && !initialDemoIdChange.firstChange) {
      this.activeKey.set(getActiveKeyForInitialDemoId(this.initialDemoId));
      this.demoId.set(this.initialDemoId);
    }
  }

  onDemoChange = (nextDemoId: string): void => {
    this.demoId.set(nextDemoId);
    this.onDemoChanged(nextDemoId);
  };

  handleSelect(nextActiveKey: number): void {
    this.activeKey.set(nextActiveKey);
  }

  get isDemos(): boolean {
    return this.initialDemoId === 'demos';
  }
}
