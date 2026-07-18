// Same URL scheme as the react demo (react-router 7), expressed as
// @angular/router routes. Route params bind to page inputs via
// withComponentInputBinding (see main/index.ts).
import type { Routes } from '@angular/router';

import { SinglePage } from './pages/single-page';
import { MultiPage } from './pages/multi-page';
import { RandomPage } from './pages/random-page';
import { TransitionPage } from './pages/transition-page';
import { RotationPage } from './pages/rotation-page';
import { NotFoundPage } from './pages/not-found-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/single/demos' },
  { path: 'single', pathMatch: 'full', redirectTo: '/single/demos' },
  { path: 'multi', pathMatch: 'full', redirectTo: '/multi/demos' },
  { path: 'random', pathMatch: 'full', redirectTo: '/random/demos' },
  { path: 'single/:demoId', component: SinglePage },
  { path: 'multi/:demoId', component: MultiPage },
  { path: 'random/:demoId', pathMatch: 'full', redirectTo: 'random/:demoId/0' },
  { path: 'random/:demoId/:randomId', component: RandomPage },
  { path: 'transition', component: TransitionPage },
  { path: 'rotation', component: RotationPage },
  { path: '**', component: NotFoundPage }
];
