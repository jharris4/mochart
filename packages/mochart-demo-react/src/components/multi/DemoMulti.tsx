import React from 'react';

import { demoText } from '@mochart/demo-common';

import MultiMochartChartsTab from './ChartsTab';
import ErrorTab from '../misc/ErrorTab';
import { ModeSwitcher, SiteRootButton, BackToDemosButton, ThemeToggleButton } from '../misc/ModeSwitcher';

import type { DemoTabProps } from '../../types';

export default function MochartDemoMulti({ demoData, initialDemoId, siteRootUrl, onModeChanged, onBackToDemos }: DemoTabProps) {
  return (
    <div className="mochart-demo-container multi">
      <div className="mochart-demo-tabs-container">
        <div className="mochart-demo-nav-group">
          <SiteRootButton siteRootUrl={siteRootUrl} />
          <BackToDemosButton onBackToDemos={onBackToDemos} />
          <ul className="demo-tabs">
            <li className="demo-tab-item">
              <button type="button" className="demo-tab active">{demoText.tabs.chart}</button>
            </li>
          </ul>
        </div>
        <div className="mochart-demo-nav-group">
          <ModeSwitcher demoMode="multi" onModeChanged={onModeChanged} />
          <ThemeToggleButton />
        </div>
      </div>
      <div className="mochart-demo-content-pane">
        <div className="mochart-demo-content">
          <ErrorTab active>
            <MultiMochartChartsTab demoObject={demoData.demoObjectMap[initialDemoId]} />
          </ErrorTab>
        </div>
      </div>
    </div>
  );
}
