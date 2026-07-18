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

const modeCaptions: Record<string, string> = {
  single: 'Single: one chart with editable config, data, groups and series — pick a demo below.',
  multi: 'Multi: a grid of charts stepping through generated datasets together — pick a demo below.',
  random: 'Random: a chart fed by a seeded random data generator — pick a demo below.',
  transition: 'Transition: animates a chart between datasets — pick a demo below.',
  rotation: 'Rotation: a grid of charts showing different tick label rotations — pick a demo below.'
};

export default function MochartDemosTab({ active, demoData, demoMode, demoId, onDemoModeChanged, onDemoChange }: Props) {
  const [isTestMode, setIsTestMode] = useState(false);

  const { demoIds, demoObjectMap, testDemoIds } = demoData;
  const theDemoIds = isTestMode ? testDemoIds : demoIds;

  const demoListGroupItems = theDemoIds.map(currentDemoId => {
    const demoObject = demoObjectMap[currentDemoId];
    return (
      <ListGroupItem key={'demo-' + currentDemoId} tag="button" type="button" action active={currentDemoId === demoId} onClick={() => onDemoChange(currentDemoId)}>{demoObject.title}</ListGroupItem>
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
              <Button disabled={isSingle} title="One chart with editable config, data, groups and series"
                onClick={() => { onDemoModeChanged('single', demoId); }} color={isSingle ? "primary" : void 0}>
                <FontAwesome size="lg" name="pen-to-square" /> Single
              </Button>
              <Button disabled={isMulti} title="A grid of charts stepping through datasets together"
                onClick={() => { onDemoModeChanged('multi', demoId); }} color={isMulti ? "primary" : void 0}>
                <FontAwesome size="lg" name="window-restore" /> Multi
              </Button>
              <Button disabled={isRandom} title="A chart fed by a seeded random data generator"
                onClick={() => { onDemoModeChanged('random', demoId); }} color={isRandom ? "primary" : void 0}>
                <FontAwesome size="lg" name="shuffle" /> Random
              </Button>
              <Button title="Animate a chart between two datasets" onClick={() => { onDemoModeChanged('transition', demoId); }}>
                <FontAwesome size="lg" name="right-left" /> Transition
              </Button>
              <Button title="A grid of charts showing different tick label rotations" onClick={() => { onDemoModeChanged('rotation', demoId); }}>
                <FontAwesome size="lg" name="repeat" /> Rotation
              </Button>
            </ButtonToolbar>
          </FormGroup>
          <FormGroup style={{ marginLeft: 10 }}>
            <ButtonToolbar>
              <Button aria-pressed={isTestMode} title="Show the test demos (showcasing less used features)"
                onClick={() => setIsTestMode(mode => !mode)} color={isTestMode ? "primary" : void 0}>
                <FontAwesome size="lg" name="flask" /> Test Demos
              </Button>
            </ButtonToolbar>
          </FormGroup>
        </Form>
        {modeCaptions[demoMode] ? <div className="mochart-demo-caption">{modeCaptions[demoMode]}</div> : null}
      </div>
      <div className="mochart-demo-list-container">
        <div className="mochart-demo-list">
          <ListGroup tag="div">
            {demoListGroupItems}
          </ListGroup>
        </div>
      </div>
    </div>
  );
}
