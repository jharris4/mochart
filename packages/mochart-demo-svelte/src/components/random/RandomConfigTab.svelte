<script lang="ts">
  import { untrack } from 'svelte';

  import TextAreaContent from '../misc/TextAreaContent.svelte';
  import ButtonWithTooltip from '../misc/ButtonWithTooltip.svelte';
  import Icon from '../misc/Icon.svelte';

  import { demoText, formatRandomConfig, validateRandomConfig } from '@mochart/demo-common';

  import type { RandomConfigWithValid } from '../../types';

  interface Props {
    active?: boolean;
    randomConfig: RandomConfigWithValid;
    onUpdate: (config: RandomConfigWithValid) => void;
    onReset: () => void;
  }

  let { active = false, randomConfig, onUpdate, onReset }: Props = $props();

  // Props intentionally seed local state with their initial value only; the
  // $effect.pre below re-syncs on later prop changes.
  // svelte-ignore state_referenced_locally
  let configText = $state(formatRandomConfig(randomConfig));
  let errorMessage = $state<string | null>(null);

  // svelte-ignore state_referenced_locally
  let previousRandomConfig = randomConfig;
  $effect.pre(() => {
    const nextRandomConfig = randomConfig;
    untrack(() => {
      if (nextRandomConfig !== previousRandomConfig) {
        previousRandomConfig = nextRandomConfig;
        configText = formatRandomConfig(nextRandomConfig);
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
      newConfig.valid = validateRandomConfig(newConfig);
      errorMessage = newConfig.valid ? null : demoText.errors.invalidRandomConfigValues;
      onUpdate(newConfig);
    }
    catch (error) {
      console.warn('Invalid Random Config JSON: ' + configText);
      errorMessage = demoText.errors.invalidJson;
    }
  }

  const jsonError = $derived.by(() => {
    try {
      JSON.parse(configText);
      return null;
    }
    catch (error) {
      return demoText.errors.invalidJson;
    }
  });
  const footerError = $derived(jsonError ?? errorMessage);
</script>

<div class={"mochart-demo-tab-container demo-layout-col config" + (active ? " active" : "")}>
  <div class="mochart-demo-tab-content">
    <TextAreaContent value={configText} onChange={onTextChange} />
  </div>
  <div class="mochart-demo-tab-footer">
    <div class="demo-toolbar" role="toolbar">
      <ButtonWithTooltip id="config-reset" label={demoText.randomConfigTab.reset.label} tooltipText={demoText.randomConfigTab.reset.tooltip} tooltipPlacement="top-start"
                         onClick={onReset} aria-label={demoText.randomConfigTab.reset.aria}>
        <Icon size="lg" fixedWidth={true} name="arrow-rotate-left" />
      </ButtonWithTooltip>
      <ButtonWithTooltip id="config-apply" label={demoText.randomConfigTab.apply.label} disabled={jsonError !== null}
                         tooltipText={demoText.randomConfigTab.apply.tooltip} tooltipPlacement="top-start"
                         onClick={onUpdateClick} aria-label={demoText.randomConfigTab.apply.aria}>
        <Icon size="lg" fixedWidth={true} name="check" />
      </ButtonWithTooltip>
      {#if footerError}
        <span class="mochart-demo-footer-error" role="alert">{footerError}</span>
      {/if}
    </div>
  </div>
</div>
