import { createDefaultChart, getDefaults, validateConfigDetailed, type MochartInputConfig } from '@mochart/core';
import { createJsonEditor, createMochartConfigSupport, type JsonEditorDiagnostic } from '../src';
import '@mochart/core/mochart.css';
import '@mochart/editor/editor.css';
import './style.css';

const config: MochartInputConfig = {
  version: '1.0.0',
  titleConfig: { title: 'Monthly Revenue' },
  groupAxisConfig: { property: 'month', type: 'string', scale: 'ordinal' },
  seriesAllConfig: { renderer: 'bar' },
  seriesConfigs: [{ property: 'revenue', title: 'Revenue' }]
};

const data = [
  { month: 'Jan', revenue: 12 },
  { month: 'Feb', revenue: 18 },
  { month: 'Mar', revenue: 15 },
  { month: 'Apr', revenue: 24 },
  { month: 'May', revenue: 21 },
  { month: 'Jun', revenue: 28 }
];

const editorHost = document.querySelector<HTMLElement>('#editor')!;
const chartHost = document.querySelector<HTMLElement>('#chart')!;
const status = document.querySelector<HTMLElement>('#status')!;
const problems = document.querySelector<HTMLElement>('#problems')!;
let diagnostics: readonly JsonEditorDiagnostic[] = [];

function showDiagnostics(nextDiagnostics: readonly JsonEditorDiagnostic[]) {
  diagnostics = nextDiagnostics;
  const errors = diagnostics.filter(diagnostic => diagnostic.severity === 'error');
  status.textContent = errors.length === 0 ? 'Valid JSON' : `${errors.length} problem${errors.length === 1 ? '' : 's'}`;
  status.dataset.state = errors.length === 0 ? 'valid' : 'invalid';
  problems.replaceChildren(...diagnostics.slice(0, 5).map(diagnostic => {
    const item = document.createElement('p');
    item.className = `problem ${diagnostic.severity}`;
    item.textContent = diagnostic.message;
    return item;
  }));
}

const editor = createJsonEditor(editorHost, {
  value: JSON.stringify(config, null, 2),
  ariaLabel: 'Mochart configuration JSON',
  support: createMochartConfigSupport(),
  onChange: () => {
    status.textContent = 'Edited — apply when ready';
    status.dataset.state = 'edited';
  },
  onDiagnostics: showDiagnostics
});

let chartWidth = Math.max(1, Math.round(chartHost.clientWidth));
let chartHeight = Math.max(1, Math.round(chartHost.clientHeight));
const chart = createDefaultChart(chartHost, {
  config,
  data,
  width: chartWidth,
  height: chartHeight
});

document.querySelector<HTMLButtonElement>('#format')!.addEventListener('click', () => editor.format());
document.querySelector<HTMLButtonElement>('#apply')!.addEventListener('click', () => {
  try {
    const nextConfig: unknown = JSON.parse(editor.getValue());
    const validation = validateConfigDetailed(nextConfig, getDefaults(nextConfig));
    if (!validation.valid) {
      status.textContent = 'Fix the highlighted problems first';
      status.dataset.state = 'invalid';
      return;
    }
    chart.update({ config: nextConfig as MochartInputConfig });
    status.textContent = diagnostics.length === 0 ? 'Applied' : 'Applied with warnings';
    status.dataset.state = 'valid';
  }
  catch {
    status.textContent = 'Fix the JSON syntax first';
    status.dataset.state = 'invalid';
  }
});

const resizeObserver = new ResizeObserver(entries => {
  const { width, height } = entries[0]!.contentRect;
  const nextWidth = Math.max(1, Math.round(width));
  const nextHeight = Math.max(1, Math.round(height));
  if (nextWidth === chartWidth && nextHeight === chartHeight) return;
  chartWidth = nextWidth;
  chartHeight = nextHeight;
  chart.update({ width: chartWidth, height: chartHeight });
});
resizeObserver.observe(chartHost);
