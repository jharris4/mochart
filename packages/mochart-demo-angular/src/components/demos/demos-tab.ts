import { Component, Input, signal } from '@angular/core';

import { demoText } from '@mochart/demo-common';

import { Icon } from '../misc/icon';

import type { DemoData, DemoMode, OnDemoModeChanged, OnDemoChanged } from '../../types';

const modeCaptions = demoText.demosTab.modeCaptions;

@Component({
  selector: 'app-demos-tab',
  imports: [Icon],
  styles: [':host { display: contents; }'],
  template: `
    <div [class]="'mochart-demo-tab-container col demos' + (active ? ' active' : '')">
      <div class="mochart-demo-modes-container">
        <form class="form-inline">
          <div class="form-group">
            <span class="form-control-plaintext">{{ text.demoModeLabel }}&nbsp;</span>
          </div>
          <div class="form-group">
            <div class="btn-toolbar" role="toolbar">
              <button type="button" [class]="'btn btn-' + (isSingle ? 'primary' : 'secondary')" [disabled]="isSingle"
                      [title]="text.modes.single.title"
                      (click)="onDemoModeChanged('single', demoId)">
                <app-icon size="lg" name="pen-to-square" /> {{ text.modes.single.label }}
              </button>
              <button type="button" [class]="'btn btn-' + (isMulti ? 'primary' : 'secondary')" [disabled]="isMulti"
                      [title]="text.modes.multi.title"
                      (click)="onDemoModeChanged('multi', demoId)">
                <app-icon size="lg" name="window-restore" /> {{ text.modes.multi.label }}
              </button>
              <button type="button" [class]="'btn btn-' + (isRandom ? 'primary' : 'secondary')" [disabled]="isRandom"
                      [title]="text.modes.random.title"
                      (click)="onDemoModeChanged('random', demoId)">
                <app-icon size="lg" name="shuffle" /> {{ text.modes.random.label }}
              </button>
              <button type="button" class="btn btn-secondary"
                      [title]="text.modes.transition.title"
                      (click)="onDemoModeChanged('transition', demoId)">
                <app-icon size="lg" name="right-left" /> {{ text.modes.transition.label }}
              </button>
              <button type="button" class="btn btn-secondary"
                      [title]="text.modes.rotation.title"
                      (click)="onDemoModeChanged('rotation', demoId)">
                <app-icon size="lg" name="repeat" /> {{ text.modes.rotation.label }}
              </button>
            </div>
          </div>
          <div class="form-group" style="margin-left: 10px;">
            <div class="btn-toolbar" role="toolbar">
              <button type="button" [class]="'btn btn-' + (isTestMode() ? 'primary' : 'secondary')" [attr.aria-pressed]="isTestMode()"
                      [title]="text.testDemos.title"
                      (click)="onTestModeToggle()">
                <app-icon size="lg" name="flask" /> {{ text.testDemos.label }}
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
  readonly text = demoText.demosTab;

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
