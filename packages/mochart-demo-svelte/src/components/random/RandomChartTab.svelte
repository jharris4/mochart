<script>
  import { untrack, onDestroy } from 'svelte';

  import { Chart } from 'mochart-svelte';

  import ButtonWithTooltip from '../misc/ButtonWithTooltip.svelte';
  import Icon from '../misc/Icon.svelte';

  const defaultRate = 2000;

  let {
    active = false,
    mochartConfig,
    dataProvider,
    onRandomizeBack,
    onRandomizeNext,
    applyReuse,
    toggleApplyReuse
  } = $props();

  let intervalId = null;

  let playing = $state(false);
  let rate = $state(defaultRate);
  let rateText = $state('' + defaultRate);

  let previousActive = active;
  $effect.pre(() => {
    const nextActive = active;
    untrack(() => {
      if (nextActive !== previousActive) {
        previousActive = nextActive;
        onStopClick();
      }
    });
  });

  function onPlayClick() {
    playing = true;
    intervalId = setInterval(onRandomizeNext, rate);
  }

  function onStopClick() {
    clearInterval(intervalId);
    intervalId = null;
    playing = false;
  }

  function rateChanged(event) {
    let nextRateText = event.target.value;
    if (!isNaN(parseFloat(nextRateText)) && isFinite(nextRateText)) {
      nextRateText = +nextRateText;
      if (nextRateText >= 5 && nextRateText <= 60000) {
        rate = nextRateText;
      }
    }
    rateText = nextRateText;
  }

  onDestroy(() => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  });
</script>

<div class={"mochart-demo-tab-container col chart" + (active ? " active" : "")}>
  <div class="random-chart-sizer">
    <Chart style="flex: 1 1 auto; min-width: 0; min-height: 0; overflow: hidden;"
           {mochartConfig} {dataProvider} />
  </div>
  <div class="random-controls">
    <form class="form-inline">
      <div class="form-group">
        <div class="btn-toolbar" role="toolbar">
          <div class="btn-group">
            <ButtonWithTooltip id="randomize-back" disabled={playing} tooltipText="Randomize Back" tooltipPlacement="top-start"
                               onClick={onRandomizeBack} aria-label="Randomize Back">
              <Icon size="lg" fixedWidth={true} name="random" flip="horizontal" />
            </ButtonWithTooltip>
            <ButtonWithTooltip id="randomize-next" disabled={playing} tooltipText="Randomize Next" tooltipPlacement="top-start"
                               onClick={onRandomizeNext} aria-label="Randomize Next">
              <Icon size="lg" fixedWidth={true} name="random" />
            </ButtonWithTooltip>
            <ButtonWithTooltip id="play" disabled={playing} tooltipText="Play Randomize" tooltipPlacement="top-start"
                               onClick={onPlayClick} aria-label="Play Randomize">
              <Icon size="lg" fixedWidth={true} name="play" />
            </ButtonWithTooltip>
            <ButtonWithTooltip id="stop" disabled={!playing} tooltipText="Stop" tooltipPlacement="top-start"
                               onClick={onStopClick} aria-label="Stop">
              <Icon size="lg" fixedWidth={true} name="stop" />
            </ButtonWithTooltip>
          </div>
          <div class="form-group">
            <input disabled={playing} type="text" class="form-control" value={rateText} maxlength="4" size="4" oninput={rateChanged} />
          </div>
        </div>
        <div class="btn-toolbar ml-2" role="toolbar">
          <div class="btn-group">
            <ButtonWithTooltip id="reuse" disabled={playing} tooltipText="Reuse" tooltipPlacement="top-start"
                               onClick={toggleApplyReuse} aria-label="Reuse" color={applyReuse ? 'primary' : 'secondary'}>
              <Icon size="lg" fixedWidth={true} name="recycle" />
            </ButtonWithTooltip>
          </div>
        </div>
      </div>
    </form>
  </div>
</div>
