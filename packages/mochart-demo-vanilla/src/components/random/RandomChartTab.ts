import type { MochartConfig } from '@mochart/core';

import { buttonWithTooltip, el, icon, setActiveClass } from '../misc/dom';
import { mountChart } from '../misc/chartHost';
import { exportButtons } from '../misc/ExportButtons';

import type { DemoDataProvider } from '../../types';

export interface RandomChartTabProps {
  active?: boolean;
  mochartConfig: MochartConfig;
  dataProvider: DemoDataProvider | null;
  onRandomizeBack: () => void;
  onRandomizeNext: () => void;
  applyReuse: boolean;
  toggleApplyReuse: () => void;
}

export interface RandomChartTabHandle {
  el: HTMLElement;
  setActive(active: boolean): void;
  update(next: { mochartConfig: MochartConfig; dataProvider: DemoDataProvider | null; applyReuse: boolean }): void;
  destroy(): void;
}

const defaultRate = 2000;

export function randomChartTab(props: RandomChartTabProps): RandomChartTabHandle {
  const { onRandomizeBack, onRandomizeNext, toggleApplyReuse } = props;

  let active = props.active ?? false;
  let mochartConfig = props.mochartConfig;
  let dataProvider = props.dataProvider;
  let applyReuse = props.applyReuse;

  let intervalId: ReturnType<typeof setInterval> | null = null;
  let playing = false;
  let rate = defaultRate;

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
    id: 'random-rate', className: 'form-control',
    attrs: { type: 'number', min: '5', max: '60000', step: '100', 'aria-label': 'Randomize interval in milliseconds' }
  });
  rateInput.value = '' + defaultRate;
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
    id: 'randomize-back', label: 'Back', ariaLabel: 'Randomize Back',
    tooltipText: 'Go back to the previous random dataset',
    onClick: onRandomizeBack,
    content: [icon('dice', { size: 'lg', fixedWidth: true, flip: 'horizontal' })]
  });
  const nextButton = buttonWithTooltip({
    id: 'randomize-next', label: 'Randomize', ariaLabel: 'Randomize Next',
    tooltipText: 'Generate the next random dataset',
    onClick: onRandomizeNext,
    content: [icon('dice', { size: 'lg', fixedWidth: true })]
  });
  const playButton = buttonWithTooltip({
    id: 'play', ariaLabel: 'Play Randomize',
    tooltipText: 'Keep generating random datasets at the interval',
    onClick: onPlayClick,
    content: [icon('play', { size: 'lg', fixedWidth: true })]
  });
  const stopButton = buttonWithTooltip({
    id: 'stop', disabled: true, ariaLabel: 'Stop',
    tooltipText: 'Stop generating',
    onClick: onStopClick,
    content: [icon('stop', { size: 'lg', fixedWidth: true })]
  });
  const reuseButton = buttonWithTooltip({
    id: 'reuse', label: 'Reuse', pressed: applyReuse, ariaLabel: 'Reuse',
    tooltipText: "Keep part of the data the same between randomizations (the config's reuse settings), so transitions animate with continuity — off generates fully independent datasets",
    onClick: toggleApplyReuse,
    content: [icon('recycle', { size: 'lg', fixedWidth: true })]
  });
  const exportGroup = exportButtons('random', () => chartSizer);

  const container = el('div', {
    className: 'mochart-demo-tab-container col chart' + (active ? ' active' : '')
  }, [
    chartSizer,
    el('div', { className: 'random-controls' }, [
      el('form', { className: 'form-inline' }, [
        el('div', { className: 'form-group' }, [
          el('div', { className: 'btn-toolbar', attrs: { role: 'toolbar' } }, [
            el('div', { className: 'btn-group' }, [backButton.el, nextButton.el, playButton.el, stopButton.el]),
            el('div', { className: 'form-group' }, [
              el('label', { className: 'form-control-plaintext', attrs: { for: 'random-rate' }, text: 'Interval (ms):' }),
              rateInput
            ])
          ]),
          el('div', { className: 'btn-toolbar ml-2', attrs: { role: 'toolbar' } }, [
            exportGroup.el,
            el('div', { className: 'btn-group' }, [reuseButton.el])
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
    update(next: { mochartConfig: MochartConfig; dataProvider: DemoDataProvider | null; applyReuse: boolean }) {
      if (next.mochartConfig !== mochartConfig || next.dataProvider !== dataProvider) {
        mochartConfig = next.mochartConfig;
        dataProvider = next.dataProvider;
        chartHost.update({ mochartConfig, dataProvider });
      }
      applyReuse = next.applyReuse;
      sync();
    },
    destroy() {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      chartHost.destroy();
    }
  };
}
