import React, { Component } from 'react';
import PropTypes from 'prop-types';
import autobind from 'autobind-decorator';
import { Form, FormGroup, ButtonToolbar, ButtonGroup } from 'reactstrap';
import FontAwesome from 'react-fontawesome';
import sizer from 'react-sizer';

import { ManagedChart } from 'mochart';

import ButtonWithTooltip from '../misc/ButtonWithTooltip';

export default class MultiMochartChartsTab extends Component {
  static propTypes = {
    active: PropTypes.bool.isRequired,
    mochartConfig: PropTypes.object.isRequired,
    dataProviders: PropTypes.arrayOf(PropTypes.object).isRequired
  };

  constructor(props) {
    super(props);
    this.state = { dataProviderIndex: 0 };
  }

  componentWillReceiveProps(nextProps) {
    const { mochartConfig, dataProviders } = nextProps;
    if (mochartConfig !== this.props.mochartConfig || dataProviders !== this.props.dataProviders) {
      this.setState({ dataProviderIndex: 0 });
    }
  }

  @autobind
  onStepBack() {
    const { dataProviders } = this.props;
    let { dataProviderIndex } = this.state;
    if (dataProviders.length > 1) {
      if (dataProviderIndex === 0) {
        dataProviderIndex = dataProviders.length -1
      }
      else {
        dataProviderIndex--;
      }
      this.setState({ dataProviderIndex });
    }
  }

  @autobind
  onStepForward() {
    const { dataProviders } = this.props;
    let { dataProviderIndex } = this.state;
    if (dataProviders.length > 1) {
      if (dataProviderIndex === dataProviders.length -1) {
        dataProviderIndex = 0;
      }
      else {
        dataProviderIndex++;
      }
      this.setState({ dataProviderIndex });
    }
  }

  render() {
    const { mochartConfig, dataProviders, active } = this.props;
    const { dataProviderIndex } = this.state;

    return (
      <div className={"mochart-demo-tab-container col chart" + (active ? " active": "")}>
        <div className="transition-chart-sizer">
          <SizerManagedChart mochartConfig={mochartConfig} dataProvider={dataProviders[dataProviderIndex]}/>
        </div>
        <div className="transition-controls">
          <Form inline>
            <FormGroup>
              <ButtonToolbar>
                <ButtonGroup>
                  <ButtonWithTooltip id="transition-back" tooltipText="Step Backward" tooltipPlacement="top-start"
                                     onClick={this.onStepBack} aria-label="Step Backward">
                    <FontAwesome size="lg" fixedWidth={true} name="step-backward"/>
                  </ButtonWithTooltip>
                  <ButtonWithTooltip id="transition-forward" tooltipText="Step Forward" tooltipPlacement="top-start"
                                     onClick={this.onStepForward} aria-label="Step Forward">
                    <FontAwesome size="lg" fixedWidth={true} name="step-forward"/>
                  </ButtonWithTooltip>
                </ButtonGroup>
              </ButtonToolbar>
            </FormGroup>
          </Form>
        </div>
      </div>
    );
  }
}

const SizerManagedChart = sizer()(ManagedChart);