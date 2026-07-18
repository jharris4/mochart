<script lang="ts">
  import { untrack } from 'svelte';

  import validators from '@mochart/movalid';

  import buildMochartDemoConfig from '../../config/mochartDemoConfig';

  import TextAreaContent from '../misc/TextAreaContent.svelte';
  import ButtonWithTooltip from '../misc/ButtonWithTooltip.svelte';
  import Icon from '../misc/Icon.svelte';

  import type { TransitionConfig } from '../../types';

  interface Props {
    active?: boolean;
    transitionConfig: TransitionConfig;
    onUpdate: (config: TransitionConfig) => void;
    onReset: () => void;
  }

  const objectValidator = validators.object();
  const arrayValidator = validators.array();

  function formatConfig(transitionConfig: TransitionConfig): string {
    if (transitionConfig && objectValidator(transitionConfig)) {
      let configText = '{}';
      let dataText = '[]';
      if (transitionConfig.config && objectValidator(transitionConfig.config)) {
        configText = JSON.stringify(transitionConfig.config, null, '\t');
        configText = configText.replace(/\n\t/g, '\n\t\t');
        configText = configText.replace(/\n}/g, '\n\t}');
      }
      if (transitionConfig.data && arrayValidator(transitionConfig.data)) {
        const dataArray = transitionConfig.data;
        const dataTexts: string[] = [];
        let aDataText: string;
        for (const data of dataArray) {
          if (data && arrayValidator(data)) {
            aDataText = JSON.stringify(data).replace(/},{/g, '},\n\t\t\t{').replace(/,/g, ', ');
            aDataText = aDataText.replace(/\[{/, '[\n\t\t\t{');
            aDataText = aDataText.replace(/}\]/, '}\n\t\t]');
            dataTexts.push(aDataText);
          }
        }
        dataText = '[\n\t\t' + dataTexts.join(',\n\t\t') + '\n\t]';
      }
      return '{\n' + '\t"config": ' + configText + ',\n\t"data": ' + dataText + '\n}';
    }
    else {
      return String(transitionConfig);
    }
  }

  let { active = false, transitionConfig, onUpdate, onReset }: Props = $props();

  // Props intentionally seed local state with their initial value only; the
  // $effect.pre below re-syncs on later prop changes.
  // svelte-ignore state_referenced_locally
  let configText = $state(formatConfig(transitionConfig));
  let errorMessage = $state<string | null>(null);

  // svelte-ignore state_referenced_locally
  let previousTransitionConfig = transitionConfig;
  $effect.pre(() => {
    const nextTransitionConfig = transitionConfig;
    untrack(() => {
      if (nextTransitionConfig !== previousTransitionConfig) {
        previousTransitionConfig = nextTransitionConfig;
        configText = formatConfig(nextTransitionConfig);
      }
    });
  });

  function onTextChange(nextConfigText: string) {
    configText = nextConfigText;
    errorMessage = null;
  }

  function onUpdateClick() {
    try {
      const newConfig = JSON.parse(configText);
      if (objectValidator(newConfig)) {
        if (objectValidator(newConfig.config)) {
          const mochartDemoConfig = buildMochartDemoConfig(newConfig.config);
          const { configValidation } = mochartDemoConfig;
          const { valid, errors, warnings } = configValidation;
          if (valid) {
            if (arrayValidator(newConfig.data) && !newConfig.data.some((aData: unknown) => !arrayValidator(aData))) {
              errorMessage = null;
              onUpdate(newConfig);
            }
            else {
              console.warn('Invalid Transition Config, data should be an array of arrays: ', newConfig.data);
              errorMessage = '"data" should be an array of arrays';
            }
          }
          else {
            if (errors.length > 0) {
              console.warn('errors: ', errors);
            }
            if (warnings.length > 0) {
              console.warn('warnings: ', warnings);
            }
            errorMessage = 'Invalid chart config — details in the browser console';
          }
        }
        else {
          console.warn('Invalid Transition Config, config should be an object: ', newConfig.config);
          errorMessage = '"config" should be an object';
        }
      }
      else {
        console.warn('Invalid Transition Config, should be an object: ', configText);
        errorMessage = 'Transition config should be an object';
      }
    }
    catch (error) {
      console.warn('Invalid Transition Config JSON: ', configText);
      errorMessage = 'Invalid JSON';
    }
  }

  const jsonError = $derived.by(() => {
    try {
      JSON.parse(configText);
      return null;
    }
    catch (error) {
      return 'Invalid JSON';
    }
  });
  const footerError = $derived(jsonError ?? errorMessage);
</script>

<div class={"mochart-demo-tab-container col config" + (active ? " active" : "")}>
  <div class="mochart-demo-tab-content">
    <TextAreaContent value={configText} onChange={onTextChange} />
  </div>
  <div class="mochart-demo-tab-footer">
    <div class="btn-toolbar" role="toolbar">
      <ButtonWithTooltip id="config-reset" label="Reset" tooltipText="Restore the original transition config" tooltipPlacement="top-start"
                         onClick={onReset} aria-label="Reset">
        <Icon size="lg" fixedWidth={true} name="arrow-rotate-left" />
      </ButtonWithTooltip>
      <ButtonWithTooltip id="config-apply" label="Apply" disabled={jsonError !== null}
                         tooltipText="Apply this config to the transition charts" tooltipPlacement="top-start"
                         onClick={onUpdateClick} aria-label="Apply">
        <Icon size="lg" fixedWidth={true} name="check" />
      </ButtonWithTooltip>
      {#if footerError}
        <span class="mochart-demo-footer-error" role="alert">{footerError}</span>
      {/if}
    </div>
  </div>
</div>
