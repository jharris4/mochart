import { BrowserRouter as Router, Switch, Redirect, Route, withRouter } from 'react-router-dom';

import React from 'react';
import { render } from 'react-dom';

import demoData from './demos';

if (process.env.NODE_ENV === 'production') {
  // Injected by webpack...
  Raven.config(SENTRY_KEY, { release: VERSION }).install();
}

const { demoIds, testDemoIds, demoObjectMap } = demoData;
const initialDemoId = demoIds[0];

import './demo.css';

import DemoSingle from '../src/components/single/DemoSingle';
import DemoMulti from '../src/components/multi/DemoMulti';
import DemoRandom from '../src/components/random/DemoRandom';
import DemoTransition from '../src/components/transition/DemoTransition';
import DemoRotations from '../src/components/rotation/DemoRotation'

const RouteNotFound = props => <div>No route found{props.location ? props.location.pathname ? ' matching ' + props.location.pathname : '' : ''}</div>;

let routerBasePath = '/';

let config = window['__config'];
if (config !== void 0) {
  if (config['routerBasePath'] !== void 0) {
    routerBasePath = config['routerBasePath'];
  }
}

let router = (
  <Router basename={routerBasePath}>
    <Switch>
      <Redirect exact={true} from="/" to="/single/demos"/>
      <Redirect exact={true} from="/single" to="/single/demos"/>
      <Redirect exact={true} from="/multi" to="/multi/demos"/>
      <Redirect exact={true} from="/random" to="/random/demos"/>
      <Route exact={true} path="/single/:demoId" component={getRouteComponent(DemoSingle, 'single')}/>
      <Route exact={true} path="/multi/:demoId" component={getRouteComponent(DemoMulti, 'multi')}/>
      <Route exact={true} path="/random/:demoId"
        render={props => (
          <Redirect to={`/random/${props.match.params.demoId}/0`} />
        )}
      />
      <Route exact={true} path="/random/:demoId/:randomId" component={getRouteComponent(DemoRandom, 'random')} />
      <Route exact={true} path="/transition" component={DemoTransition}/>
      <Route exact={true} path="/rotation" component={DemoRotations}/>
      <Route component={RouteNotFound}/>
    </Switch>
  </Router>
);

function getDemoIdInfo(props) {
  let demoId = initialDemoId;
  let demoIdValid = true;
  let randomId;
  let randomIdValid = true;
  const { match } = props;
  const { params } = match ? match : {};
  if (params) {
    if (params.demoId !== void 0) {
      demoId = params.demoId;
      if (demoId !== 'demos' && demoObjectMap[demoId] === void 0) {
        demoIdValid = false;
      }
    }
    if (params.randomId !== void 0) {
      randomId = params.randomId;
      if (!(randomId > Number.MIN_SAFE_INTEGER && randomId < Number.MAX_SAFE_INTEGER)) {
        randomIdValid = false;
      }
    }
  }
  return {
    demoId,
    demoIdValid,
    randomId,
    randomIdValid
  };
}

function onDemoModeChanged(props) {
  const { history } = props;
  return (demoMode, demoId) => {
    const path = `${getBasePathForMode(demoMode)}/${demoId}`;
    history.push(path);
  };
}

function getBasePathForMode(demoMode) {
  return '/' + demoMode;
}

function onDemoChanged(props, demoMode) {
  const { history } = props;
  return (demoId) => {
    const path = `${getBasePathForMode(demoMode)}/${demoId}`;
    history.push(path);
  };
}

function incrementRandomId(props) {
  let demoIdInfo = getDemoIdInfo(props);
  const { match, history } = props;
  const { params } = match;
  const { randomId, demoId } = params;
  if (randomId !== void 0 && +randomId > Number.MIN_SAFE_INTEGER && +randomId < Number.MAX_SAFE_INTEGER - 1) {
    return () => {
      const path = `${getBasePathForMode('random')}/${demoId}/${Math.floor(+randomId) + 1}`;
      history.push(path);
    };
  }
  else {
    return () => {};
  }
}

function decrementRandomId(props) {
  let demoIdInfo = getDemoIdInfo(props);
  const { match, history } = props;
  const { params } = match;
  const { randomId, demoId } = params;
  if (randomId !== void 0 && +randomId > Number.MIN_SAFE_INTEGER && +randomId < Number.MAX_SAFE_INTEGER - 1) {
    return () => {
      const path = `${getBasePathForMode('random')}/${demoId}/${Math.floor(+randomId) - 1}`;
      history.push(path);
    };
  }
  else {
    return () => { };
  }
}

function getRouteComponent(DemoComponent, demoMode) {
  return withRouter(props => {
    let demoIdInfo = getDemoIdInfo(props);
    if (demoIdInfo.demoIdValid) {
      if (demoIdInfo.randomId) {
        if (demoIdInfo.randomIdValid) {
          return <DemoComponent demoData={demoData} initialDemoId={demoIdInfo.demoId} demoMode={demoMode}
            onDemoModeChanged={onDemoModeChanged(props)} onDemoChanged={onDemoChanged(props, demoMode)}
            randomId={+demoIdInfo.randomId} incrementRandomId={incrementRandomId(props)} decrementRandomId={decrementRandomId(props)}/>;
        }
        else {
          return <div>Bad random id: {demoIdInfo.randomId}</div>;
        }
      }
      else {
        return <DemoComponent demoData={demoData} initialDemoId={demoIdInfo.demoId} demoMode={demoMode}
          onDemoModeChanged={onDemoModeChanged(props)} onDemoChanged={onDemoChanged(props, demoMode)} />;
      }
    }
    else {
      return <div>No demo found for id: {demoIdInfo.demoId}</div>;
    }
  });
}

if (window && window.navigator && window.navigator.userAgent && /Edge\/1[0-4]\./.test(window.navigator.userAgent)) {
  // Fix for bug in Microsoft Edge: https://github.com/Microsoft/ChakraCore/issues/1415#issuecomment-246424339
  console.log('Applying function.call fix for Microsoft Edge <= 14');
  Function.prototype.call = function(t) {
    return this.apply(t, Array.prototype.slice.apply(arguments, [1]));
  };
}

render(
  router,
  document.getElementById('root')
);