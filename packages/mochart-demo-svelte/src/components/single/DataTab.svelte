<script lang="ts">
  import { untrack } from 'svelte';

  import { ArrayOfObjectsDataProvider, getDataErrors } from '@mochart/core';
  import type { DataProvider } from '@mochart/core';

  import buildMochartDemoConfig from '../../config/mochartDemoConfig';
  import { collectUsedDataProperties, filterDataProperties, restoreHiddenDataProperties } from '../../config/unusedDataProperties';

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

  function formatData(dataJSON: unknown): string {
    return JSON.stringify(dataJSON).replace(/,/g, ', ').replace(/},/g, '},\n');
  }

  function isObject(v: unknown): boolean {
    return v !== null && v !== void 0 && typeof v === "object";
  }

  function isArrayOfObjects(candidate: unknown): boolean {
    return Array.isArray(candidate) && !candidate.some(v => !isObject(v));
  }

  type ParsedFullData = { full: DataRow[] } | { error: 'json' | 'data' };

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
    dataText = formatData(viewUsedProperties === null ? fullRows : filterDataProperties(fullRows, viewUsedProperties));
  }

  // Parse the textarea back to a full dataset, restoring any properties the
  // filtered view hid.
  function parseFullData(): ParsedFullData {
    let parsed: unknown;
    try {
      parsed = JSON.parse(dataText);
    }
    catch (error) {
      return { error: 'json' };
    }
    if (!isArrayOfObjects(parsed)) {
      return { error: 'data' };
    }
    const rows = parsed as DataRow[];
    return { full: viewUsedProperties === null ? rows : restoreHiddenDataProperties(rows, fullData, viewUsedProperties) };
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
          const parsed = parseFullData();
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
    const parsed = parseFullData();
    if ('error' in parsed) {
      errorMessage = parsed.error === 'json' ? 'Invalid JSON' : 'Invalid Data — should be an array of objects';
      return;
    }
    showUnused = !showUnused;
    errorMessage = null;
    renderView(parsed.full);
  }

  function applyData() {
    const parsed = parseFullData();
    if ('error' in parsed) {
      if (parsed.error === 'json') {
        console.warn('Invalid Data JSON');
        errorMessage = 'Invalid JSON';
        onDataError('Invalid Data ');
      }
      else {
        console.warn('Invalid Data - should be an array of objects');
        errorMessage = 'Invalid Data — details in the browser console';
        onDataError('Invalid Data');
      }
      return;
    }
    const parsedData = parsed.full;
    let error = null;
    const { mochartConfig } = buildMochartDemoConfig(config);
    if (mochartConfig.validation.valid) {
      const dataErrors = getDataErrors(mochartConfig, new ArrayOfObjectsDataProvider(parsedData, mochartConfig.groupAxisConfig.property ?? '') as unknown as DataProvider);
      if (dataErrors.length > 0) {
        console.warn('Invalid Data - Content Errors: ', dataErrors.join('\n'));
        error = 'Invalid Data Content';
      }
    }
    else {
      console.warn('Could not validate data since mochart config was not valid');
      error = 'Invalid Config & Data';
    }
    if (error) {
      errorMessage = error + ' — details in the browser console';
      onDataError(error);
    }
    else {
      errorMessage = null;
      fullData = parsedData;
      onDataChange(parsedData);
    }
  }

  const jsonError = $derived.by(() => {
    try {
      JSON.parse(dataText);
      return null;
    }
    catch (error) {
      return 'Invalid JSON';
    }
  });
  const footerError = $derived(jsonError ?? errorMessage);
</script>

<div class={"mochart-demo-tab-container col data" + (active ? " active" : "")}>
  <div class="mochart-demo-tab-content">
    <TextAreaContent value={dataText} onChange={onTextChange} />
  </div>
  <div class="mochart-demo-tab-footer">
    <div class="btn-toolbar" role="toolbar">
      <ButtonWithTooltip id="data-reset" label="Reset" tooltipText="Restore this demo's original data" tooltipPlacement="top-start"
                         onClick={resetData} aria-label="Reset">
        <Icon size="lg" fixedWidth={true} name="arrow-rotate-left" />
      </ButtonWithTooltip>
      <ButtonWithTooltip id="data-unused" label="Unused" pressed={showUnused}
                         tooltipText="Show or hide data properties the chart config does not use" tooltipPlacement="top-start"
                         onClick={toggleShowUnused} aria-label="Toggle Unused">
        <Icon size="lg" fixedWidth={true} name={showUnused ? 'eye' : 'eye-slash'} />
      </ButtonWithTooltip>
      <ButtonWithTooltip id="data-apply" label="Apply" disabled={jsonError !== null}
                         tooltipText="Apply this data — the chart updates when you return to the Chart tab" tooltipPlacement="top-start"
                         onClick={applyData} aria-label="Apply">
        <Icon size="lg" fixedWidth={true} name="check" />
      </ButtonWithTooltip>
      {#if footerError}
        <span class="mochart-demo-footer-error" role="alert">{footerError}</span>
      {/if}
    </div>
  </div>
</div>
