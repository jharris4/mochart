
import { getFocusDataForPercent } from './FocusAnimation';

import { getChartDataForAxisDelta, getChartDataForValueDelta } from './ChartAnimation';

export const dataTweenExpandStart = 'dataTweenExpandStart';
export const dataTweenExpandUpdate = 'dataTweenExpandUpdate';
export const dataTweenExpandComplete = 'dataTweenExpandComplete';

export const dataTweenValueStart = 'dataTweenValueStart';
export const dataTweenValueUpdate = 'dataTweenValueUpdate';
export const dataTweenValueComplete = 'dataTweenValueComplete';

export const dataTweenCollapseStart = 'dataTweenCollapseStart';
export const dataTweenCollapseUpdate = 'dataTweenCollapseUpdate';
export const dataTweenCollapseComplete = 'dataTweenCollapseComplete';

const MochartTween: ReturnType<typeof initMochartTween> & {
  _requestRaf?: () => void;
  _animationId?: number | null;
  _rafCallback?: (ts?: number) => void;
} = initMochartTween();

function initMochartTween() {
  let now;
  if (typeof (window) !== 'undefined' && window.performance !== void 0 && window.performance.now !== void 0) {
    now = window.performance.now.bind(window.performance);
  }
  else if (Date.now !== void 0) {
    now = Date.now;
  }
  else {
    now = function () {
      return new Date().getTime();
    };
  }

  let _tweens = {};
  let _pendingTweens = {};
  let _nextTweenId = 0;

  let add = function(tween) {
    _tweens[tween.id] = tween;
    _pendingTweens[tween.id] = tween;
  };

  let remove = function(tween) {
    delete _tweens[tween.id];
    delete _pendingTweens[tween.id];
  }

  let update = function(time) {
    let tweenIds = Object.keys(_tweens);

    if (tweenIds.length === 0) {
      return false;
    }

    time = time !== void 0 ? time : now();

    while (tweenIds.length > 0) {
			_pendingTweens = {};

      for (let tweenId of tweenIds) {
        if (_tweens[tweenId] !== void 0 && _tweens[tweenId].update(time) === false) {
          delete _tweens[tweenId];
        }
      }

      tweenIds = Object.keys(_pendingTweens);
    }
    return true;
  }

  let create = function(duration, delay = 0) {
    let id = _nextTweenId++;
    let startTime = null;
    let isPlaying = false;
    let onStartCallbackFired = false;
    let onStartCallback = null;
    let onUpdateCallback = null;
    let onStopCallback = null;
    let onCompleteCallback = null;
    let chainedTweens = [];

    let start = function(time) {
      add(tween);

      isPlaying = true;
		  onStartCallbackFired = false;

      startTime = delay + (time !== void 0 ? time : now());
      return tween;
    }

    let update = function(time) {
      if (time < startTime) {
			  return true;
		  }
      if (onStartCallbackFired === false) {
        if (onStartCallback !== null) {
          onStartCallback();
        }
        onStartCallbackFired = true;
      }

      let percentage = duration === 0 ? 1 : (time - startTime) / duration;
      percentage = percentage > 1 ? 1 : percentage;

      if (onUpdateCallback !== null) {
			  onUpdateCallback(percentage);
		  }

      if (percentage === 1) {
        if (onCompleteCallback !== null) {
					onCompleteCallback();
				}

        for (let chainedTween of chainedTweens) {
          chainedTween.start(startTime+duration);
        }

        return false;
      }

      return true;
    };

    let stopChainedTweens = function() {
      for (let chainedTween of chainedTweens) {
        chainedTween.stop();
      }
    }

    let chain = function(...tweens) {
      chainedTweens = tweens;
      return tween;
    }

    let stop = function() {
      if (!isPlaying) {
        return tween;
      }

      remove(tween);
      isPlaying = false;

      if (onStopCallback !== null) {
        onStopCallback();
      }

      stopChainedTweens();
      return tween;
    };

    let onStart = function(callback) {
      onStartCallback = callback;
      return tween;
    }

    let onUpdate = function(callback) {
      onUpdateCallback = callback;
      return tween;
    }

    let onComplete = function(callback) {
      onCompleteCallback = callback;
      return tween;
    }

    let onStop = function(callback) {
      onStopCallback = callback;
      return tween;
    }

    let tween = {
      id,
      start,
      update,
      stop,
      chain,
      onStart,
      onUpdate,
      onComplete
    };

    return tween;
  };

  return {
    now,
    add,
    remove,
    update,
    create
  };
}

if (MochartTween._requestRaf === void 0) {
  MochartTween._animationId = null;
  MochartTween._rafCallback = function(ts) {
    if (!ts) {
      ts = +(new Date());
    }
    if (MochartTween.update(ts)) {
      MochartTween._animationId = requestAnimationFrame(MochartTween._rafCallback);
    }
    else {
      MochartTween._animationId = null;
    }
  };
  MochartTween._requestRaf = function() {
    if (MochartTween._animationId === null) {
      MochartTween._animationId = requestAnimationFrame(MochartTween._rafCallback);
    }
  };
}

function startTween(tween) {
  if (MochartTween.now === Date.now) {
    // Fix for older versions of Safari
    requestAnimationFrame((time) => { tween.start(time); });
  }
  else {
    tween.start();
  }
}

export function getChartTweenManager() {
  let focusTween = null;
  let dataTween = null;

  let self = {
    tweenFocus: (mochartConfig, focusAnimationData, updateCallback, {
      completeCallback = () => {},
      startCallback = () => {}
    } = {}) => {
      self.cancelFocusTween();
      focusTween = buildFocusTween(mochartConfig, focusAnimationData, {
        updateCallback,
        completeCallback: () => { focusTween = null; completeCallback(); },
        startCallback

      });
      // TODO, defer start until after next raf callback?!
      startTween(focusTween);
      MochartTween._requestRaf();
    },
    cancelFocusTween: () => {
      if (focusTween !== null) {
        focusTween.stop();
        focusTween = null;
      }
    },
    tweenData: (mochartConfig, chartAnimationData, updateCallback, {
      completeCallback = () => {},
      startCallback = () => {},
      completeValueChangeCallback = () => {},
      startValueChangeCallback = () => {}
    } = {}) => {
      self.cancelDataTween();
      dataTween = buildDataTween(mochartConfig, chartAnimationData, {
        updateCallback,
        completeCallback: () => { dataTween = null; completeCallback(); },
        startCallback,
        completeValueChangeCallback,
        startValueChangeCallback
      });
      if (dataTween !== null) {
        startTween(dataTween);
      }
      else {
        completeCallback();
      }
      MochartTween._requestRaf();
    },
    cancelDataTween: () => {
      if (dataTween !== null) {
        dataTween.stop();
        dataTween = null;
      }
    },
    cancelTweens: () => {
      self.cancelFocusTween();
      self.cancelDataTween();
    }
  };

  return self;
}

function buildFocusTween(
  mochartConfig, focusAnimationData,
  {
    updateCallback,
    completeCallback = () => {},
    startCallback = () => {}
  }) {
  let focusDuration = mochartConfig.animationConfig.focusDuration;
  let duration = focusAnimationData.deltaPercentage * focusDuration;
  // delay the start of the focus tween by a few milliseconds to allow it to be canceled if another tween is built
  // immediately after, like when we mouseover the series, and then mouseout but immediately mouseover a series marker
  let delay = 5;
  let focusTween = MochartTween.create(duration, delay);
  focusTween.onStart(() => {
    updateCallback(focusAnimationData.start);
    startCallback();
  });
  focusTween.onUpdate(percentage => {
    updateCallback(getFocusDataForPercent(focusAnimationData, percentage));
  });
  focusTween.onComplete(() => {
    updateCallback(focusAnimationData.final);
    completeCallback();
  });
  return focusTween;
}

function buildDataTween(
  mochartConfig, chartAnimationData, {
    updateCallback,
    completeCallback = () => {},
    startCallback = () => {},
    completeValueChangeCallback = (_value?: any) => {},
    startValueChangeCallback = (_value?: any) => {}
  }) {
  const { axisExpansionData, valueChangeData, axisCollapseData } = chartAnimationData;
  let tweenData = [];
  if (axisExpansionData.deltaPercentage !== 0) {
    tweenData.push({
      onStart: () => { updateCallback(axisExpansionData.start, dataTweenExpandStart); },
      onUpdate: (percentage) => { updateCallback(getChartDataForAxisDelta(mochartConfig, chartAnimationData, true, percentage), dataTweenExpandUpdate); },
      onComplete: () => { updateCallback(axisExpansionData.final, dataTweenExpandComplete); },
      duration: mochartConfig.animationConfig.expansionDuration * axisExpansionData.deltaPercentage
    });
  }
  else {
    const { start, final } = axisExpansionData;
    if (start !== null && final !== null && start !== final) {
      tweenData.push({
        onStart: () => { updateCallback(start, dataTweenExpandStart); },
        onUpdate: (percentage) => { updateCallback(final, dataTweenExpandUpdate); },
        onComplete: () => { updateCallback(final, dataTweenExpandComplete); },
        duration: 0
      });
    }
  }
  if (valueChangeData.deltaPercentage !== 0) {
    tweenData.push({
      onStart: () => { updateCallback(valueChangeData.start, dataTweenValueStart); startValueChangeCallback(valueChangeData.start); },
      onUpdate: (percentage) => { updateCallback(getChartDataForValueDelta(mochartConfig, chartAnimationData, percentage), dataTweenValueUpdate); },
      onComplete: () => { updateCallback(valueChangeData.final, dataTweenValueComplete); completeValueChangeCallback(valueChangeData.final); },
      duration: (chartAnimationData.initialAnimation ? mochartConfig.animationConfig.initialDuration : mochartConfig.animationConfig.valueChangeDuration) * valueChangeData.deltaPercentage
    });
  }
  else {
    const { start, final } = valueChangeData;
    if (start !== null && final !== null && start !== final) {
      tweenData.push({
        onStart: () => { updateCallback(start, dataTweenValueStart); },
        onUpdate: (percentage) => { updateCallback(final, dataTweenValueUpdate); },
        onComplete: () => { updateCallback(final, dataTweenValueComplete); },
        duration: 0
      });
    }
  }
  if (axisCollapseData.deltaPercentage !== 0) {
    tweenData.push({
      onStart: () => { updateCallback(axisCollapseData.start, dataTweenCollapseStart); },
      onUpdate: (percentage) => { updateCallback(getChartDataForAxisDelta(mochartConfig, chartAnimationData, false, percentage), dataTweenCollapseUpdate); },
      onComplete: () => { updateCallback(axisCollapseData.final, dataTweenCollapseComplete); },
      duration: mochartConfig.animationConfig.collapseDuration * axisCollapseData.deltaPercentage
    });
  }
  else {
    const { start, final } = axisCollapseData;
    if (start !== null && final !== null && start !== final) {
      tweenData.push({
        onStart: () => { updateCallback(start, dataTweenExpandStart); },
        onUpdate: (percentage) => { updateCallback(final, dataTweenExpandUpdate); },
        onComplete: () => { updateCallback(final, dataTweenExpandComplete); },
        duration: 0
      });
    }
  }
  let firstTween = null;
  let lastTween = null;
  for (let i=0; i<tweenData.length; i++) {
    let newTween = MochartTween.create(tweenData[i].duration);
    if (i == 0) {
      newTween.onStart(() => {
        tweenData[i].onStart();
        startCallback();
      });
    }
    else {
      newTween.onStart(tweenData[i].onStart);
    }
    newTween.onUpdate(percentage => { tweenData[i].onUpdate(percentage); });
    if (i === tweenData.length-1) {
      newTween.onComplete(() => {
        tweenData[i].onComplete();
        completeCallback();
      });
    }
    else {
      newTween.onComplete(tweenData[i].onComplete);
    }
    if (firstTween === null) {
      firstTween = newTween;
    }
    if (lastTween !== null) {
      lastTween.chain(newTween);
    }
    lastTween = newTween;
  }
  return firstTween;
}