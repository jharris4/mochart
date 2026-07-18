import demoData from 'mochart-demo-data';

import { getPath, navigate, onNavigate } from './router';

import { el } from '../src/components/misc/dom';
import { demoSingle } from '../src/components/single/DemoSingle';
import type { DemoSingleHandle } from '../src/components/single/DemoSingle';
import { demoMulti } from '../src/components/multi/DemoMulti';
import type { DemoMultiHandle } from '../src/components/multi/DemoMulti';
import { demoRandom } from '../src/components/random/DemoRandom';
import type { DemoRandomHandle } from '../src/components/random/DemoRandom';
import { demoTransition } from '../src/components/transition/DemoTransition';
import { demoRotation } from '../src/components/rotation/DemoRotation';

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
function resolveRoute(path: string): Route {
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

function onDemoModeChanged(nextDemoMode: DemoMode, nextDemoId?: string): void {
  if (nextDemoMode === 'transition' || nextDemoMode === 'rotation') {
    navigate(getBasePathForMode(nextDemoMode));
  }
  else {
    navigate(`${getBasePathForMode(nextDemoMode)}/${nextDemoId !== undefined ? nextDemoId : initialDemoId}`);
  }
}

function makeOnDemoChanged(demoMode: string): (nextDemoId: string) => void {
  return (nextDemoId: string) => {
    navigate(`${getBasePathForMode(demoMode)}/${nextDemoId}`);
  };
}

type View =
  | { kind: 'none' }
  | { kind: 'message'; el: HTMLElement }
  | { kind: 'single'; handle: DemoSingleHandle }
  | { kind: 'multi'; handle: DemoMultiHandle }
  | { kind: 'random'; handle: DemoRandomHandle }
  | { kind: 'transition' | 'rotation'; el: HTMLElement; destroy: () => void };

export function mountApp(root: HTMLElement): void {
  let view: View = { kind: 'none' };

  function clearView(): void {
    if (view.kind === 'single' || view.kind === 'multi' || view.kind === 'random') {
      view.handle.destroy();
    }
    else if (view.kind === 'transition' || view.kind === 'rotation') {
      view.destroy();
    }
    root.replaceChildren();
    view = { kind: 'none' };
  }

  function showMessage(text: string): void {
    clearView();
    const element = el('div', { text });
    root.append(element);
    view = { kind: 'message', el: element };
  }

  // The transition/rotation demos have no navigation of their own, so give
  // them a way back to the main demo gallery.
  function showShellDemo(mode: 'transition' | 'rotation'): void {
    if (view.kind === mode) {
      return;
    }
    clearView();
    const demo = mode === 'transition' ? demoTransition() : demoRotation();
    const backButton = el('button', {
      className: 'btn btn-secondary btn-sm',
      attrs: { type: 'button' },
      text: '← Back to demos'
    });
    backButton.addEventListener('click', () => navigate('/single/demos'));
    const shell = el('div', { style: 'height: 100%; display: flex; flex-direction: column;' }, [
      el('div', { style: 'padding: 14px 18px 0;' }, [backButton]),
      el('div', { style: 'flex: 1; min-height: 0;' }, [demo.el])
    ]);
    root.append(shell);
    view = { kind: mode, el: shell, destroy: () => demo.destroy() };
  }

  function render(): void {
    const route = resolveRoute(getPath());

    if (route.redirect !== undefined) {
      navigate(route.redirect, { replace: true });
      return;
    }
    if (route.notFound !== undefined) {
      showMessage('No route found matching ' + route.notFound);
      return;
    }
    if (route.mode === 'transition' || route.mode === 'rotation') {
      showShellDemo(route.mode);
      return;
    }

    const demoId = route.demoId !== undefined ? route.demoId : initialDemoId;
    const isKnownDemo = demoId === 'demos' || demoObjectMap[demoId] !== undefined;
    if (!isKnownDemo) {
      showMessage('No demo found for id: ' + demoId);
      return;
    }

    if (route.mode === 'single') {
      if (view.kind === 'single') {
        view.handle.update(demoId);
      }
      else {
        clearView();
        const handle = demoSingle({
          demoData, initialDemoId: demoId, demoMode: 'single',
          onDemoModeChanged, onDemoChanged: makeOnDemoChanged('single')
        });
        root.append(handle.el);
        view = { kind: 'single', handle };
      }
    }
    else if (route.mode === 'multi') {
      if (view.kind === 'multi') {
        view.handle.update(demoId);
      }
      else {
        clearView();
        const handle = demoMulti({
          demoData, initialDemoId: demoId, demoMode: 'multi',
          onDemoModeChanged, onDemoChanged: makeOnDemoChanged('multi')
        });
        root.append(handle.el);
        view = { kind: 'multi', handle };
      }
    }
    else if (route.mode === 'random') {
      const randomId = Number(route.randomId);
      const isValidRandomId = randomId > Number.MIN_SAFE_INTEGER && randomId < Number.MAX_SAFE_INTEGER;
      if (!isValidRandomId) {
        showMessage('Bad random id: ' + route.randomId);
        return;
      }
      const incrementRandomId = () => {
        navigate(`${getBasePathForMode('random')}/${getCurrentRandomDemoId()}/${Math.floor(getCurrentRandomId()) + 1}`);
      };
      const decrementRandomId = () => {
        navigate(`${getBasePathForMode('random')}/${getCurrentRandomDemoId()}/${Math.floor(getCurrentRandomId()) - 1}`);
      };
      if (view.kind === 'random') {
        view.handle.update(demoId, randomId);
      }
      else {
        clearView();
        const handle = demoRandom({
          demoData, initialDemoId: demoId, demoMode: 'random',
          onDemoModeChanged, onDemoChanged: makeOnDemoChanged('random'),
          randomId, incrementRandomId, decrementRandomId
        });
        root.append(handle.el);
        view = { kind: 'random', handle };
      }
    }
  }

  // The randomize buttons read the demo id / random id from the current URL so
  // they stay correct after any navigation.
  function getCurrentRandomDemoId(): string {
    const route = resolveRoute(getPath());
    return route.demoId !== undefined ? route.demoId : initialDemoId;
  }

  function getCurrentRandomId(): number {
    const route = resolveRoute(getPath());
    return Number(route.randomId);
  }

  onNavigate(render);
  render();
}
