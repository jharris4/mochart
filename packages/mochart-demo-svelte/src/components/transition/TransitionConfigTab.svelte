<script lang="ts">
  import { untrack } from 'svelte';

  import validators from 'movalid';

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

  let configText = $state(formatConfig(transitionConfig));

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
              onUpdate(newConfig);
            }
            else {
              console.warn('Invalid Transition Config, data should be an array of arrays: ', newConfig.data);
              alert('Invalid Transition Data, should be an array of arrays');
            }
          }
          else {
            if (errors.length > 0) {
              console.warn('errors: ', errors);
            }
            if (warnings.length > 0) {
              console.warn('warnings: ', warnings);
            }
            alert('Invalid Chart Config, mochart config was not valid');
          }
        }
        else {
          console.warn('Invalid Transition Config, config should be an object: ', newConfig.config);
          alert('Invalid Chart Config, should be an object');
        }
      }
      else {
        console.warn('Invalid Transition Config, should be an object: ', configText);
        alert('Invalid Transition Config, should be an object');
      }
    }
    catch (error) {
      console.warn('Invalid Transition Config JSON: ', configText);
      alert('Invalid Transition Config JSON');
    }
  }
</script>

<div class={"mochart-demo-tab-container col config" + (active ? " active" : "")}>
  <div class="mochart-demo-tab-content">
    <TextAreaContent value={configText} onChange={onTextChange} />
  </div>
  <div class="mochart-demo-tab-footer">
    <div class="btn-toolbar" role="toolbar">
      <ButtonWithTooltip id="config-reset" tooltipText="Reset" tooltipPlacement="top-start"
                         onClick={onReset} aria-label="Reset">
        <Icon size="lg" fixedWidth={true} name="undo" />
      </ButtonWithTooltip>
      <ButtonWithTooltip id="config-apply" tooltipText="Apply" tooltipPlacement="top-start"
                         onClick={onUpdateClick} aria-label="Apply">
        <Icon size="lg" fixedWidth={true} name="check" />
      </ButtonWithTooltip>
    </div>
  </div>
</div>
