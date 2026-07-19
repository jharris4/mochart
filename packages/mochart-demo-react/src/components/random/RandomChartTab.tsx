import React, { useState, useRef, useEffect } from 'react';
import { Form, FormGroup, Input, ButtonToolbar, ButtonGroup } from 'reactstrap';
import Icon from '../misc/Icon';

import { Chart } from '@mochart/react';
import type { MochartConfig } from '@mochart/core';

import { demoText } from '@mochart/demo-common';

import ButtonWithTooltip from '../misc/ButtonWithTooltip';
import ExportButtons from '../misc/ExportButtons';

import type { DemoDataProvider } from '../../types';

const defaultRate = 2000;

interface Props {
  active?: boolean;
  mochartConfig: MochartConfig;
  dataProvider: DemoDataProvider | null;
  onRandomizeBack: () => void;
  onRandomizeNext: () => void;
  applyReuse: boolean;
  toggleApplyReuse: () => void;
}

export default function RandomMochartChartsTab({ active, mochartConfig, dataProvider, onRandomizeBack, onRandomizeNext, applyReuse, toggleApplyReuse }: Props) {
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chartSizerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(defaultRate);
  const [rateText, setRateText] = useState<string | number>('' + defaultRate);

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

  const onPlayClick = () => {
    setPlaying(true);
    intervalIdRef.current = setInterval(onRandomizeNext, rate);
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

  return (
    <div className={"mochart-demo-tab-container col chart" + (active ? " active" : "")}>
      <div className="random-chart-sizer" ref={chartSizerRef}>
        {/* Chart self-measures when width/height are omitted. */}
        <Chart style={{ flex: '1 1 auto', minWidth: 0, minHeight: 0, overflow: 'hidden' }}
          mochartConfig={mochartConfig} dataProvider={dataProvider} />
      </div>
      <div className="random-controls">
        <Form inline>
          <FormGroup>
            <ButtonToolbar>
              <ButtonGroup>
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
              </ButtonGroup>
              <FormGroup>
                <label className="form-control-plaintext" htmlFor="random-rate">{demoText.randomChartTab.intervalLabel}</label>
                <Input id="random-rate" disabled={playing} type="number" min={5} max={60000} step={100} value={rateText}
                  onChange={rateChanged} aria-label={demoText.randomChartTab.intervalAria} />
              </FormGroup>
            </ButtonToolbar>
            <ButtonToolbar className="ml-2">
              <ExportButtons idPrefix="random" getContainer={() => chartSizerRef.current} />
              <ButtonGroup>
                <ButtonWithTooltip id="reuse" disabled={playing} label={demoText.randomChartTab.reuse.label} pressed={applyReuse}
                  tooltipText={demoText.randomChartTab.reuse.tooltip} tooltipPlacement="top-start"
                  onClick={toggleApplyReuse} aria-label={demoText.randomChartTab.reuse.aria}>
                  <Icon size="lg" fixedWidth={true} name="recycle" />
                </ButtonWithTooltip>
              </ButtonGroup>
            </ButtonToolbar>
          </FormGroup>
        </Form>
      </div>
    </div>
  );
}
