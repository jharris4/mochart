
import { getFocusDataForPercent } from './FocusAnimation';

import { getChartDataForAxisDelta, getChartDataForValueDelta } from './ChartAnimation';

import type { MochartConfig } from '../types/config';
import type { AnimationChartData, ChartAnimationData, FocusAnimationData, FocusData } from '../types/animation';

export const dataTweenExpandStart = 'dataTweenExpandStart' as const;
export const dataTweenExpandUpdate = 'dataTweenExpandUpdate' as const;
export const dataTweenExpandComplete = 'dataTweenExpandComplete' as const;

export const dataTweenValueStart = 'dataTweenValueStart' as const;
export const dataTweenValueUpdate = 'dataTweenValueUpdate' as const;
export const dataTweenValueComplete = 'dataTweenValueComplete' as const;

export const dataTweenCollapseStart = 'dataTweenCollapseStart' as const;
export const dataTweenCollapseUpdate = 'dataTweenCollapseUpdate' as const;
export const dataTweenCollapseComplete = 'dataTweenCollapseComplete' as const;

export type DataTweenEvent =
  | typeof dataTweenExpandStart | typeof dataTweenExpandUpdate | typeof dataTweenExpandComplete
  | typeof dataTweenValueStart | typeof dataTweenValueUpdate | typeof dataTweenValueComplete
  | typeof dataTweenCollapseStart | typeof dataTweenCollapseUpdate | typeof dataTweenCollapseComplete;

type VoidCallback = () => void;
type FocusUpdateCallback = (focusData: FocusData) => void;
type DataUpdateCallback = (chartData: AnimationChartData, event: DataTweenEvent) => void;

interface Tween {
  readonly id: number;
  start(time?: number): Tween;
  update(time: number): boolean;
  stop(): Tween;
  chain(...tweens: Tween[]): Tween;
  onStart(callback: VoidCallback): Tween;
  onUpdate(callback: (percentage: number) => void): Tween;
  onComplete(callback: VoidCallback): Tween;
}

interface TweenEngine {
  now: () => number;
  add(tween: Tween): void;
  remove(tween: Tween): void;
  update(time?: number): boolean;
  create(duration: number, delay?: number): Tween;
}

interface FocusTweenOptions {
  completeCallback?: VoidCallback;
  startCallback?: VoidCallback;
}

interface DataTweenOptions extends FocusTweenOptions {
  completeValueChangeCallback?: (chartData: AnimationChartData) => void;
  startValueChangeCallback?: (chartData: AnimationChartData) => void;
}

export interface ChartTweenManager {
  tweenFocus(mochartConfig: MochartConfig, focusAnimationData: FocusAnimationData, updateCallback: FocusUpdateCallback, options?: FocusTweenOptions): void;
  cancelFocusTween(): void;
  tweenData(mochartConfig: MochartConfig, chartAnimationData: ChartAnimationData, updateCallback: DataUpdateCallback, options?: DataTweenOptions): void;
  cancelDataTween(): void;
  cancelTweens(): void;
}

// Upper bound on same-frame chain cascades in the engine update loop; real
// chains are at most a few steps deep (expand -> value -> collapse).
const MAX_UPDATE_PASSES = 100;

interface DataTweenStep {
  onStart: VoidCallback;
  onUpdate: (percentage: number) => void;
  onComplete: VoidCallback;
  duration: number;
}

const MochartTween: TweenEngine & {
  _requestRaf?: () => void;
  _animationId?: number | null;
  _rafCallback?: FrameRequestCallback;
} = initMochartTween();

function initMochartTween(): TweenEngine {
  // Resolved per call rather than bound at import so that clocks installed
  // after this module loads (e.g. test fake timers) are honored.
  const now = function(): number {
    if (typeof (window) !== 'undefined' && window.performance !== undefined && window.performance.now !== undefined) {
      return window.performance.now();
    }
    return Date.now();
  };

  let _tweens: Record<string, Tween> = {};
  let _pendingTweens: Record<string, Tween> = {};
  let _nextTweenId = 0;

  const add = function(tween: Tween): void {
    _tweens[tween.id] = tween;
    _pendingTweens[tween.id] = tween;
  };

  const remove = function(tween: Tween): void {
    delete _tweens[tween.id];
    delete _pendingTweens[tween.id];
  }

  const update = function(time?: number): boolean {
    let tweenIds = Object.keys(_tweens);

    if (tweenIds.length === 0) {
      return false;
    }

    time = time !== undefined ? time : now();

    // A cascade this deep within one frame means a zero-duration chain cycle;
    // defer the remainder to the next frame instead of hanging the loop.
    let passes = 0;
    while (tweenIds.length > 0 && ++passes <= MAX_UPDATE_PASSES) {
			_pendingTweens = {};

      for (let tweenId of tweenIds) {
        if (_tweens[tweenId] !== undefined && _tweens[tweenId].update(time) === false) {
          delete _tweens[tweenId];
        }
      }

      tweenIds = Object.keys(_pendingTweens);
    }
    return true;
  }

  const create = function(duration: number, delay = 0): Tween {
    const id = _nextTweenId++;
    let startTime = 0;
    let isPlaying = false;
    let onStartCallbackFired = false;
    let onStartCallback: VoidCallback | null = null;
    let onUpdateCallback: ((percentage: number) => void) | null = null;
    let onCompleteCallback: VoidCallback | null = null;
    let chainedTweens: Tween[] = [];

    const start = function(time?: number): Tween {
      add(tween);

      isPlaying = true;
		  onStartCallbackFired = false;

      startTime = delay + (time !== undefined ? time : now());
      return tween;
    }

    const update = function(time: number): boolean {
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
        isPlaying = false;

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

    const stopChainedTweens = function(): void {
      for (let chainedTween of chainedTweens) {
        chainedTween.stop();
      }
    }

    const chain = function(...tweens: Tween[]): Tween {
      chainedTweens = tweens;
      return tween;
    }

    // Always cascades into chained tweens, even after this tween has already
    // completed — stopping the head of a chain must halt whichever step is
    // currently running.
    const stop = function(): Tween {
      if (isPlaying) {
        remove(tween);
        isPlaying = false;
      }

      stopChainedTweens();
      return tween;
    };

    const onStart = function(callback: VoidCallback): Tween {
      onStartCallback = callback;
      return tween;
    }

    const onUpdate = function(callback: (percentage: number) => void): Tween {
      onUpdateCallback = callback;
      return tween;
    }

    const onComplete = function(callback: VoidCallback): Tween {
      onCompleteCallback = callback;
      return tween;
    }

    const tween: Tween = {
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

if (MochartTween._requestRaf === undefined) {
  MochartTween._animationId = null;
  MochartTween._rafCallback = function(ts: number): void {
    if (!ts) {
      ts = MochartTween.now();
    }
    if (MochartTween.update(ts)) {
      MochartTween._animationId = requestAnimationFrame(MochartTween._rafCallback!);
    }
    else {
      MochartTween._animationId = null;
    }
  };
  MochartTween._requestRaf = function() {
    if (MochartTween._animationId === null) {
      MochartTween._animationId = requestAnimationFrame(MochartTween._rafCallback!);
    }
  };
}

export function getChartTweenManager(): ChartTweenManager {
  let focusTween: Tween | null = null;
  let dataTween: Tween | null = null;

  const self: ChartTweenManager = {
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
      focusTween.start();
      MochartTween._requestRaf!();
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
        dataTween.start();
      }
      else {
        completeCallback();
      }
      MochartTween._requestRaf!();
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
  mochartConfig: MochartConfig, focusAnimationData: FocusAnimationData,
  {
    updateCallback,
    completeCallback = () => {},
    startCallback = () => {}
  }: FocusTweenOptions & { updateCallback: FocusUpdateCallback }): Tween {
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
  mochartConfig: MochartConfig, chartAnimationData: ChartAnimationData, {
    updateCallback,
    completeCallback = () => {},
    startCallback = () => {},
    completeValueChangeCallback = () => {},
    startValueChangeCallback = () => {}
  }: DataTweenOptions & { updateCallback: DataUpdateCallback }): Tween | null {
  const { axisExpansionData, valueChangeData, axisCollapseData } = chartAnimationData;
  const tweenData: DataTweenStep[] = [];
  if (axisExpansionData.deltaPercentage !== 0) {
    if (axisExpansionData.start === null || axisExpansionData.final === null || axisExpansionData.final === undefined) {
      throw new Error('Axis expansion tween requires chart data');
    }
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
        onUpdate: () => { updateCallback(final, dataTweenExpandUpdate); },
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
        onUpdate: () => { updateCallback(final, dataTweenValueUpdate); },
        onComplete: () => { updateCallback(final, dataTweenValueComplete); },
        duration: 0
      });
    }
  }
  if (axisCollapseData.deltaPercentage !== 0) {
    if (axisCollapseData.start === null || axisCollapseData.final === null || axisCollapseData.final === undefined) {
      throw new Error('Axis collapse tween requires chart data');
    }
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
        onStart: () => { updateCallback(start, dataTweenCollapseStart); },
        onUpdate: () => { updateCallback(final, dataTweenCollapseUpdate); },
        onComplete: () => { updateCallback(final, dataTweenCollapseComplete); },
        duration: 0
      });
    }
  }
  let firstTween: Tween | null = null;
  let lastTween: Tween | null = null;
  for (let i=0; i<tweenData.length; i++) {
    let newTween = MochartTween.create(tweenData[i].duration);
    if (i === 0) {
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
