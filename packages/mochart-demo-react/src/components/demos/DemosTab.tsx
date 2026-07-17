import React, { useState } from 'react';
import { ListGroup, ListGroupItem, Form, FormGroup, ButtonToolbar, Button } from 'reactstrap';
import FontAwesome from 'react-fontawesome';

import type { DemoData, DemoMode, OnDemoModeChanged, OnDemoChanged } from '../../types';

interface Props {
  active?: boolean;
  demoData: DemoData;
  demoMode: DemoMode;
  demoId: string;
  onDemoModeChanged: OnDemoModeChanged;
  onDemoChange: OnDemoChanged;
}

export default function MochartDemosTab({ active, demoData, demoMode, demoId, onDemoModeChanged, onDemoChange }: Props) {
  const [isTestMode, setIsTestMode] = useState(false);

  const { demoIds, demoObjectMap, testDemoIds } = demoData;
  const theDemoIds = isTestMode ? testDemoIds : demoIds;

  const demoListGroupItems = theDemoIds.map(currentDemoId => {
    const demoObject = demoObjectMap[currentDemoId];
    return (
      <ListGroupItem key={'demo-' + currentDemoId} active={currentDemoId === demoId} onClick={() => onDemoChange(currentDemoId)}>{demoObject.title}</ListGroupItem>
    );
  });

  const isSingle = demoMode === 'single';
  const isMulti = demoMode === 'multi';
  const isRandom = demoMode === 'random';

  return (
    <div className={"mochart-demo-tab-container col demos" + (active ? " active" : "")}>
      <div className="mochart-demo-modes-container">
        <Form inline>
          <FormGroup>
            <span className="form-control-plaintext">Demo Mode:&nbsp;</span>
          </FormGroup>
          <FormGroup>
            <ButtonToolbar>
              <Button disabled={isSingle} onClick={() => { onDemoModeChanged('single', demoId); }} color={isSingle ? "primary" : void 0}>
                <FontAwesome size="lg" name="edit" /> Single
              </Button>
              <Button disabled={isMulti} onClick={() => { onDemoModeChanged('multi', demoId); }} color={isMulti ? "primary" : void 0}>
                <FontAwesome size="lg" name="window-restore" /> Multi
              </Button>
              <Button disabled={isRandom} onClick={() => { onDemoModeChanged('random', demoId); }} color={isRandom ? "primary" : void 0}>
                <FontAwesome size="lg" name="random" /> Random
              </Button>
              <Button onClick={() => { onDemoModeChanged('transition', demoId); }}>
                <FontAwesome size="lg" name="exchange" /> Transition
              </Button>
              <Button onClick={() => { onDemoModeChanged('rotation', demoId); }}>
                <FontAwesome size="lg" name="repeat" /> Rotation
              </Button>
            </ButtonToolbar>
          </FormGroup>
          <FormGroup style={{ marginLeft: 10 }}>
            <ButtonToolbar>
              <Button disabled={false} onClick={() => setIsTestMode(mode => !mode)} color={isTestMode ? "primary" : void 0}>
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
