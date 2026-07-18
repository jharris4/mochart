<script lang="ts">
  import { untrack } from 'svelte';

  import { applyDataEdit, buildMochartDemoConfig, collectUsedDataProperties, demoText, formatDataView, getJsonError, parseFullData } from '@mochart/demo-common';

  import TextAreaContent from '../misc/TextAreaContent.svelte';
  import ButtonWithTooltip from '../misc/ButtonWithTooltip.svelte';
  import Icon from '../misc/Icon.svelte';

  import type { DemoConfig, DataRow } from '../../types';

  interface Props {
    active?: boolean;
    config: DemoConfig;
    data: DataRow[];
    onDataChange: (data: DataRow[]) => void;
    onDataError: (errorMessage: string) => void;
    onDataReset: () => void;
  }

  let { active = false, config, data, onDataChange, onDataError, onDataReset }: Props = $props();

  // Data properties the chart config does not read are hidden by default; the
  // Unused button toggles them. fullData is the complete dataset backing the
  // textarea, viewUsedProperties the used-set its current content was rendered
  // with (null when every property is shown).
  const usedProperties = $derived(collectUsedDataProperties(buildMochartDemoConfig(config).mochartConfig));
  let showUnused = $state(false);
  // svelte-ignore state_referenced_locally
  let fullData = data;
  let viewUsedProperties: Set<string> | null = null;

  let dataText = $state('');
  let errorMessage = $state<string | null>(null);

  function renderView(fullRows: DataRow[]): void {
    fullData = fullRows;
    viewUsedProperties = showUnused ? null : usedProperties;
    dataText = formatDataView(fullRows, viewUsedProperties);
  }

  function parseCurrentFullData(): ReturnType<typeof parseFullData> {
    return parseFullData(dataText, fullData, viewUsedProperties);
  }

  // Props intentionally seed local state with their initial value only; the
  // $effect.pre blocks below re-sync on later prop changes.
  // svelte-ignore state_referenced_locally
  renderView(data);

  // svelte-ignore state_referenced_locally
  let previousData = data;
  $effect.pre(() => {
    const nextData = data;
    untrack(() => {
      if (nextData !== previousData) {
        previousData = nextData;
        renderView(nextData);
      }
    });
  });

  // Re-filter when the applied config changes, keeping any (valid) unapplied edits.
  // svelte-ignore state_referenced_locally
  let previousConfig = config;
  $effect.pre(() => {
    const nextConfig = config;
    untrack(() => {
      if (nextConfig !== previousConfig) {
        previousConfig = nextConfig;
        if (!showUnused) {
          const parsed = parseCurrentFullData();
          if (!('error' in parsed)) {
            renderView(parsed.full);
          }
        }
      }
    });
  });

  function onTextChange(nextDataText: string) {
    dataText = nextDataText;
    errorMessage = null;
  }

  function resetData() {
    renderView(data);
    errorMessage = null;
    onDataReset();
  }

  function toggleShowUnused() {
    const parsed = parseCurrentFullData();
    if ('error' in parsed) {
      errorMessage = parsed.error === 'json' ? demoText.errors.invalidJson : demoText.errors.invalidDataArray;
      return;
    }
    showUnused = !showUnused;
    errorMessage = null;
    renderView(parsed.full);
  }

  function applyData() {
    const result = applyDataEdit(dataText, fullData, viewUsedProperties, config);
    if (result.ok) {
      errorMessage = null;
      fullData = result.data;
      onDataChange(result.data);
    }
    else {
      errorMessage = result.errorMessage;
      onDataError(result.callbackError);
    }
  }

  const jsonError = $derived(getJsonError(dataText));
  const footerError = $derived(jsonError ?? errorMessage);
</script>

<div class={"mochart-demo-tab-container col data" + (active ? " active" : "")}>
  <div class="mochart-demo-tab-content">
    <TextAreaContent value={dataText} onChange={onTextChange} />
  </div>
  <div class="mochart-demo-tab-footer">
    <div class="btn-toolbar" role="toolbar">
      <ButtonWithTooltip id="data-reset" label={demoText.dataTab.reset.label} tooltipText={demoText.dataTab.reset.tooltip} tooltipPlacement="top-start"
                         onClick={resetData} aria-label={demoText.dataTab.reset.aria}>
        <Icon size="lg" fixedWidth={true} name="arrow-rotate-left" />
      </ButtonWithTooltip>
      <ButtonWithTooltip id="data-unused" label={demoText.dataTab.unused.label} pressed={showUnused}
                         tooltipText={demoText.dataTab.unused.tooltip} tooltipPlacement="top-start"
                         onClick={toggleShowUnused} aria-label={demoText.dataTab.unused.aria}>
        <Icon size="lg" fixedWidth={true} name={showUnused ? 'eye' : 'eye-slash'} />
      </ButtonWithTooltip>
      <ButtonWithTooltip id="data-apply" label={demoText.dataTab.apply.label} disabled={jsonError !== null}
                         tooltipText={demoText.dataTab.apply.tooltip} tooltipPlacement="top-start"
                         onClick={applyData} aria-label={demoText.dataTab.apply.aria}>
        <Icon size="lg" fixedWidth={true} name="check" />
      </ButtonWithTooltip>
      {#if footerError}
        <span class="mochart-demo-footer-error" role="alert">{footerError}</span>
      {/if}
    </div>
  </div>
</div>
