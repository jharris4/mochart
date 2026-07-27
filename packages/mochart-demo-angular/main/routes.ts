// The gallery at /demos is the landing route; a demo is always viewed at
// /<mode>/<demoId>. The legacy scheme used a 'demos' pseudo-demo-id for the
// list ("/single/demos"), so those URLs redirect to the gallery. Relative
// redirect targets keep the query string (e.g. the ?siteRoot debug switch).
// Route params bind to page inputs via withComponentInputBinding (main/index.ts).
import type { Routes } from '@angular/router';

import { GalleryPage } from './pages/gallery-page';
import { SinglePage } from './pages/single-page';
import { MultiPage } from './pages/multi-page';
import { RandomPage } from './pages/random-page';
import { TransitionPage } from './pages/transition-page';
import { RotationPage } from './pages/rotation-page';
import { SparklinePage } from './pages/sparkline-page';
import { NotFoundPage } from './pages/not-found-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'demos' },
  { path: 'demos', component: GalleryPage },
  { path: 'single', pathMatch: 'full', redirectTo: 'demos' },
  { path: 'multi', pathMatch: 'full', redirectTo: 'demos' },
  { path: 'random', pathMatch: 'full', redirectTo: 'demos' },
  { path: 'single/demos', pathMatch: 'full', redirectTo: 'demos' },
  { path: 'multi/demos', pathMatch: 'full', redirectTo: 'demos' },
  { path: 'random/demos', pathMatch: 'full', redirectTo: 'demos' },
  { path: 'random/demos/:randomId', pathMatch: 'full', redirectTo: 'demos' },
  { path: 'single/:demoId', component: SinglePage },
  { path: 'multi/:demoId', component: MultiPage },
  { path: 'random/:demoId', pathMatch: 'full', redirectTo: 'random/:demoId/0' },
  { path: 'random/:demoId/:randomId', component: RandomPage },
  { path: 'transition', component: TransitionPage },
  { path: 'rotation', component: RotationPage },
  { path: 'sparkline', component: SparklinePage },
  { path: '**', component: NotFoundPage }
];
