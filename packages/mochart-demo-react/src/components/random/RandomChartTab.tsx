import React, { useState, useRef, useEffect } from 'react';
import { Form, FormGroup, Input, ButtonToolbar, ButtonGroup } from 'reactstrap';
import FontAwesome from 'react-fontawesome';
import sizer from 'react-sizer';

import { Chart } from 'mochart-react';
import type { MochartConfig } from 'mochart';

import ButtonWithTooltip from '../misc/ButtonWithTooltip';

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
      <div className="random-chart-sizer">
        <SizerManagedChart mochartConfig={mochartConfig} dataProvider={dataProvider} />
      </div>
      <div className="random-controls">
        <Form inline>
          <FormGroup>
            <ButtonToolbar>
              <ButtonGroup>
                <ButtonWithTooltip id="randomize-back" disabled={playing} tooltipText="Randomize Back" tooltipPlacement="top-start"
                  onClick={onRandomizeBack} aria-label="Randomize Back">
                  <FontAwesome size="lg" fixedWidth={true} name="random" flip={'horizontal'} />
                </ButtonWithTooltip>
                <ButtonWithTooltip id="randomize-next" disabled={playing} tooltipText="Randomize Next" tooltipPlacement="top-start"
                  onClick={onRandomizeNext} aria-label="Randomize Next">
                  <FontAwesome size="lg" fixedWidth={true} name="random" />
                </ButtonWithTooltip>
                <ButtonWithTooltip id="play" disabled={playing} tooltipText="Play Randomize" tooltipPlacement="top-start"
                  onClick={onPlayClick} aria-label="Play Randomize">
                  <FontAwesome size="lg" fixedWidth={true} name="play" />
                </ButtonWithTooltip>
                <ButtonWithTooltip id="stop" disabled={!playing} tooltipText="Stop" tooltipPlacement="top-start"
                  onClick={onStopClick} aria-label="Stop">
                  <FontAwesome size="lg" fixedWidth={true} name="stop" />
                </ButtonWithTooltip>
              </ButtonGroup>
              <FormGroup>
                <Input disabled={playing} type="text" value={rateText} maxLength={4} size={4} onChange={rateChanged} />
              </FormGroup>
            </ButtonToolbar>
            <ButtonToolbar className="ml-2">
              <ButtonGroup>
                <ButtonWithTooltip id="reuse" disabled={playing} tooltipText="Reuse" tooltipPlacement="top-start"
                  onClick={toggleApplyReuse} aria-label="Reuse" color={applyReuse ? 'primary' : void 0}>
                  <FontAwesome size="lg" fixedWidth={true} name="recycle" />
                </ButtonWithTooltip>
              </ButtonGroup>
            </ButtonToolbar>
          </FormGroup>
        </Form>
      </div>
    </div>
  );
}

const SizerManagedChart = sizer()(Chart);
