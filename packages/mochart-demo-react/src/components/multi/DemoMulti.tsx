
import { demoText } from '@mochart/demo-common';

import MultiMochartChartsTab from './ChartsTab';
import ErrorTab from '../misc/ErrorTab';
import TopBar from '../misc/TopBar';

import type { DemoTabProps } from '../../types';

export default function MochartDemoMulti({ demoData, initialDemoId, siteRootUrl, onModeChanged, onBackToDemos }: DemoTabProps) {
  return (
    <div className="mochart-demo-container multi">
      <TopBar siteRootUrl={siteRootUrl} onBackToDemos={onBackToDemos}
        notes={demoData.demoObjectMap[initialDemoId]}
        modes={{ demoMode: 'multi', onModeChanged }}
        tabs={
          <li className="demo-tab-item">
            <button type="button" className="demo-tab active">{demoText.tabs.chart}</button>
          </li>
        } />
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
