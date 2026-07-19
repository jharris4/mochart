import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { demoText } from '@mochart/demo-common';

// The site build injects VITE_SITE_ROOT (the docs site root) so the demo can
// link back to it; standalone dev/build leaves it unset and no link renders.
const siteRootUrl = import.meta.env.VITE_SITE_ROOT as string | undefined;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  styles: [':host { display: block; width: 100%; height: 100%; }'],
  template: `
    @if (siteRootUrl !== undefined) {
      <a class="btn btn-secondary btn-sm" style="position: fixed; top: 14px; right: 18px; z-index: 1030;"
        [href]="siteRootUrl" [title]="siteRootLink.tooltip" [attr.aria-label]="siteRootLink.aria">{{ siteRootLink.label }}</a>
    }
    <router-outlet />
  `
})
export class App {
  readonly siteRootUrl = siteRootUrl;
  readonly siteRootLink = demoText.siteRootLink;
}
