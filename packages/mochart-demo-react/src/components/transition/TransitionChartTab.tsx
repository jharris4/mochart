import React, { useState, useRef } from 'react';
import { Form, FormGroup, ButtonToolbar, ButtonGroup } from 'reactstrap';
import FontAwesome from 'react-fontawesome';
import sizer from 'react-sizer';

import { Chart } from 'mochart-react';
import type { MochartConfig } from 'mochart';

import ButtonWithTooltip from '../misc/ButtonWithTooltip';

import type { ChartDataProviderLike } from '../../types';

interface Props {
  active: boolean;
  mochartConfig: MochartConfig;
  dataProviders: ChartDataProviderLike[];
}

export default function TransitionChartTab({ active, mochartConfig, dataProviders }: Props) {
  const [dataProviderIndex, setDataProviderIndex] = useState(0);

  // Reset to the first dataset when the config/datasets change.
  const prev = useRef({ mochartConfig, dataProviders });
  if (prev.current.mochartConfig !== mochartConfig || prev.current.dataProviders !== dataProviders) {
    prev.current = { mochartConfig, dataProviders };
    setDataProviderIndex(0);
  }

  const onStepBack = () => {
    if (dataProviders.length > 1) {
      setDataProviderIndex(index => (index === 0 ? dataProviders.length - 1 : index - 1));
    }
  };

  const onStepForward = () => {
    if (dataProviders.length > 1) {
      setDataProviderIndex(index => (index === dataProviders.length - 1 ? 0 : index + 1));
    }
  };

  return (
    <div className={"mochart-demo-tab-container col chart" + (active ? " active" : "")}>
      <div className="transition-chart-sizer">
        <SizerManagedChart mochartConfig={mochartConfig} dataProvider={dataProviders[dataProviderIndex]} />
      </div>
      <div className="transition-controls">
        <Form inline>
          <FormGroup>
            <ButtonToolbar>
              <ButtonGroup>
                <ButtonWithTooltip id="transition-back" tooltipText="Step Backward" tooltipPlacement="top-start"
                  onClick={onStepBack} aria-label="Step Backward">
                  <FontAwesome size="lg" fixedWidth={true} name="step-backward" />
                </ButtonWithTooltip>
                <ButtonWithTooltip id="transition-forward" tooltipText="Step Forward" tooltipPlacement="top-start"
                  onClick={onStepForward} aria-label="Step Forward">
                  <FontAwesome size="lg" fixedWidth={true} name="step-forward" />
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
