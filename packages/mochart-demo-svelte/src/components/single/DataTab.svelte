<script lang="ts">
  import { untrack } from 'svelte';

  import { ArrayOfObjectsDataProvider, getDataErrors } from 'mochart';
  import type { DataProvider } from 'mochart';

  import buildMochartDemoConfig from '../../config/mochartDemoConfig';

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

  let { active = false, config, data, onDataChange, onDataError, onDataReset }: Props = $props();

  // Props intentionally seed local state with their initial value only; the
  // $effect.pre below re-syncs on later prop changes.
  // svelte-ignore state_referenced_locally
  let dataText = $state(formatData(data));
  let errorMessage = $state<string | null>(null);

  // svelte-ignore state_referenced_locally
  let previousData = data;
  $effect.pre(() => {
    const nextData = data;
    untrack(() => {
      if (nextData !== previousData) {
        previousData = nextData;
        dataText = formatData(nextData);
      }
    });
  });

  function onTextChange(nextDataText: string) {
    dataText = nextDataText;
    errorMessage = null;
  }

  function resetData() {
    dataText = formatData(data);
    errorMessage = null;
    onDataReset();
  }

  function applyData() {
    try {
      const parsedData = JSON.parse(dataText);
      let error = null;
      if (isArrayOfObjects(parsedData)) {
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
      }
      else {
        console.warn('Invalid Data - should be an array of objects');
        error = 'Invalid Data';
      }
      if (error) {
        errorMessage = error + ' — details in the browser console';
        onDataError(error);
      }
      else {
        errorMessage = null;
        onDataChange(parsedData);
      }
    }
    catch (error) {
      console.warn('Invalid Data JSON: ' + String(error));
      errorMessage = 'Invalid JSON';
      onDataError('Invalid Data ');
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
