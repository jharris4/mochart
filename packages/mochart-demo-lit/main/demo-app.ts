import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { getPath, navigate, subscribe } from './router';

import demoData from './demos';

import { LightElement } from '../src/components/misc/LightElement';
import '../src/components/single/demo-single';
import '../src/components/multi/demo-multi';
import '../src/components/random/demo-random';
import '../src/components/transition/demo-transition';
import '../src/components/rotation/demo-rotation';

import type { DemoMode } from '../src/types';

interface Route {
  redirect?: string;
  notFound?: string;
  mode?: string;
  demoId?: string;
  randomId?: string;
}

const { demoIds, demoObjectMap } = demoData;
const initialDemoId = demoIds[0];

// Same routes as the react demo (react-router 7), resolved by hand.
function getRoute(path: string): Route {
  const segments = path.split('/').filter(segment => segment.length > 0);
  if (segments.length === 0) {
    return { redirect: '/single/demos' };
  }
  const [mode, demoId, randomId] = segments;
  if ((mode === 'single' || mode === 'multi' || mode === 'random') && segments.length === 1) {
    return { redirect: `/${mode}/demos` };
  }
  if ((mode === 'single' || mode === 'multi') && segments.length === 2) {
    return { mode, demoId };
  }
  if (mode === 'random' && segments.length === 2) {
    return { redirect: `/random/${demoId}/0` };
  }
  if (mode === 'random' && segments.length === 3) {
    return { mode, demoId, randomId };
  }
  if ((mode === 'transition' || mode === 'rotation') && segments.length === 1) {
    return { mode };
  }
  return { notFound: path };
}

function getBasePathForMode(demoMode: string): string {
  return '/' + demoMode;
}

@customElement('demo-app')
export class DemoApp extends LightElement {
  @state() private path = getPath();

  private unsubscribe: (() => void) | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.unsubscribe = subscribe(() => {
      this.path = getPath();
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  override updated(): void {
    const route = getRoute(this.path);
    if (route.redirect !== void 0) {
      navigate(route.redirect, { replace: true });
    }
  }

  private onDemoModeChanged = (nextDemoMode: DemoMode, nextDemoId?: string): void => {
    if (nextDemoMode === 'transition' || nextDemoMode === 'rotation') {
      navigate(getBasePathForMode(nextDemoMode));
    }
    else {
      navigate(`${getBasePathForMode(nextDemoMode)}/${nextDemoId !== void 0 ? nextDemoId : initialDemoId}`);
    }
  };

  private makeOnDemoChanged(demoMode: string): (nextDemoId: string) => void {
    return (nextDemoId: string) => {
      navigate(`${getBasePathForMode(demoMode)}/${nextDemoId}`);
    };
  }

  override render(): unknown {
    const route = getRoute(this.path);
    if (route.redirect !== void 0) {
      // redirecting (in updated())
      return null;
    }
    if (route.notFound !== void 0) {
      return html`<div>No route found matching ${route.notFound}</div>`;
    }
    // The transition/rotation demos have no navigation of their own, so give
    // them a way back to the main demo gallery.
    if (route.mode === 'transition' || route.mode === 'rotation') {
      return html`<div style="height: 100%; display: flex; flex-direction: column;">
        <div style="padding: 14px 18px 0;">
          <button type="button" class="btn btn-secondary btn-sm" @click=${() => navigate('/single/demos')}>&larr; Back to demos</button>
        </div>
        <div style="flex: 1; min-height: 0;">
          ${route.mode === 'transition'
            ? html`<demo-transition></demo-transition>`
            : html`<demo-rotation></demo-rotation>`}
        </div>
      </div>`;
    }
    const demoId = route.demoId !== void 0 ? route.demoId : initialDemoId;
    const isKnownDemo = demoId === 'demos' || demoObjectMap[demoId] !== void 0;
    if (!isKnownDemo) {
      return html`<div>No demo found for id: ${demoId}</div>`;
    }
    if (route.mode === 'single') {
      return html`<demo-single .demoData=${demoData} .initialDemoId=${demoId} .demoMode=${'single' as DemoMode}
          .onDemoModeChanged=${this.onDemoModeChanged} .onDemoChanged=${this.makeOnDemoChanged('single')}></demo-single>`;
    }
    if (route.mode === 'multi') {
      return html`<demo-multi .demoData=${demoData} .initialDemoId=${demoId} .demoMode=${'multi' as DemoMode}
          .onDemoModeChanged=${this.onDemoModeChanged} .onDemoChanged=${this.makeOnDemoChanged('multi')}></demo-multi>`;
    }
    const randomId = Number(route.randomId);
    const isValidRandomId = randomId > Number.MIN_SAFE_INTEGER && randomId < Number.MAX_SAFE_INTEGER;
    if (!isValidRandomId) {
      return html`<div>Bad random id: ${route.randomId}</div>`;
    }
    const incrementRandomId = (): void => {
      navigate(`${getBasePathForMode('random')}/${demoId}/${Math.floor(randomId) + 1}`);
    };
    const decrementRandomId = (): void => {
      navigate(`${getBasePathForMode('random')}/${demoId}/${Math.floor(randomId) - 1}`);
    };
    return html`<demo-random .demoData=${demoData} .initialDemoId=${demoId} .demoMode=${'random' as DemoMode}
        .onDemoModeChanged=${this.onDemoModeChanged} .onDemoChanged=${this.makeOnDemoChanged('random')}
        .randomId=${randomId} .incrementRandomId=${incrementRandomId} .decrementRandomId=${decrementRandomId}></demo-random>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'demo-app': DemoApp;
  }
}
