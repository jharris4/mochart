import React, { Component } from 'react';
import PropTypes from 'prop-types';
import autobind from 'autobind-decorator';
import { ListGroup, ListGroupItem, Form, FormGroup, Input, ButtonToolbar, Button } from 'reactstrap';
import FontAwesome from 'react-fontawesome';

class MochartDemosTab extends Component {
  static propTypes = {
    active: PropTypes.bool,
    demoData: PropTypes.object.isRequired,
    demoMode: PropTypes.string.isRequired,
    demoId: PropTypes.string.isRequired,
    onDemoModeChanged: PropTypes.func.isRequired,
    onDemoChange: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.state = { isTestMode: false };
  }

  @autobind
  onDemoChange(demoId) {
    const { onDemoChange } = this.props;
    onDemoChange(demoId);
  }

  @autobind
  onDemoModeChange(demoMode, demoId) {
    const { onDemoModeChanged } = this.props;
    onDemoModeChanged(demoMode, demoId);
  }

  @autobind
  onTestModeToggle() {
    const { isTestMode } = this.state;
    this.setState({ isTestMode: !isTestMode });
  }

  render() {
    const { active, demoData, demoMode, demoId } = this.props;
    const { isTestMode } = this.state;
    const { demoIds, demoObjectMap, testDemoIds } = demoData;

    let demoListGroupItems = [];
    let demoObject;
    const theDemoIds = isTestMode ? testDemoIds : demoIds;

    theDemoIds.forEach(currentDemoId => {
      demoObject = demoObjectMap[currentDemoId];
      demoListGroupItems.push(
        <ListGroupItem key={'demo-' + currentDemoId} active={currentDemoId === demoId} onClick={() => this.onDemoChange(currentDemoId)}>{demoObject.title}</ListGroupItem>
      );
    });

    const isSingle = demoMode === 'single';
    const isMulti = demoMode === 'multi';
    const isRandom = demoMode === 'random';

    return (
      <div className={"mochart-demo-tab-container col demos" + (active ? " active": "")}>
        <div className="mochart-demo-modes-container">
          <Form inline>
            <FormGroup>
              <span className="form-control-plaintext">Demo Mode:&nbsp;</span>
            </FormGroup>
            <FormGroup>
              <ButtonToolbar>
                <Button disabled={isSingle} onClick={() => { this.onDemoModeChange('single', demoId) }} color={isSingle ? "primary" : void 0}>
                  <FontAwesome size="lg" name="edit"/> Single
                </Button>
                <Button disabled={isMulti} onClick={() => { this.onDemoModeChange('multi', demoId) }} color={isMulti ? "primary" : void 0}>
                  <FontAwesome size="lg" name="window-restore"/> Multi
                </Button>
                <Button disabled={isRandom} onClick={() => { this.onDemoModeChange('random', demoId) }} color={isRandom ? "primary" : void 0}>
                  <FontAwesome size="lg" name="random"/> Random
                </Button>
                <Button onClick={() => { this.onDemoModeChange('transition', demoId) }}>
                  <FontAwesome size="lg" name="exchange"/> Transition
                </Button>
                <Button onClick={() => { this.onDemoModeChange('rotation', demoId) }}>
                  <FontAwesome size="lg" name="repeat"/> Rotation
                </Button>
              </ButtonToolbar>
            </FormGroup>
            <FormGroup style={{ marginLeft: 10 }}>
              <ButtonToolbar>
                <Button disabled={false} onClick={this.onTestModeToggle} color={isTestMode ? "primary" : void 0}>
                  <FontAwesome size="lg" name="edit" /> Test Demos
                </Button>
              </ButtonToolbar>
            </FormGroup>
          </Form>
        </div>
        <div className="mochart-demo-list-container">
          <div className="mochart-demo-list">
            <ListGroup>
              {demoListGroupItems}
            </ListGroup>
          </div>
        </div>
      </div>
    );
  }
}

export default MochartDemosTab;