import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router';

import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/fontawesome.min.css';
import '@fortawesome/fontawesome-free/css/solid.min.css';
import './demo.css';

import demoData from '@mochart/demo-data';

import { demoText } from '@mochart/demo-common';

import DemoSingle from '../src/components/single/DemoSingle';
import DemoMulti from '../src/components/multi/DemoMulti';
import DemoRandom from '../src/components/random/DemoRandom';
import DemoTransition from '../src/components/transition/DemoTransition';
import DemoRotation from '../src/components/rotation/DemoRotation';

import type { DemoMode, DemoTabProps } from '../src/types';

interface DemoWindowConfig {
  routerBasePath?: string;
}

const { demoIds, demoObjectMap } = demoData;
const initialDemoId = demoIds[0];

let routerBasePath = '/';

const config = (window as unknown as { __config?: DemoWindowConfig })['__config'];
if (config !== void 0) {
  if (config['routerBasePath'] !== void 0) {
    routerBasePath = config['routerBasePath'];
  }
}

function RouteNotFound() {
  const location = useLocation();
  return <div>No route found{location && location.pathname ? ' matching ' + location.pathname : ''}</div>;
}

function getBasePathForMode(demoMode: string) {
  return '/' + demoMode;
}

function useDemoNavigation(demoMode: DemoMode) {
  const navigate = useNavigate();
  const onDemoModeChanged = (nextDemoMode: DemoMode, nextDemoId?: string) => {
    if (nextDemoMode === 'transition' || nextDemoMode === 'rotation') {
      navigate(getBasePathForMode(nextDemoMode));
    }
    else {
      navigate(`${getBasePathForMode(nextDemoMode)}/${nextDemoId !== void 0 ? nextDemoId : initialDemoId}`);
    }
  };
  const onDemoChanged = (nextDemoId: string) => {
    navigate(`${getBasePathForMode(demoMode)}/${nextDemoId}`);
  };
  return { onDemoModeChanged, onDemoChanged };
}

interface DemoModeRouteProps {
  Component: React.ComponentType<DemoTabProps>;
  demoMode: DemoMode;
}

function DemoModeRoute({ Component, demoMode }: DemoModeRouteProps) {
  const params = useParams();
  const nav = useDemoNavigation(demoMode);
  const demoId = params.demoId !== void 0 ? params.demoId : initialDemoId;
  if (demoId !== 'demos' && demoObjectMap[demoId] === void 0) {
    return <div>No demo found for id: {demoId}</div>;
  }
  return <Component demoData={demoData} initialDemoId={demoId} demoMode={demoMode}
    onDemoModeChanged={nav.onDemoModeChanged} onDemoChanged={nav.onDemoChanged} />;
}

function RandomRedirect() {
  const { demoId } = useParams();
  return <Navigate to={`/random/${demoId}/0`} replace />;
}

function RandomRoute() {
  const params = useParams();
  const navigate = useNavigate();
  const nav = useDemoNavigation('random');
  const demoId = params.demoId !== void 0 ? params.demoId : initialDemoId;
  if (demoId !== 'demos' && demoObjectMap[demoId] === void 0) {
    return <div>No demo found for id: {demoId}</div>;
  }
  const randomId = Number(params.randomId);
  if (!(randomId > Number.MIN_SAFE_INTEGER && randomId < Number.MAX_SAFE_INTEGER)) {
    return <div>Bad random id: {params.randomId}</div>;
  }
  const incrementRandomId = () => {
    navigate(`${getBasePathForMode('random')}/${demoId}/${Math.floor(randomId) + 1}`);
  };
  const decrementRandomId = () => {
    navigate(`${getBasePathForMode('random')}/${demoId}/${Math.floor(randomId) - 1}`);
  };
  return <DemoRandom demoData={demoData} initialDemoId={demoId} demoMode="random"
    onDemoModeChanged={nav.onDemoModeChanged} onDemoChanged={nav.onDemoChanged}
    randomId={randomId} incrementRandomId={incrementRandomId} decrementRandomId={decrementRandomId} />;
}

// The transition/rotation demos have no navigation of their own, so give them
// a way back to the main demo gallery.
function BackBar({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 18px 0' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/single/demos')}>&larr; Back to demos</button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}

// Same routes as the old webpack/react-router 5 build, minus code splitting.
function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/single/demos" replace />} />
      <Route path="/single" element={<Navigate to="/single/demos" replace />} />
      <Route path="/multi" element={<Navigate to="/multi/demos" replace />} />
      <Route path="/random" element={<Navigate to="/random/demos" replace />} />
      <Route path="/single/:demoId" element={<DemoModeRoute Component={DemoSingle} demoMode="single" />} />
      <Route path="/multi/:demoId" element={<DemoModeRoute Component={DemoMulti} demoMode="multi" />} />
      <Route path="/random/:demoId" element={<RandomRedirect />} />
      <Route path="/random/:demoId/:randomId" element={<RandomRoute />} />
      <Route path="/transition" element={<BackBar><DemoTransition /></BackBar>} />
      <Route path="/rotation" element={<BackBar><DemoRotation /></BackBar>} />
      <Route path="*" element={<RouteNotFound />} />
    </Routes>
  );
}

// The site build injects VITE_SITE_ROOT (the docs site root) so the demo can
// link back to it; standalone dev/build leaves it unset and no link renders.
const siteRootUrl = import.meta.env.VITE_SITE_ROOT as string | undefined;

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('demo root element (#root) not found');
}

createRoot(rootElement).render(
  <>
    {siteRootUrl !== void 0
      ? <a className="btn btn-secondary btn-sm" style={{ position: 'fixed', top: 14, right: 18, zIndex: 1030 }}
          href={siteRootUrl} title={demoText.siteRootLink.tooltip} aria-label={demoText.siteRootLink.aria}>
          {demoText.siteRootLink.label}
        </a>
      : null}
    <BrowserRouter basename={routerBasePath}>
      <App />
    </BrowserRouter>
  </>
);
