import React, { Component } from 'react';
import PropTypes from 'prop-types';
import autobind from 'autobind-decorator';
import { Nav, NavItem, NavLink } from 'reactstrap';

import MochartDemosTab from '../demos/DemosTab';
import MultiMochartChartsTab from './ChartsTab';
import ErrorTab from '../misc/ErrorTab';

const eventKeyChart = 1;
const eventKeyDemo = 2;

function getActiveKeyForInitialDemoId(initialDemoId) {
  return initialDemoId === 'demos' ? eventKeyDemo : eventKeyChart;
}

class MochartDemoMulti extends Component {
  static propTypes = {
    demoData: PropTypes.object.isRequired,
    demoMode: PropTypes.string.isRequired,
    initialDemoId: PropTypes.string.isRequired,
    onDemoModeChanged: PropTypes.func.isRequired,
    onDemoChanged: PropTypes.func.isRequired
  };

  static defaultProps = {
    demoData: {
      demoIds: [],
      demoObjectMap: {}
    },
    initialDemoId: "",
    onDemoChanged: (demoId) => {}
  };

  constructor(props) {
    super(props);

    const { initialDemoId } = props;
    this.state = {
      demoId: initialDemoId,
      activeKey: getActiveKeyForInitialDemoId(initialDemoId)
    };
  }

  componentWillReceiveProps(nextProps) {
    const { initialDemoId } = nextProps;
    if (initialDemoId !== this.props.initialDemoId) {
      this.setState({ activeKey: getActiveKeyForInitialDemoId(initialDemoId), demoId: initialDemoId });
    }
  }

  @autobind
  onDemoChange(demoId) {
    const { onDemoChanged } = this.props;
    this.setState({demoId});
    onDemoChanged(demoId)
  }

  @autobind
  handleSelect(activeKey) {
    this.setState({activeKey});
  }

  render() {
    const { demoData, demoMode, initialDemoId, onDemoModeChanged } = this.props;
    const { demoId, activeKey } = this.state;

    let isDemos = initialDemoId === 'demos';
    let nonDemoNavItemStyle = isDemos ? { display: 'none' } : null;

    return (
      <div className="mochart-demo-container multi">
        <div className="mochart-demo-tabs-container">
          <Nav tabs>
            <NavItem>
              <NavLink active={activeKey === eventKeyDemo} onClick={() => { this.handleSelect(eventKeyDemo) }}>
                Demos
              </NavLink>
            </NavItem>
            <NavItem style={nonDemoNavItemStyle}>
              <NavLink active={activeKey === eventKeyChart} onClick={() => { this.handleSelect(eventKeyChart) }}>
                Chart
              </NavLink>
            </NavItem>
          </Nav>
        </div>
        <div className="mochart-demo-content-pane">
          <MultiMochartDemoContent demoData={demoData} demoMode={demoMode} initialDemoId={initialDemoId} demoId={demoId}
                                   onDemoModeChanged={onDemoModeChanged} onDemoChange={this.onDemoChange} activeKey={activeKey}/>
        </div>
      </div>
    );
  }
}

class MultiMochartDemoContent extends Component {
  static propTypes = {
    demoData: PropTypes.object.isRequired,
    demoMode: PropTypes.string.isRequired,
    initialDemoId: PropTypes.string.isRequired,
    demoId: PropTypes.string.isRequired,
    onDemoModeChanged: PropTypes.func.isRequired,
    onDemoChange: PropTypes.func.isRequired,
    activeKey: PropTypes.number.isRequired
  };

  render() {
    const { initialDemoId, demoData, demoMode, demoId, onDemoModeChanged, onDemoChange, activeKey } = this.props;

    if (initialDemoId === 'demos') {
      return (
        <div className="mochart-demo-content single-tab">
          <MochartDemosTab demoData={demoData} demoMode={demoMode} demoId={demoId} onDemoModeChanged={onDemoModeChanged}
                           onDemoChange={onDemoChange} active={activeKey === eventKeyDemo}/>
        </div>
      );
    }
    else {
      return (
        <div className="mochart-demo-content">
          <ErrorTab active={activeKey === eventKeyDemo}>
            <MochartDemosTab demoData={demoData} demoMode={demoMode} demoId={demoId} onDemoModeChanged={onDemoModeChanged}
              onDemoChange={onDemoChange} />
          </ErrorTab>
          <ErrorTab active={activeKey === eventKeyChart}>
            <MultiMochartChartsTab demoObject={demoData.demoObjectMap[demoId]} />
          </ErrorTab>
        </div>
      );
    }

  }
}

export default MochartDemoMulti;