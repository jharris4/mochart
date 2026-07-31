import { Fragment, useState } from 'react';

import { DefaultChart } from '@mochart/react';

import { demoText, inlineSparklineMetrics, tableSparklineMetrics } from '@mochart/demo-common';
import type { SparklineMetric } from '@mochart/demo-common';

import Icon from '../misc/Icon';
import ButtonWithTooltip from '../misc/ButtonWithTooltip';
import TopBar from '../misc/TopBar';

import type { OnBackToDemos } from '../../types';

interface DemoSparklineProps {
  siteRootUrl?: string;
  onBackToDemos: OnBackToDemos;
}

// Every sparkline mounts at the metric's explicit pixel size (no auto-sizing):
// inline metrics are word-sized, table cells larger.
function SparklineChart({ metric, step }: { metric: SparklineMetric; step: number }) {
  return <DefaultChart config={metric.config} data={metric.generate(step)} width={metric.width} height={metric.height} />;
}

function SparklineRow({ metric, step }: { metric: SparklineMetric; step: number }) {
  const data = metric.generate(step);
  return (
    <tr>
      <td>{metric.label}</td>
      <td className="sparkline-value">{metric.latestText(data)}</td>
      <td className="sparkline-cell">
        <DefaultChart config={metric.config} data={data} width={metric.width} height={metric.height} />
      </td>
    </tr>
  );
}

export default function DemoSparkline({ siteRootUrl, onBackToDemos }: DemoSparklineProps) {
  const text = demoText.sparklinePage;
  const [step, setStep] = useState(0);

  const onRandomize = () => setStep(prevStep => prevStep + 1);

  return (
    <div className="mochart-demo-container">
      <TopBar siteRootUrl={siteRootUrl} onBackToDemos={onBackToDemos} />
      <div className="sparkline-page">
        {/* The intro paragraph: copy segments with the inline metrics between them. */}
        <p className="sparkline-intro">
          {text.intro.map((segment, i) => {
            const metric = inlineSparklineMetrics[i];
            return (
              <Fragment key={i}>
                {segment}
                {metric !== undefined ? (
                  <span className="sparkline-inline"><SparklineChart metric={metric} step={step} /></span>
                ) : null}
              </Fragment>
            );
          })}
        </p>
        <div className="sparkline-controls">
          <ButtonWithTooltip id="sparkline-randomize" label={text.randomize.label} color="primary"
            tooltipText={text.randomize.tooltip} onClick={onRandomize} aria-label={text.randomize.aria}>
            <Icon fixedWidth={true} name="dice" />
          </ButtonWithTooltip>
        </div>
        <table className="sparkline-table">
          <thead>
            <tr>
              <th>{text.table.metric}</th>
              <th>{text.table.latest}</th>
              <th>{text.table.trend}</th>
            </tr>
          </thead>
          <tbody>
            {tableSparklineMetrics.map(metric => <SparklineRow key={metric.id} metric={metric} step={step} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
