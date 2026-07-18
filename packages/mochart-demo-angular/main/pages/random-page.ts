import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';

import demoData from '@mochart/demo-data';

import { DemoRandom } from '../../src/components/random/demo-random';
import { createDemoNavigation, isKnownDemo } from './navigation';

@Component({
  selector: 'app-random-page',
  imports: [DemoRandom],
  styles: [':host { display: contents; }'],
  template: `
    @if (!knownDemo) {
      <div>No demo found for id: {{ demoId }}</div>
    } @else if (!isValidRandomId) {
      <div>Bad random id: {{ randomId }}</div>
    } @else {
      <app-demo-random [demoData]="demoData" [initialDemoId]="demoId" [demoMode]="'random'"
                       [onDemoModeChanged]="nav.onDemoModeChanged" [onDemoChanged]="onDemoChanged"
                       [randomId]="randomIdNumber" [incrementRandomId]="incrementRandomId" [decrementRandomId]="decrementRandomId" />
    }
  `
})
export class RandomPage {
  /** Bound from the :demoId/:randomId route params (withComponentInputBinding). */
  @Input({ required: true }) demoId!: string;
  @Input({ required: true }) randomId!: string;

  readonly demoData = demoData;
  private readonly router = inject(Router);
  readonly nav = createDemoNavigation(this.router);
  readonly onDemoChanged = this.nav.makeOnDemoChanged('random');

  get knownDemo(): boolean {
    return isKnownDemo(this.demoId);
  }

  get randomIdNumber(): number {
    return Number(this.randomId);
  }

  get isValidRandomId(): boolean {
    return this.randomIdNumber > Number.MIN_SAFE_INTEGER && this.randomIdNumber < Number.MAX_SAFE_INTEGER;
  }

  incrementRandomId = (): void => {
    void this.router.navigate(['/random', this.demoId, Math.floor(this.randomIdNumber) + 1]);
  };

  decrementRandomId = (): void => {
    void this.router.navigate(['/random', this.demoId, Math.floor(this.randomIdNumber) - 1]);
  };
}
