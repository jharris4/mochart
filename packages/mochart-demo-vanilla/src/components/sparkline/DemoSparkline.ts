import { demoText, inlineSparklineMetrics, tableSparklineMetrics } from '@mochart/demo-common';
import type { SparklineMetric } from '@mochart/demo-common';

import { el, buttonWithTooltip, icon } from '../misc/dom';
import { backToDemosButton, siteRootButton, themeToggleButton } from '../misc/ModeSwitcher';
import { mountDefaultChart } from '../misc/chartHost';
import type { ChartHostHandle } from '../misc/chartHost';

export interface DemoSparklineProps {
  siteRootUrl?: string;
  onBackToDemos: () => void;
}

export interface DemoSparklineHandle {
  el: HTMLElement;
  destroy(): void;
}

interface MetricCell {
  metric: SparklineMetric;
  host: ChartHostHandle;
  /** The "Latest" table cell, when the metric renders in the table. */
  latestEl?: HTMLElement;
}

export function demoSparkline(props: DemoSparklineProps): DemoSparklineHandle {
  const text = demoText.sparklinePage;
  let step = 0;
  const cells: MetricCell[] = [];

  function mountMetric(metric: SparklineMetric, latestEl?: HTMLElement): MetricCell {
    const data = metric.generate(step);
    const host = mountDefaultChart({ config: metric.config, data, width: metric.width, height: metric.height });
    if (latestEl !== undefined) {
      latestEl.textContent = metric.latestText(data);
    }
    const cell: MetricCell = { metric, host, latestEl };
    cells.push(cell);
    return cell;
  }

  // The intro paragraph: copy segments with the inline metrics between them.
  const intro = el('p', { className: 'sparkline-intro' });
  text.intro.forEach((segment, i) => {
    intro.append(segment);
    const metric = inlineSparklineMetrics[i];
    if (metric !== undefined) {
      const span = el('span', { className: 'sparkline-inline' }, [mountMetric(metric).host.el]);
      intro.append(span);
    }
  });

  const randomize = buttonWithTooltip({
    id: 'sparkline-randomize',
    label: text.randomize.label,
    tooltipText: text.randomize.tooltip,
    ariaLabel: text.randomize.aria,
    color: 'primary',
    onClick: () => {
      step++;
      for (const cell of cells) {
        const data = cell.metric.generate(step);
        cell.host.update({ data });
        if (cell.latestEl !== undefined) {
          cell.latestEl.textContent = cell.metric.latestText(data);
        }
      }
    },
    content: [icon('dice', { fixedWidth: true })]
  });

  const tableRows = tableSparklineMetrics.map(metric => {
    const latestEl = el('td', { className: 'sparkline-value' });
    const chartCell = el('td', { className: 'sparkline-cell' }, [mountMetric(metric, latestEl).host.el]);
    return el('tr', {}, [el('td', { text: metric.label }), latestEl, chartCell]);
  });

  const table = el('table', { className: 'sparkline-table' }, [
    el('thead', {}, [
      el('tr', {}, [
        el('th', { text: text.table.metric }),
        el('th', { text: text.table.latest }),
        el('th', { text: text.table.trend })
      ])
    ]),
    el('tbody', {}, tableRows)
  ]);

  const container = el('div', { className: 'mochart-demo-container' }, [
    el('div', { className: 'mochart-demo-tabs-container' }, [
      el('div', { className: 'mochart-demo-nav-group' }, [
        siteRootButton(props.siteRootUrl),
        backToDemosButton(props.onBackToDemos)
      ]),
      themeToggleButton()
    ]),
    el('div', { className: 'sparkline-page' }, [
      intro,
      el('div', { className: 'sparkline-controls' }, [randomize.el]),
      table
    ])
  ]);

  return {
    el: container,
    destroy() {
      for (const cell of cells) {
        cell.host.destroy();
      }
    }
  };
}
