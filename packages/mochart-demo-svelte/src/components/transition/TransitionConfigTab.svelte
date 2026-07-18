<script lang="ts">
  import { untrack } from 'svelte';

  import { applyTransitionConfigEdit, buildMochartDemoConfig, formatTransitionConfig } from '@mochart/demo-common';

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

  let { active = false, transitionConfig, onUpdate, onReset }: Props = $props();

  // Props intentionally seed local state with their initial value only; the
  // $effect.pre below re-syncs on later prop changes.
  // svelte-ignore state_referenced_locally
  let configText = $state(formatTransitionConfig(transitionConfig));
  let errorMessage = $state<string | null>(null);

  // svelte-ignore state_referenced_locally
  let previousTransitionConfig = transitionConfig;
  $effect.pre(() => {
    const nextTransitionConfig = transitionConfig;
    untrack(() => {
      if (nextTransitionConfig !== previousTransitionConfig) {
        previousTransitionConfig = nextTransitionConfig;
        configText = formatTransitionConfig(nextTransitionConfig);
      }
    });
  });

  function onTextChange(nextConfigText: string) {
    configText = nextConfigText;
    errorMessage = null;
  }

  function onUpdateClick() {
    const result = applyTransitionConfigEdit(configText);
    if (result.ok) {
      errorMessage = null;
      onUpdate(result.config);
    }
    else {
      errorMessage = result.errorMessage;
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
