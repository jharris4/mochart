import type { Router } from '@angular/router';

import demoData from 'mochart-demo-data';

import type { DemoMode, OnDemoModeChanged, OnDemoChanged } from '../../src/types';

export const initialDemoId = demoData.demoIds[0];

export interface DemoNavigation {
  onDemoModeChanged: OnDemoModeChanged;
  makeOnDemoChanged: (demoMode: DemoMode) => OnDemoChanged;
}

/**
 * The mode/demo navigation callbacks shared by the routed pages — the same
 * URL scheme as the react demo (react-router 7), driven by @angular/router.
 */
export function createDemoNavigation(router: Router): DemoNavigation {
  const onDemoModeChanged: OnDemoModeChanged = (nextDemoMode, nextDemoId) => {
    if (nextDemoMode === 'transition' || nextDemoMode === 'rotation') {
      void router.navigate(['/', nextDemoMode]);
    }
    else {
      void router.navigate(['/', nextDemoMode, nextDemoId !== void 0 ? nextDemoId : initialDemoId]);
    }
  };
  const makeOnDemoChanged = (demoMode: DemoMode): OnDemoChanged => (nextDemoId: string) => {
    void router.navigate(['/', demoMode, nextDemoId]);
  };
  return { onDemoModeChanged, makeOnDemoChanged };
}

export function isKnownDemo(demoId: string): boolean {
  return demoId === 'demos' || demoData.demoObjectMap[demoId] !== void 0;
}
