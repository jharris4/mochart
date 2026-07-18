import React, { useState } from 'react';
import { ListGroup, ListGroupItem, Form, FormGroup, ButtonToolbar, Button } from 'reactstrap';
import FontAwesome from 'react-fontawesome';

import { demoText } from '@mochart/demo-common';

import type { DemoData, DemoMode, OnDemoModeChanged, OnDemoChanged } from '../../types';

interface Props {
  active?: boolean;
  demoData: DemoData;
  demoMode: DemoMode;
  demoId: string;
  onDemoModeChanged: OnDemoModeChanged;
  onDemoChange: OnDemoChanged;
}

const modeCaptions: Record<string, string> = demoText.demosTab.modeCaptions;

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
            <span className="form-control-plaintext">{demoText.demosTab.demoModeLabel}&nbsp;</span>
          </FormGroup>
          <FormGroup>
            <ButtonToolbar>
              <Button disabled={isSingle} title={demoText.demosTab.modes.single.title}
                onClick={() => { onDemoModeChanged('single', demoId); }} color={isSingle ? "primary" : void 0}>
                <FontAwesome size="lg" name="pen-to-square" /> {demoText.demosTab.modes.single.label}
              </Button>
              <Button disabled={isMulti} title={demoText.demosTab.modes.multi.title}
                onClick={() => { onDemoModeChanged('multi', demoId); }} color={isMulti ? "primary" : void 0}>
                <FontAwesome size="lg" name="window-restore" /> {demoText.demosTab.modes.multi.label}
              </Button>
              <Button disabled={isRandom} title={demoText.demosTab.modes.random.title}
                onClick={() => { onDemoModeChanged('random', demoId); }} color={isRandom ? "primary" : void 0}>
                <FontAwesome size="lg" name="shuffle" /> {demoText.demosTab.modes.random.label}
              </Button>
              <Button title={demoText.demosTab.modes.transition.title} onClick={() => { onDemoModeChanged('transition', demoId); }}>
                <FontAwesome size="lg" name="right-left" /> {demoText.demosTab.modes.transition.label}
              </Button>
              <Button title={demoText.demosTab.modes.rotation.title} onClick={() => { onDemoModeChanged('rotation', demoId); }}>
                <FontAwesome size="lg" name="repeat" /> {demoText.demosTab.modes.rotation.label}
              </Button>
            </ButtonToolbar>
          </FormGroup>
          <FormGroup style={{ marginLeft: 10 }}>
            <ButtonToolbar>
              <Button aria-pressed={isTestMode} title={demoText.demosTab.testDemos.title}
                onClick={() => setIsTestMode(mode => !mode)} color={isTestMode ? "primary" : void 0}>
                <FontAwesome size="lg" name="flask" /> {demoText.demosTab.testDemos.label}
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
