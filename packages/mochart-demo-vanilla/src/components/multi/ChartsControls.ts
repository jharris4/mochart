import { buttonWithTooltip, el, icon } from '../misc/dom';

export interface ChartsControlsProps {
  onRowsChange: (rows: number) => void;
  onColsChange: (cols: number) => void;
  onStepBackwardClick: () => void;
  onStepForwardClick: () => void;
  onPlayBackwardClick: () => void;
  onPlayForwardClick: () => void;
  onStopClick: () => void;
  onRateChange: (rate: number) => void;
}

export interface ChartsControlsHandle {
  el: HTMLElement;
  setPlaying(playing: boolean): void;
}

const defaultChartRows = 2;
const defaultChartCols = 2;
const defaultRate = 2000;

export function chartsControls(props: ChartsControlsProps): ChartsControlsHandle {
  const rowsInput = el('input', {
    id: 'grid-rows', className: 'form-control',
    attrs: { type: 'number', min: '1', max: '4', 'aria-label': 'Grid rows' }
  });
  rowsInput.value = '' + defaultChartRows;
  rowsInput.addEventListener('input', () => {
    const rows = rowsInput.value;
    if (!isNaN(parseFloat(rows)) && isFinite(+rows)) {
      const value = +rows;
      if (value >= 1 && value <= 4) {
        props.onRowsChange(value);
      }
    }
  });

  const colsInput = el('input', {
    id: 'grid-cols', className: 'form-control',
    attrs: { type: 'number', min: '1', max: '4', 'aria-label': 'Grid columns' }
  });
  colsInput.value = '' + defaultChartCols;
  colsInput.addEventListener('input', () => {
    const cols = colsInput.value;
    if (!isNaN(parseFloat(cols)) && isFinite(+cols)) {
      const value = +cols;
      if (value >= 1 && value <= 4) {
        props.onColsChange(value);
      }
    }
  });

  const rateInput = el('input', {
    id: 'multi-rate', className: 'form-control',
    attrs: { type: 'number', min: '5', max: '60000', step: '100', 'aria-label': 'Playback interval in milliseconds' }
  });
  rateInput.value = '' + defaultRate;
  rateInput.addEventListener('input', () => {
    const rate = rateInput.value;
    if (!isNaN(parseFloat(rate)) && isFinite(+rate)) {
      const value = +rate;
      if (value >= 5 && value <= 60000) {
        props.onRateChange(value);
      }
    }
  });

  const stepBackButton = buttonWithTooltip({
    id: 'step-back', ariaLabel: 'Step Backward',
    tooltipText: 'Step all charts one dataset backward',
    onClick: props.onStepBackwardClick,
    content: [icon('backward-step', { size: 'lg', fixedWidth: true })]
  });
  const stepForwardButton = buttonWithTooltip({
    id: 'step-forward', ariaLabel: 'Step Forward',
    tooltipText: 'Step all charts one dataset forward',
    onClick: props.onStepForwardClick,
    content: [icon('forward-step', { size: 'lg', fixedWidth: true })]
  });
  const playBackwardButton = buttonWithTooltip({
    id: 'play-backward', ariaLabel: 'Play Backward',
    tooltipText: 'Play backward through the datasets at the interval',
    onClick: props.onPlayBackwardClick,
    content: [icon('play', { size: 'lg', fixedWidth: true, flip: 'horizontal' })]
  });
  const playForwardButton = buttonWithTooltip({
    id: 'play-forward', ariaLabel: 'Play Forward',
    tooltipText: 'Play forward through the datasets at the interval',
    onClick: props.onPlayForwardClick,
    content: [icon('play', { size: 'lg', fixedWidth: true })]
  });
  const stopButton = buttonWithTooltip({
    id: 'stop', disabled: true, ariaLabel: 'Stop',
    tooltipText: 'Stop playback',
    onClick: props.onStopClick,
    content: [icon('stop', { size: 'lg', fixedWidth: true })]
  });

  const container = el('div', { className: 'multi-controls' }, [
    el('form', { className: 'form-inline' }, [
      el('div', { className: 'form-group' }, [
        el('label', { className: 'form-control-plaintext', attrs: { for: 'grid-rows' }, text: 'Grid:' }),
        rowsInput,
        el('span', { className: 'form-control-plaintext', text: '×' }),
        colsInput
      ]),
      el('div', { className: 'form-group' }, [
        el('div', { className: 'btn-toolbar', attrs: { role: 'toolbar' } }, [
          el('div', { className: 'btn-group' }, [
            stepBackButton.el, stepForwardButton.el, playBackwardButton.el, playForwardButton.el, stopButton.el
          ])
        ])
      ]),
      el('div', { className: 'form-group' }, [
        el('label', { className: 'form-control-plaintext', attrs: { for: 'multi-rate' }, text: 'Interval (ms):' }),
        rateInput
      ])
    ])
  ]);

  return {
    el: container,
    setPlaying(playing: boolean) {
      rowsInput.disabled = playing;
      colsInput.disabled = playing;
      rateInput.disabled = playing;
      stepBackButton.setDisabled(playing);
      stepForwardButton.setDisabled(playing);
      playBackwardButton.setDisabled(playing);
      playForwardButton.setDisabled(playing);
      stopButton.setDisabled(!playing);
    }
  };
}
