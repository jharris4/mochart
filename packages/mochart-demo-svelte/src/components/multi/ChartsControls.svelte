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
      <input disabled={playing} type="text" class="form-control" value={rowsText} maxlength="3" size="3" oninput={rowsChanged} />
      <span class="form-control-plaintext">x</span>
      <input disabled={playing} type="text" class="form-control" value={colsText} maxlength="3" size="3" oninput={colsChanged} />
    </div>
    <div class="form-group">
      <div class="btn-toolbar" role="toolbar">
        <div class="btn-group">
          <ButtonWithTooltip id="step-back" disabled={playing} tooltipText="Step Backward" tooltipPlacement="top-start"
                             onClick={onStepBackwardClick} aria-label="Step Backward">
            <Icon size="lg" fixedWidth={true} name="step-backward" />
          </ButtonWithTooltip>
          <ButtonWithTooltip id="step-forward" disabled={playing} tooltipText="Step Forward" tooltipPlacement="top-start"
                             onClick={onStepForwardClick} aria-label="Step Forward">
            <Icon size="lg" fixedWidth={true} name="step-forward" />
          </ButtonWithTooltip>
          <ButtonWithTooltip id="play-backward" disabled={playing} tooltipText="Play Backward" tooltipPlacement="top-start"
                             onClick={onPlayBackwardClick} aria-label="Play Backward">
            <Icon size="lg" fixedWidth={true} name="play" flip="horizontal" />
          </ButtonWithTooltip>
          <ButtonWithTooltip id="play-forward" disabled={playing} tooltipText="Play Forward" tooltipPlacement="top-start"
                             onClick={onPlayForwardClick} aria-label="Play Forward">
            <Icon size="lg" fixedWidth={true} name="play" />
          </ButtonWithTooltip>
          <ButtonWithTooltip id="stop" disabled={!playing} tooltipText="Stop" tooltipPlacement="top-start"
                             onClick={onStopClick} aria-label="Stop">
            <Icon size="lg" fixedWidth={true} name="stop" />
          </ButtonWithTooltip>
        </div>
      </div>
    </div>
    <div class="form-group">
      <input disabled={playing} type="text" class="form-control" value={rateText} maxlength="4" size="4" oninput={rateChanged} />
    </div>
  </form>
</div>
