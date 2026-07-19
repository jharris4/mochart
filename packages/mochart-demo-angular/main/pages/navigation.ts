import type { Router } from '@angular/router';

import demoData from '@mochart/demo-data';

import type { SwitchableDemoMode } from '../../src/types';

// The site build injects VITE_SITE_ROOT (the docs site root) so the demo can
// link back to it; standalone dev/build leaves it unset and no link renders.
// Every view places the link itself (top-left, before its own navigation).
// For styling/debugging without a site build, `?siteRoot` forces the button
// (linking to `/`), and `?siteRoot=<url>` points it at a specific target.
function getDebugSiteRootUrl(): string | undefined {
  const param = new URLSearchParams(window.location.search).get('siteRoot');
  if (param === null) {
    return undefined;
  }
  return param === '' ? '/' : param;
}

export const siteRootUrl = (import.meta.env.VITE_SITE_ROOT as string | undefined) ?? getDebugSiteRootUrl();

/**
 * Navigate preserving the current query string (e.g. the ?siteRoot debug
 * switch); routes themselves only ever consume the pathname.
 */
export function navigate(router: Router, commands: (string | number)[]): void {
  void router.navigate(commands, { queryParamsHandling: 'preserve' });
}

export interface DemoNavigation {
  onBackToDemos: () => void;
  makeOnModeChanged: (getDemoId: () => string) => (nextDemoMode: SwitchableDemoMode) => void;
}

/**
 * The gallery/mode navigation callbacks shared by the routed pages — the
 * gallery lives at /demos and a demo is always viewed at /<mode>/<demoId>,
 * driven by @angular/router.
 */
export function createDemoNavigation(router: Router): DemoNavigation {
  return {
    onBackToDemos: () => navigate(router, ['/demos']),
    // Switching mode keeps the current demo; the demo id comes from the route
    // param binding so the switcher stays correct after any navigation.
    makeOnModeChanged: (getDemoId) => (nextDemoMode) => {
      const demoId = getDemoId();
      if (nextDemoMode === 'random') {
        navigate(router, ['/random', demoId, 0]);
      }
      else {
        navigate(router, ['/', nextDemoMode, demoId]);
      }
    }
  };
}

export function isKnownDemo(demoId: string): boolean {
  return demoData.demoObjectMap[demoId] !== void 0;
}
