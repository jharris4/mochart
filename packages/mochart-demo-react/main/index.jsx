import React, { useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import './demo.css';

import demoData from './demos';

import DemoSingle from '../src/components/single/DemoSingle';
import DemoMulti from '../src/components/multi/DemoMulti';
import DemoRandom from '../src/components/random/DemoRandom';
import DemoTransition from '../src/components/transition/DemoTransition';
import DemoRotation from '../src/components/rotation/DemoRotation';

const { demoIds } = demoData;
const initialDemoId = demoIds[0];

// The transition/rotation demos were only reachable by URL under the old
// router and have no navigation of their own, so give them a way back.
function BackBar({ onBack, children }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 4 }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onBack}>&larr; Back to demos</button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}

// The old webpack build used react-router with code splitting; the resurrected
// app keeps navigation in plain component state instead.
function App() {
  const [demoMode, setDemoMode] = useState('single');
  const [demoId, setDemoId] = useState(initialDemoId);
  const [randomId, setRandomId] = useState(0);

  const onDemoModeChanged = useCallback((nextDemoMode, nextDemoId) => {
    setDemoMode(nextDemoMode);
    if (nextDemoId !== void 0) {
      setDemoId(nextDemoId);
    }
  }, []);

  const onDemoChanged = useCallback(nextDemoId => {
    setDemoId(nextDemoId);
  }, []);

  const incrementRandomId = useCallback(() => {
    setRandomId(currentRandomId => currentRandomId + 1);
  }, []);

  const decrementRandomId = useCallback(() => {
    setRandomId(currentRandomId => currentRandomId - 1);
  }, []);

  const demoProps = {
    demoData,
    initialDemoId: demoId,
    demoMode,
    onDemoModeChanged,
    onDemoChanged
  };

  switch (demoMode) {
    case 'single':
      return <DemoSingle {...demoProps} />;
    case 'multi':
      return <DemoMulti {...demoProps} />;
    case 'random':
      return <DemoRandom {...demoProps} randomId={randomId}
        incrementRandomId={incrementRandomId} decrementRandomId={decrementRandomId} />;
    case 'transition':
      return <BackBar onBack={() => setDemoMode('single')}><DemoTransition /></BackBar>;
    case 'rotation':
      return <BackBar onBack={() => setDemoMode('single')}><DemoRotation /></BackBar>;
    default:
      return <div>No demo found for mode: {demoMode}</div>;
  }
}

createRoot(document.getElementById('root')).render(<App />);
