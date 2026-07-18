import { Component, Input, signal } from '@angular/core';

import { Icon } from '../misc/icon';

import type { DemoData, DemoMode, OnDemoModeChanged, OnDemoChanged } from '../../types';

const modeCaptions: Record<string, string> = {
  single: 'Single: one chart with editable config, data, groups and series — pick a demo below.',
  multi: 'Multi: a grid of charts stepping through generated datasets together — pick a demo below.',
  random: 'Random: a chart fed by a seeded random data generator — pick a demo below.',
  transition: 'Transition: animates a chart between datasets — pick a demo below.',
  rotation: 'Rotation: a grid of charts showing different tick label rotations — pick a demo below.'
};

@Component({
  selector: 'app-demos-tab',
  imports: [Icon],
  styles: [':host { display: contents; }'],
  template: `
    <div [class]="'mochart-demo-tab-container col demos' + (active ? ' active' : '')">
      <div class="mochart-demo-modes-container">
        <form class="form-inline">
          <div class="form-group">
            <span class="form-control-plaintext">Demo Mode:&nbsp;</span>
          </div>
          <div class="form-group">
            <div class="btn-toolbar" role="toolbar">
              <button type="button" [class]="'btn btn-' + (isSingle ? 'primary' : 'secondary')" [disabled]="isSingle"
                      title="One chart with editable config, data, groups and series"
                      (click)="onDemoModeChanged('single', demoId)">
                <app-icon size="lg" name="pen-to-square" /> Single
              </button>
              <button type="button" [class]="'btn btn-' + (isMulti ? 'primary' : 'secondary')" [disabled]="isMulti"
                      title="A grid of charts stepping through datasets together"
                      (click)="onDemoModeChanged('multi', demoId)">
                <app-icon size="lg" name="window-restore" /> Multi
              </button>
              <button type="button" [class]="'btn btn-' + (isRandom ? 'primary' : 'secondary')" [disabled]="isRandom"
                      title="A chart fed by a seeded random data generator"
                      (click)="onDemoModeChanged('random', demoId)">
                <app-icon size="lg" name="shuffle" /> Random
              </button>
              <button type="button" class="btn btn-secondary"
                      title="Animate a chart between two datasets"
                      (click)="onDemoModeChanged('transition', demoId)">
                <app-icon size="lg" name="right-left" /> Transition
              </button>
              <button type="button" class="btn btn-secondary"
                      title="A grid of charts showing different tick label rotations"
                      (click)="onDemoModeChanged('rotation', demoId)">
                <app-icon size="lg" name="repeat" /> Rotation
              </button>
            </div>
          </div>
          <div class="form-group" style="margin-left: 10px;">
            <div class="btn-toolbar" role="toolbar">
              <button type="button" [class]="'btn btn-' + (isTestMode() ? 'primary' : 'secondary')" [attr.aria-pressed]="isTestMode()"
                      title="Show the test demos (showcasing less used features)"
                      (click)="onTestModeToggle()">
                <app-icon size="lg" name="flask" /> Test Demos
              </button>
            </div>
          </div>
        </form>
        @if (modeCaption) {
          <div class="mochart-demo-caption">{{ modeCaption }}</div>
        }
      </div>
      <div class="mochart-demo-list-container">
        <div class="mochart-demo-list">
          <div class="list-group">
            @for (currentDemoId of theDemoIds; track currentDemoId) {
              <button type="button"
                      [class]="'list-group-item list-group-item-action' + (currentDemoId === demoId ? ' active' : '')"
                      (click)="onDemoChange(currentDemoId)">
                {{ demoData.demoObjectMap[currentDemoId].title }}
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class DemosTab {
  @Input() active = false;
  @Input({ required: true }) demoData!: DemoData;
  @Input({ required: true }) demoMode!: DemoMode;
  @Input({ required: true }) demoId!: string;
  @Input({ required: true }) onDemoModeChanged!: OnDemoModeChanged;
  @Input({ required: true }) onDemoChange!: OnDemoChanged;

  isTestMode = signal(false);

  get theDemoIds(): string[] {
    return this.isTestMode() ? this.demoData.testDemoIds : this.demoData.demoIds;
  }

  get isSingle(): boolean {
    return this.demoMode === 'single';
  }

  get isMulti(): boolean {
    return this.demoMode === 'multi';
  }

  get isRandom(): boolean {
    return this.demoMode === 'random';
  }

  get modeCaption(): string {
    return modeCaptions[this.demoMode] ?? '';
  }

  onTestModeToggle(): void {
    this.isTestMode.update(isTestMode => !isTestMode);
  }
}
