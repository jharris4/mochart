import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { DemoTransition } from '../../src/components/transition/demo-transition';

/**
 * The transition demo has no navigation of its own, so give it a way back to
 * the main demo gallery.
 */
@Component({
  selector: 'app-transition-page',
  imports: [DemoTransition],
  styles: [':host { display: contents; }'],
  template: `
    <div style="height: 100%; display: flex; flex-direction: column;">
      <div style="padding: 14px 18px 0;">
        <button type="button" class="btn btn-secondary btn-sm" (click)="backToDemos()">&larr; Back to demos</button>
      </div>
      <div style="flex: 1; min-height: 0;">
        <app-demo-transition />
      </div>
    </div>
  `
})
export class TransitionPage {
  private readonly router = inject(Router);

  backToDemos(): void {
    void this.router.navigate(['/single', 'demos']);
  }
}
