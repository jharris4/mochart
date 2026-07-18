<script lang="ts">
  import ButtonWithTooltip from '../misc/ButtonWithTooltip.svelte';
  import Icon from '../misc/Icon.svelte';

  interface Props {
    playing: boolean;
    onRowsChange: (rows: number) => void;
    onColsChange: (cols: number) => void;
    onStepBackwardClick: () => void;
    onStepForwardClick: () => void;
    onPlayBackwardClick: () => void;
    onPlayForwardClick: () => void;
    onStopClick: () => void;
    onRateChange: (rate: number) => void;
  }

  type InputEvent = Event & { currentTarget: EventTarget & HTMLInputElement };

  const defaultChartRows = 2;
  const defaultChartCols = 2;
  const defaultRate = 2000;

  let {
    playing,
    onRowsChange,
    onColsChange,
    onStepBackwardClick,
    onStepForwardClick,
    onPlayBackwardClick,
    onPlayForwardClick,
    onStopClick,
    onRateChange
  }: Props = $props();

  let rateText = $state('' + defaultRate);
  let rowsText = $state('' + defaultChartRows);
  let colsText = $state('' + defaultChartCols);

  // Input values arrive as strings and are coerced to numbers in place, so the
  // working variable is intentionally loose (matching the original demo).
  function rowsChanged(event: InputEvent) {
    let rows: any = event.currentTarget.value;
    if (!isNaN(parseFloat(rows)) && isFinite(rows)) {
      rows = +rows;
      if (rows >= 1 && rows <= 4) {
        onRowsChange(rows);
      }
    }
    rowsText = rows;
  }

  function colsChanged(event: InputEvent) {
    let cols: any = event.currentTarget.value;
    if (!isNaN(parseFloat(cols)) && isFinite(cols)) {
      cols = +cols;
      if (cols >= 1 && cols <= 4) {
        onColsChange(cols);
      }
    }
    colsText = cols;
  }

  function rateChanged(event: InputEvent) {
    let rate: any = event.currentTarget.value;
    if (!isNaN(parseFloat(rate)) && isFinite(rate)) {
      rate = +rate;
      if (rate >= 5 && rate <= 60000) {
        onRateChange(rate);
      }
    }
    rateText = rate;
  }
</script>

<div class="multi-controls">
  <form class="form-inline">
    <div class="form-group">
      <label class="form-control-plaintext" for="grid-rows">Grid:</label>
      <input id="grid-rows" disabled={playing} type="number" min="1" max="4" class="form-control" value={rowsText}
             oninput={rowsChanged} aria-label="Grid rows" />
      <span class="form-control-plaintext">&times;</span>
      <input id="grid-cols" disabled={playing} type="number" min="1" max="4" class="form-control" value={colsText}
             oninput={colsChanged} aria-label="Grid columns" />
    </div>
    <div class="form-group">
      <div class="btn-toolbar" role="toolbar">
        <div class="btn-group">
          <ButtonWithTooltip id="step-back" disabled={playing} tooltipText="Step all charts one dataset backward" tooltipPlacement="top-start"
                             onClick={onStepBackwardClick} aria-label="Step Backward">
            <Icon size="lg" fixedWidth={true} name="backward-step" />
          </ButtonWithTooltip>
          <ButtonWithTooltip id="step-forward" disabled={playing} tooltipText="Step all charts one dataset forward" tooltipPlacement="top-start"
                             onClick={onStepForwardClick} aria-label="Step Forward">
            <Icon size="lg" fixedWidth={true} name="forward-step" />
          </ButtonWithTooltip>
          <ButtonWithTooltip id="play-backward" disabled={playing} tooltipText="Play backward through the datasets at the interval" tooltipPlacement="top-start"
                             onClick={onPlayBackwardClick} aria-label="Play Backward">
            <Icon size="lg" fixedWidth={true} name="play" flip="horizontal" />
          </ButtonWithTooltip>
          <ButtonWithTooltip id="play-forward" disabled={playing} tooltipText="Play forward through the datasets at the interval" tooltipPlacement="top-start"
                             onClick={onPlayForwardClick} aria-label="Play Forward">
            <Icon size="lg" fixedWidth={true} name="play" />
          </ButtonWithTooltip>
          <ButtonWithTooltip id="stop" disabled={!playing} tooltipText="Stop playback" tooltipPlacement="top-start"
                             onClick={onStopClick} aria-label="Stop">
            <Icon size="lg" fixedWidth={true} name="stop" />
          </ButtonWithTooltip>
        </div>
      </div>
    </div>
    <div class="form-group">
      <label class="form-control-plaintext" for="multi-rate">Interval (ms):</label>
      <input id="multi-rate" disabled={playing} type="number" min="5" max="60000" step="100" class="form-control" value={rateText}
             oninput={rateChanged} aria-label="Playback interval in milliseconds" />
    </div>
  </form>
</div>
