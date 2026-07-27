import React, { useState, useRef, useEffect } from 'react';
import Icon from '../misc/Icon';

import { Chart } from '@mochart/react';
import type { MochartConfig } from '@mochart/core';
import { exportPNG, exportSVG } from '@mochart/export';

import { getChartExportOptions, demoText } from '@mochart/demo-common';
import type { ShareState } from '@mochart/demo-common';

import ButtonWithTooltip from '../misc/ButtonWithTooltip';
import ExportShareMenu from '../misc/ExportShareMenu';

import type { DemoDataProvider, RandomConfigWithValid } from '../../types';

const defaultRate = 2000;

interface Props {
  active?: boolean;
  mochartConfig: MochartConfig;
  dataProvider: DemoDataProvider | null;
  randomConfig: RandomConfigWithValid;
  initialRate?: number;
  onRandomizeBack: () => void;
  onRandomizeNext: () => void;
  applyReuse: boolean;
  toggleApplyReuse: () => void;
}

export default function RandomMochartChartsTab({ active, mochartConfig, dataProvider, randomConfig, initialRate, onRandomizeBack, onRandomizeNext, applyReuse, toggleApplyReuse }: Props) {
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chartSizerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  // A share link restores the interval; otherwise start on the default.
  const [rate, setRate] = useState(initialRate ?? defaultRate);
  const [rateText, setRateText] = useState<string | number>('' + (initialRate ?? defaultRate));

  const onStopClick = () => {
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
    }
    intervalIdRef.current = null;
    setPlaying(false);
  };

  // Stop playback when the tab toggles active (matches the old cWRP behavior).
  useEffect(() => {
    onStopClick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Clean up the interval on unmount.
  useEffect(() => () => {
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  }, []);

  // The routed randomId is baked into each render's onRandomizeNext, so the
  // interval must read the latest one via a ref — freezing the play-time
  // closure would navigate to the same randomId on every tick after the first.
  const onRandomizeNextRef = useRef(onRandomizeNext);
  onRandomizeNextRef.current = onRandomizeNext;

  const onPlayClick = () => {
    setPlaying(true);
    intervalIdRef.current = setInterval(() => onRandomizeNextRef.current(), rate);
  };

  const rateChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    let nextRate = rate;
    let nextRateText: any = event.target.value;
    if (!isNaN(parseFloat(nextRateText)) && isFinite(nextRateText)) {
      nextRateText = +nextRateText;
      if (nextRateText >= 5 && nextRateText <= 60000) {
        nextRate = nextRateText;
      }
    }
    setRateText(nextRateText);
    setRate(nextRate);
  };

  const onExportPng = () => {
    const container = chartSizerRef.current;
    if (container) {
      void exportPNG(container, getChartExportOptions());
    }
  };

  const onExportSvg = () => {
    const container = chartSizerRef.current;
    if (container) {
      exportSVG(container, getChartExportOptions());
    }
  };

  // Share captures the generator config, the reuse toggle and the interval; the
  // step comes from the /random/:demoId/:randomId path already in the URL.
  const getShareState = (): ShareState => ({
    mode: 'random', randomConfig, applyReuse, interval: rate
  });

  return (
    <div className={"mochart-demo-tab-container demo-layout-col chart" + (active ? " active" : "")}>
      <div className="random-chart-sizer" ref={chartSizerRef}>
        {/* Chart self-measures when width/height are omitted. */}
        <Chart style={{ flex: '1 1 auto', minWidth: 0, minHeight: 0, overflow: 'hidden' }}
          mochartConfig={mochartConfig} dataProvider={dataProvider} />
      </div>
      <div className="random-controls">
        <form className="demo-form-row">
          <div className="demo-field">
            <div className="demo-toolbar" role="toolbar">
              <div className="demo-btn-group">
                <ButtonWithTooltip id="randomize-back" disabled={playing} label={demoText.randomChartTab.back.label}
                  tooltipText={demoText.randomChartTab.back.tooltip} tooltipPlacement="top-start"
                  onClick={onRandomizeBack} aria-label={demoText.randomChartTab.back.aria}>
                  <Icon size="lg" fixedWidth={true} name="dice" flip={'horizontal'} />
                </ButtonWithTooltip>
                <ButtonWithTooltip id="randomize-next" disabled={playing} label={demoText.randomChartTab.randomize.label}
                  tooltipText={demoText.randomChartTab.randomize.tooltip} tooltipPlacement="top-start"
                  onClick={onRandomizeNext} aria-label={demoText.randomChartTab.randomize.aria}>
                  <Icon size="lg" fixedWidth={true} name="dice" />
                </ButtonWithTooltip>
                <ButtonWithTooltip id="play" disabled={playing} tooltipText={demoText.randomChartTab.play.tooltip} tooltipPlacement="top-start"
                  onClick={onPlayClick} aria-label={demoText.randomChartTab.play.aria}>
                  <Icon size="lg" fixedWidth={true} name="play" />
                </ButtonWithTooltip>
                <ButtonWithTooltip id="stop" disabled={!playing} tooltipText={demoText.randomChartTab.stop.tooltip} tooltipPlacement="top-start"
                  onClick={onStopClick} aria-label={demoText.randomChartTab.stop.aria}>
                  <Icon size="lg" fixedWidth={true} name="stop" />
                </ButtonWithTooltip>
              </div>
              <div className="demo-field">
                <label className="demo-label" htmlFor="random-rate">{demoText.randomChartTab.intervalLabel}</label>
                <input id="random-rate" className="demo-input" disabled={playing} type="number" min={5} max={60000} step={100} value={rateText}
                  onChange={rateChanged} aria-label={demoText.randomChartTab.intervalAria} />
              </div>
            </div>
            <div className="demo-toolbar" role="toolbar">
              <div className="demo-btn-group">
                <ButtonWithTooltip id="reuse" disabled={playing} label={demoText.randomChartTab.reuse.label} pressed={applyReuse}
                  tooltipText={demoText.randomChartTab.reuse.tooltip} tooltipPlacement="top-start"
                  onClick={toggleApplyReuse} aria-label={demoText.randomChartTab.reuse.aria}>
                  <Icon size="lg" fixedWidth={true} name="recycle" />
                </ButtonWithTooltip>
              </div>
              <ExportShareMenu idPrefix="random" exportPng={onExportPng} exportSvg={onExportSvg} getShareState={getShareState} />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
