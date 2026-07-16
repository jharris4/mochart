import React, { Component } from 'react';
import PropTypes from 'prop-types';
import autobind from 'autobind-decorator';
import { Form, FormGroup, Input, ButtonToolbar, ButtonGroup } from 'reactstrap';
import FontAwesome from 'react-fontawesome';
import sizer from 'react-sizer';

import { ManagedChart } from 'mochart';

import ButtonWithTooltip from '../misc/ButtonWithTooltip';

const defaultRate = 2000;

export default class RandomMochartChartsTab extends Component {
  static propTypes = {
    active: PropTypes.bool,
    mochartConfig: PropTypes.object.isRequired,
    dataProvider: PropTypes.object.isRequired,
    onRandomizeBack: PropTypes.func.isRequired,
    onRandomizeNext: PropTypes.func.isRequired,
    applyReuse: PropTypes.bool.isRequired,
    toggleApplyReuse: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.intervalId = null;
    this.state = { playing: false, rate: defaultRate, rateText: '' + defaultRate };
  }

  componentWillReceiveProps(nextProps) {
    const { active } = nextProps;
    const { active: oldActive } = this.props;
    if (active !== oldActive) {
      this.onStopClick();
    }
  }

  @autobind
  onRandomizeBack() {
    const { onRandomizeBack } = this.props;
    onRandomizeBack();
  }

  @autobind
  onRandomizeNext() {
    const { onRandomizeNext } = this.props;
    onRandomizeNext();
  }

  @autobind
  onPlayClick() {
    const { rate } = this.state;
    this.setState({playing: true}, () => {
      this.intervalId = setInterval(this.onRandomizeNext, rate);
    });
  }

  @autobind
  onStopClick() {
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.setState({playing: false});
  }

  @autobind
  rateChanged(event) {
    let { rate } = this.state;
    let rateText = event.target.value;
    if (!isNaN(parseFloat(rateText)) && isFinite(rateText)) {
      rateText = +rateText;
      if (rateText >= 5 && rateText <= 60000) {
        rate = rateText;
      }
    }
    this.setState({rateText, rate});
  }

  componentWillUnmount() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  render() {
    const { mochartConfig, dataProvider, active, applyReuse, toggleApplyReuse } = this.props;
    const { playing, rateText } = this.state;

    return (
      <div className={"mochart-demo-tab-container col chart" + (active ? " active": "")}>
        <div className="random-chart-sizer">
          <SizerManagedChart mochartConfig={mochartConfig} dataProvider={dataProvider}/>
        </div>
        <div className="random-controls">
          <Form inline>
            <FormGroup>
              <ButtonToolbar>
                <ButtonGroup>
                  <ButtonWithTooltip id="randomize-back" disabled={playing} tooltipText="Randomize Back" tooltipPlacement="top-start"
                                     onClick={this.onRandomizeBack} aria-label="Randomize Back">
                    <FontAwesome size="lg" fixedWidth={true} name="random" flip={'horizontal'}/>
                  </ButtonWithTooltip>
                  <ButtonWithTooltip id="randomize-next" disabled={playing} tooltipText="Randomize Next" tooltipPlacement="top-start"
                    onClick={this.onRandomizeNext} aria-label="Randomize Next">
                    <FontAwesome size="lg" fixedWidth={true} name="random" />
                  </ButtonWithTooltip>
                  <ButtonWithTooltip id="play" disabled={playing} tooltipText="Play Randomize" tooltipPlacement="top-start"
                                     onClick={this.onPlayClick} aria-label="Play Randomize">
                    <FontAwesome size="lg" fixedWidth={true} name="play"/>
                  </ButtonWithTooltip>
                  <ButtonWithTooltip id="stop" disabled={!playing} tooltipText="Stop" tooltipPlacement="top-start"
                                     onClick={this.onStopClick} aria-label="Stop">
                    <FontAwesome size="lg" fixedWidth={true} name="stop"/>
                  </ButtonWithTooltip>
                </ButtonGroup>
                <FormGroup>
                  <Input disabled={playing} type="text" value={rateText} maxLength="4" size="4" onChange={this.rateChanged} />
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
}

const SizerManagedChart = sizer()(ManagedChart);