import type { MochartConfig } from '@mochart/core';
import { exportPNG, exportSVG } from '@mochart/export';

import { getChartExportOptions, demoText } from '@mochart/demo-common';
import type { ShareState } from '@mochart/demo-common';

import { buttonWithTooltip, el, icon, setActiveClass } from '../misc/dom';
import { mountChart } from '../misc/chartHost';
import { exportShareMenu } from '../misc/ExportShareMenu';

import type { DemoDataProvider, RandomConfigWithValid } from '../../types';

export interface RandomChartTabProps {
  active?: boolean;
  mochartConfig: MochartConfig;
  dataProvider: DemoDataProvider | null;
  randomConfig: RandomConfigWithValid;
  initialRate?: number;
  onRandomizeBack: () => void;
  onRandomizeNext: () => void;
  applyReuse: boolean;
  toggleApplyReuse: () => void;
}

export interface RandomChartTabHandle {
  el: HTMLElement;
  setActive(active: boolean): void;
  update(next: { mochartConfig: MochartConfig; dataProvider: DemoDataProvider | null; applyReuse: boolean; randomConfig: RandomConfigWithValid }): void;
  destroy(): void;
}

const defaultRate = 2000;

export function randomChartTab(props: RandomChartTabProps): RandomChartTabHandle {
  const { onRandomizeBack, onRandomizeNext, toggleApplyReuse } = props;

  let active = props.active ?? false;
  let mochartConfig = props.mochartConfig;
  let dataProvider = props.dataProvider;
  let applyReuse = props.applyReuse;
  let randomConfig = props.randomConfig;

  let intervalId: ReturnType<typeof setInterval> | null = null;
  let playing = false;
  // A share link restores the interval; otherwise start on the default.
  let rate = props.initialRate ?? defaultRate;

  const chartHost = mountChart(
    { mochartConfig, dataProvider },
    { style: 'flex: 1 1 auto; min-width: 0; min-height: 0; overflow: hidden;' }
  );
  const chartSizer = el('div', { className: 'random-chart-sizer' }, [chartHost.el]);

  function onPlayClick(): void {
    playing = true;
    intervalId = setInterval(onRandomizeNext, rate);
    sync();
  }

  function onStopClick(): void {
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
    intervalId = null;
    playing = false;
    sync();
  }

  const rateInput = el('input', {
    id: 'random-rate', className: 'demo-input',
    attrs: { type: 'number', min: '5', max: '60000', step: '100', 'aria-label': demoText.randomChartTab.intervalAria }
  });
  rateInput.value = '' + (props.initialRate ?? defaultRate);
  rateInput.addEventListener('input', () => {
    const nextRateText = rateInput.value;
    if (!isNaN(parseFloat(nextRateText)) && isFinite(+nextRateText)) {
      const value = +nextRateText;
      if (value >= 5 && value <= 60000) {
        rate = value;
      }
    }
  });

  const backButton = buttonWithTooltip({
    id: 'randomize-back', label: demoText.randomChartTab.back.label, ariaLabel: demoText.randomChartTab.back.aria,
    tooltipText: demoText.randomChartTab.back.tooltip,
    onClick: onRandomizeBack,
    content: [icon('dice', { size: 'lg', fixedWidth: true, flip: 'horizontal' })]
  });
  const nextButton = buttonWithTooltip({
    id: 'randomize-next', label: demoText.randomChartTab.randomize.label, ariaLabel: demoText.randomChartTab.randomize.aria,
    tooltipText: demoText.randomChartTab.randomize.tooltip,
    onClick: onRandomizeNext,
    content: [icon('dice', { size: 'lg', fixedWidth: true })]
  });
  const playButton = buttonWithTooltip({
    id: 'play', ariaLabel: demoText.randomChartTab.play.aria,
    tooltipText: demoText.randomChartTab.play.tooltip,
    onClick: onPlayClick,
    content: [icon('play', { size: 'lg', fixedWidth: true })]
  });
  const stopButton = buttonWithTooltip({
    id: 'stop', disabled: true, ariaLabel: demoText.randomChartTab.stop.aria,
    tooltipText: demoText.randomChartTab.stop.tooltip,
    onClick: onStopClick,
    content: [icon('stop', { size: 'lg', fixedWidth: true })]
  });
  const reuseButton = buttonWithTooltip({
    id: 'reuse', label: demoText.randomChartTab.reuse.label, pressed: applyReuse, ariaLabel: demoText.randomChartTab.reuse.aria,
    tooltipText: demoText.randomChartTab.reuse.tooltip,
    onClick: toggleApplyReuse,
    content: [icon('recycle', { size: 'lg', fixedWidth: true })]
  });
  // Share captures the generator config, the reuse toggle and the interval; the
  // step comes from the /random/:demoId/:randomId path already in the URL.
  const menu = exportShareMenu({
    idPrefix: 'random',
    exportPng: () => { void exportPNG(chartSizer, getChartExportOptions()); },
    exportSvg: () => { exportSVG(chartSizer, getChartExportOptions()); },
    getShareState: (): ShareState => ({ mode: 'random', randomConfig, applyReuse, interval: rate })
  });

  const container = el('div', {
    className: 'mochart-demo-tab-container demo-layout-col chart' + (active ? ' active' : '')
  }, [
    chartSizer,
    el('div', { className: 'random-controls' }, [
      el('form', { className: 'demo-form-row' }, [
        el('div', { className: 'demo-field' }, [
          el('div', { className: 'demo-toolbar', attrs: { role: 'toolbar' } }, [
            el('div', { className: 'demo-btn-group' }, [backButton.el, nextButton.el, playButton.el, stopButton.el]),
            el('div', { className: 'demo-field' }, [
              el('label', { className: 'demo-label', attrs: { for: 'random-rate' }, text: demoText.randomChartTab.intervalLabel }),
              rateInput
            ])
          ]),
          el('div', { className: 'demo-toolbar', attrs: { role: 'toolbar' } }, [
            el('div', { className: 'demo-btn-group' }, [reuseButton.el]),
            menu.el
          ])
        ])
      ])
    ])
  ]);

  function sync(): void {
    backButton.setDisabled(playing);
    nextButton.setDisabled(playing);
    playButton.setDisabled(playing);
    stopButton.setDisabled(!playing);
    reuseButton.setDisabled(playing);
    reuseButton.setPressed(applyReuse);
    rateInput.disabled = playing;
  }
  sync();

  return {
    el: container,
    setActive(nextActive: boolean) {
      if (nextActive !== active) {
        active = nextActive;
        setActiveClass(container, nextActive);
        onStopClick();
      }
    },
    update(next: { mochartConfig: MochartConfig; dataProvider: DemoDataProvider | null; applyReuse: boolean; randomConfig: RandomConfigWithValid }) {
      if (next.mochartConfig !== mochartConfig || next.dataProvider !== dataProvider) {
        mochartConfig = next.mochartConfig;
        dataProvider = next.dataProvider;
        chartHost.update({ mochartConfig, dataProvider });
      }
      applyReuse = next.applyReuse;
      randomConfig = next.randomConfig;
      sync();
    },
    destroy() {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      menu.destroy();
      chartHost.destroy();
    }
  };
}
