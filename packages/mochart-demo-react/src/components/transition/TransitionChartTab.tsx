import React, { useState, useRef } from 'react';
import { Form, FormGroup, ButtonToolbar, ButtonGroup } from 'reactstrap';
import FontAwesome from 'react-fontawesome';

import { Chart } from '@mochart/react';
import type { MochartConfig } from '@mochart/core';

import { demoText } from '@mochart/demo-common';

import ButtonWithTooltip from '../misc/ButtonWithTooltip';
import ExportButtons from '../misc/ExportButtons';

import type { ChartDataProviderLike } from '../../types';

interface Props {
  active: boolean;
  mochartConfig: MochartConfig;
  dataProviders: ChartDataProviderLike[];
}

export default function TransitionChartTab({ active, mochartConfig, dataProviders }: Props) {
  const [dataProviderIndex, setDataProviderIndex] = useState(0);
  const chartSizerRef = useRef<HTMLDivElement>(null);

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
      <div className="transition-chart-sizer" ref={chartSizerRef}>
        {/* Chart self-measures when width/height are omitted. */}
        <Chart style={{ flex: '1 1 auto', minWidth: 0, minHeight: 0, overflow: 'hidden' }}
          mochartConfig={mochartConfig} dataProvider={dataProviders[dataProviderIndex]} />
      </div>
      <div className="transition-controls">
        <Form inline>
          <FormGroup>
            <ButtonToolbar>
              <ButtonGroup>
                <ButtonWithTooltip id="transition-back" label={demoText.transitionChartTab.back.label} tooltipText={demoText.transitionChartTab.back.tooltip} tooltipPlacement="top-start"
                  onClick={onStepBack} aria-label={demoText.transitionChartTab.back.aria}>
                  <FontAwesome size="lg" fixedWidth={true} name="backward-step" />
                </ButtonWithTooltip>
                <ButtonWithTooltip id="transition-forward" label={demoText.transitionChartTab.next.label} tooltipText={demoText.transitionChartTab.next.tooltip} tooltipPlacement="top-start"
                  onClick={onStepForward} aria-label={demoText.transitionChartTab.next.aria}>
                  <FontAwesome size="lg" fixedWidth={true} name="forward-step" />
                </ButtonWithTooltip>
              </ButtonGroup>
              <ExportButtons idPrefix="transition" getContainer={() => chartSizerRef.current} />
            </ButtonToolbar>
          </FormGroup>
        </Form>
      </div>
    </div>
  );
}
