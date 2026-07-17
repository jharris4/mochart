import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import './demo.css';

import demoData from './demos';

import DemoSingle from '../src/components/single/DemoSingle';
import DemoMulti from '../src/components/multi/DemoMulti';
import DemoRandom from '../src/components/random/DemoRandom';
import DemoTransition from '../src/components/transition/DemoTransition';
import DemoRotation from '../src/components/rotation/DemoRotation';

const { demoIds, demoObjectMap } = demoData;
const initialDemoId = demoIds[0];

let routerBasePath = '/';

let config = window['__config'];
if (config !== void 0) {
  if (config['routerBasePath'] !== void 0) {
    routerBasePath = config['routerBasePath'];
  }
}

function RouteNotFound() {
  const location = useLocation();
  return <div>No route found{location && location.pathname ? ' matching ' + location.pathname : ''}</div>;
}

function getBasePathForMode(demoMode) {
  return '/' + demoMode;
}

function useDemoNavigation(demoMode) {
  const navigate = useNavigate();
  const onDemoModeChanged = (nextDemoMode, nextDemoId) => {
    if (nextDemoMode === 'transition' || nextDemoMode === 'rotation') {
      navigate(getBasePathForMode(nextDemoMode));
    }
    else {
      navigate(`${getBasePathForMode(nextDemoMode)}/${nextDemoId !== void 0 ? nextDemoId : initialDemoId}`);
    }
  };
  const onDemoChanged = (nextDemoId) => {
    navigate(`${getBasePathForMode(demoMode)}/${nextDemoId}`);
  };
  return { onDemoModeChanged, onDemoChanged };
}

function DemoModeRoute({ Component, demoMode }) {
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
  const randomId = +params.randomId;
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
function BackBar({ children }) {
  const navigate = useNavigate();
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 4 }}>
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

createRoot(document.getElementById('root')).render(
  <BrowserRouter basename={routerBasePath}>
    <App />
  </BrowserRouter>
);
