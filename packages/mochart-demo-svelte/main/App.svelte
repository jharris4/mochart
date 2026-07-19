<script lang="ts">
  import { getPath, navigate } from './router.svelte.js';

  import demoData from '@mochart/demo-data';

  import { demoText } from '@mochart/demo-common';

  import DemoSingle from '../src/components/single/DemoSingle.svelte';
  import DemoMulti from '../src/components/multi/DemoMulti.svelte';
  import DemoRandom from '../src/components/random/DemoRandom.svelte';
  import DemoTransition from '../src/components/transition/DemoTransition.svelte';
  import DemoRotation from '../src/components/rotation/DemoRotation.svelte';

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

  // The site build injects VITE_SITE_ROOT (the docs site root) so the demo can
  // link back to it; standalone dev/build leaves it unset and no link renders.
  const siteRootUrl = import.meta.env.VITE_SITE_ROOT as string | undefined;

  // Same routes as the react demo (react-router 7), resolved by hand.
  const route = $derived.by((): Route => {
    const path = getPath();
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
  });

  $effect(() => {
    if (route.redirect !== void 0) {
      navigate(route.redirect, { replace: true });
    }
  });

  function getBasePathForMode(demoMode: string): string {
    return '/' + demoMode;
  }

  function onDemoModeChanged(nextDemoMode: DemoMode, nextDemoId?: string) {
    if (nextDemoMode === 'transition' || nextDemoMode === 'rotation') {
      navigate(getBasePathForMode(nextDemoMode));
    }
    else {
      navigate(`${getBasePathForMode(nextDemoMode)}/${nextDemoId !== void 0 ? nextDemoId : initialDemoId}`);
    }
  }

  function makeOnDemoChanged(demoMode: string) {
    return (nextDemoId: string) => {
      navigate(`${getBasePathForMode(demoMode)}/${nextDemoId}`);
    };
  }

  const demoId = $derived(route.demoId !== void 0 ? route.demoId : initialDemoId);
  const isKnownDemo = $derived(demoId === 'demos' || demoObjectMap[demoId] !== void 0);
  const randomId = $derived(Number(route.randomId));
  const isValidRandomId = $derived(randomId > Number.MIN_SAFE_INTEGER && randomId < Number.MAX_SAFE_INTEGER);

  function incrementRandomId() {
    navigate(`${getBasePathForMode('random')}/${demoId}/${Math.floor(randomId) + 1}`);
  }

  function decrementRandomId() {
    navigate(`${getBasePathForMode('random')}/${demoId}/${Math.floor(randomId) - 1}`);
  }
</script>

{#if siteRootUrl !== void 0}
  <a class="btn btn-secondary btn-sm" style="position: fixed; top: 14px; right: 18px; z-index: 1030;"
    href={siteRootUrl} title={demoText.siteRootLink.tooltip} aria-label={demoText.siteRootLink.aria}>{demoText.siteRootLink.label}</a>
{/if}
{#if route.redirect !== void 0}
  <!-- redirecting -->
{:else if route.notFound !== void 0}
  <div>No route found matching {route.notFound}</div>
{:else if route.mode === 'transition' || route.mode === 'rotation'}
  <!-- The transition/rotation demos have no navigation of their own, so give
       them a way back to the main demo gallery. -->
  <div style="height: 100%; display: flex; flex-direction: column;">
    <div style="padding: 14px 18px 0;">
      <button type="button" class="btn btn-secondary btn-sm" onclick={() => navigate('/single/demos')}>&larr; Back to demos</button>
    </div>
    <div style="flex: 1; min-height: 0;">
      {#if route.mode === 'transition'}
        <DemoTransition />
      {:else}
        <DemoRotation />
      {/if}
    </div>
  </div>
{:else if !isKnownDemo}
  <div>No demo found for id: {demoId}</div>
{:else if route.mode === 'single'}
  <DemoSingle {demoData} initialDemoId={demoId} demoMode="single"
    {onDemoModeChanged} onDemoChanged={makeOnDemoChanged('single')} />
{:else if route.mode === 'multi'}
  <DemoMulti {demoData} initialDemoId={demoId} demoMode="multi"
    {onDemoModeChanged} onDemoChanged={makeOnDemoChanged('multi')} />
{:else if route.mode === 'random'}
  {#if !isValidRandomId}
    <div>Bad random id: {route.randomId}</div>
  {:else}
    <DemoRandom {demoData} initialDemoId={demoId} demoMode="random"
      {onDemoModeChanged} onDemoChanged={makeOnDemoChanged('random')}
      {randomId} {incrementRandomId} {decrementRandomId} />
  {/if}
{/if}
