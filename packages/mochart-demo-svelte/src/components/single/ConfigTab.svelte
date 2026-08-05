<script lang="ts">
  import { untrack } from 'svelte';

  import { buildMochartDemoConfig, copyDemoConfig, demoText, formatMochartDemoConfig, getReferenceSectionIds, isConfigSectionActive, parseConfig, slowAnimationConfig, toggleConfigProperty, toggleConfigSection } from '@mochart/demo-common';

  import TextAreaContent from '../misc/TextAreaContent.svelte';
  import ButtonWithTooltip from '../misc/ButtonWithTooltip.svelte';
  import DocsLinks from '../misc/DocsLinks.svelte';
  import Icon from '../misc/Icon.svelte';
  import OverflowMenu from '../misc/OverflowMenu.svelte';
  import { createPhoneViewport } from '../misc/phoneViewport.svelte';

  import type { DemoConfig } from '../../types';

  interface Props {
    active?: boolean;
    config: DemoConfig;
    onConfigChange: (config: DemoConfig) => void;
    onConfigReset: () => void;
  }

  // The with/without-defaults config views the editor toggles between. Config
  // sections are intentionally loose (`any`) — they are arbitrary user JSON.
  let { active = false, config, onConfigChange, onConfigReset }: Props = $props();

  let showDefaults = $state(false);
  let errorMessage = $state<string | null>(null);
  // Props intentionally seed local state with their initial value only; the
  // $effect.pre below re-syncs on later prop changes.
  // svelte-ignore state_referenced_locally
  let mochartDemoConfig = $state.raw(buildMochartDemoConfig(config));
  // svelte-ignore state_referenced_locally
  let demoConfig = $state.raw(copyDemoConfig(mochartDemoConfig));
  // svelte-ignore state_referenced_locally
  let configText = $state(formatMochartDemoConfig(demoConfig, false));

  // svelte-ignore state_referenced_locally
  let previousConfig = config;
  $effect.pre(() => {
    const nextConfig = config;
    untrack(() => {
      if (nextConfig !== previousConfig) {
        previousConfig = nextConfig;
        mochartDemoConfig = buildMochartDemoConfig(nextConfig);
        demoConfig = copyDemoConfig(mochartDemoConfig);
        configText = formatMochartDemoConfig(demoConfig, showDefaults);
      }
    });
  });

  function onTextChange(nextConfigText: string) {
    configText = nextConfigText;
    errorMessage = null;
  }

  function resetConfig() {
    onConfigReset();
  }

  function updateShowDefaults(nextShowDefaults: boolean) {
    try {
      const newConfig = JSON.parse(configText);
      const newMochartDemoConfig = buildMochartDemoConfig(newConfig);
      const { configValidation } = newMochartDemoConfig;
      const { valid } = configValidation;
      if (valid) {
        showDefaults = nextShowDefaults;
        configText = formatMochartDemoConfig(newMochartDemoConfig, nextShowDefaults);
        errorMessage = null;
      }
      else {
        const { errors, warnings } = configValidation;
        if (errors.length > 0) {
          console.warn('errors: ', errors);
        }
        if (warnings.length > 0) {
          console.warn('warnings: ', warnings);
        }
        errorMessage = demoText.errors.invalidChartConfig;
      }
    }
    catch {
      console.warn('Invalid Chart Config JSON: ' + configText);
      errorMessage = demoText.errors.invalidJson;
    }
  }

  function toggleConfigDefaults() {
    updateShowDefaults(!showDefaults);
  }

  function toggleConfigInverted() {
    demoConfig = toggleConfigProperty(demoConfig, 'plot', 'inverted', true) ?? demoConfig;
    configText = formatMochartDemoConfig(demoConfig, showDefaults);
  }

  function toggleConfigAnimationSlow() {
    demoConfig = toggleConfigSection(mochartDemoConfig, demoConfig, 'animation', slowAnimationConfig) ?? demoConfig;
    configText = formatMochartDemoConfig(demoConfig, showDefaults);
  }

  function applyConfig() {
    const newConfig = parseConfig(configText);
    if (newConfig !== null) {
      onConfigChange(newConfig);
    }
  }

  // Live JSON validity — disables Apply and shows an inline hint while the
  // editor holds unparseable text.
  const jsonError = $derived.by(() => {
    try {
      JSON.parse(configText);
      return null;
    }
    catch {
      return demoText.errors.invalidJson;
    }
  });
  const footerError = $derived(jsonError ?? errorMessage);

  const inverted = $derived(demoConfig.configWithDefaults.plot.inverted);
  const invertedIcon = $derived(inverted ? 'chart-bar' : 'chart-column');
  const slow = $derived(isConfigSectionActive(demoConfig, 'animation', slowAnimationConfig));
  const slowIcon = $derived(slow ? 'hourglass' : 'hourglass-end');

  // The phone fold. Apply stays beside the editor it applies, and the
  // `role="alert"` error span stays inline — a message that has to be read
  // cannot live behind a tap. Everything else, including the reference links,
  // goes to the `⋯` menu. Each control renders in exactly one of the two
  // places (see OverflowMenu.svelte).
  const phone = createPhoneViewport();
  const hasDocsLinks = $derived(getReferenceSectionIds(demoConfig.configWithoutDefaults).length > 0);
  let footerElement = $state<HTMLElement | null>(null);
</script>

{#snippet resetButton()}
  <ButtonWithTooltip id="config-reset" label={demoText.configTab.reset.label} tooltipText={demoText.configTab.reset.tooltip} tooltipPlacement="top-start"
                     onClick={resetConfig} aria-label={demoText.configTab.reset.aria}>
    <Icon size="lg" fixedWidth={true} name="arrow-rotate-left" />
  </ButtonWithTooltip>
{/snippet}

{#snippet defaultsButton()}
  <ButtonWithTooltip id="config-defaults" label={demoText.configTab.defaults.label} pressed={showDefaults}
                     tooltipText={demoText.configTab.defaults.tooltip} tooltipPlacement="top-start"
                     onClick={toggleConfigDefaults} aria-label={demoText.configTab.defaults.aria}>
    <Icon size="lg" fixedWidth={true} name={showDefaults ? 'eye' : 'eye-slash'} />
  </ButtonWithTooltip>
{/snippet}

{#snippet invertedButton()}
  <ButtonWithTooltip id="config-inverted" label={demoText.configTab.invert.label} pressed={inverted}
                     tooltipText={demoText.configTab.invert.tooltip} tooltipPlacement="top-start"
                     onClick={toggleConfigInverted} aria-label={demoText.configTab.invert.aria}>
    <Icon size="lg" fixedWidth={true} name={invertedIcon} />
  </ButtonWithTooltip>
{/snippet}

{#snippet slowButton()}
  <ButtonWithTooltip id="config-animate-slow" label={demoText.configTab.slow.label} pressed={slow}
                     tooltipText={demoText.configTab.slow.tooltip} tooltipPlacement="top-start"
                     onClick={toggleConfigAnimationSlow} aria-label={demoText.configTab.slow.aria}>
    <Icon size="lg" fixedWidth={true} name={slowIcon} />
  </ButtonWithTooltip>
{/snippet}

{#snippet applyButton()}
  <ButtonWithTooltip id="config-apply" label={demoText.configTab.apply.label} disabled={jsonError !== null}
                     tooltipText={demoText.configTab.apply.tooltip} tooltipPlacement="top-start"
                     onClick={applyConfig} aria-label={demoText.configTab.apply.aria}>
    <Icon size="lg" fixedWidth={true} name="check" />
  </ButtonWithTooltip>
{/snippet}

{#snippet docsLinks()}
  <DocsLinks config={demoConfig.configWithoutDefaults} />
{/snippet}

<div class={"mochart-demo-tab-container demo-layout-col config" + (active ? " active" : "")} inert={!active}>
  <div class="mochart-demo-tab-content">
    <TextAreaContent value={configText} onChange={onTextChange} />
  </div>
  <div class="mochart-demo-tab-footer" bind:this={footerElement}>
    <div class="demo-toolbar" role="toolbar">
      {#if phone.isPhone}
        {@render applyButton()}
        <!-- `.editor`, not `.chart`: what folds here edits the JSON, and
             "more chart controls" would tell a screen-reader user the wrong
             thing. Anchored to the full-width footer — the trigger sits
             mid-row, left of an error span that comes and goes. -->
        <OverflowMenu text={demoText.overflowMenu.editor}
                      placement={{ side: 'top', align: 'end', gap: 4 }}
                      getAnchor={() => footerElement}
                      active={active !== false}>
          <div class="demo-btn-category">{@render resetButton()}{@render defaultsButton()}{@render invertedButton()}{@render slowButton()}</div>
          {#if hasDocsLinks}
            <div class="demo-menu-divider"></div>
            {@render docsLinks()}
          {/if}
        </OverflowMenu>
        {#if footerError}
          <span class="mochart-demo-footer-error" role="alert">{footerError}</span>
        {/if}
      {:else}
        {@render resetButton()}
        {@render defaultsButton()}
        {@render invertedButton()}
        {@render slowButton()}
        {@render applyButton()}
        {#if footerError}
          <span class="mochart-demo-footer-error" role="alert">{footerError}</span>
        {/if}
      {/if}
    </div>
    {#if !phone.isPhone}{@render docsLinks()}{/if}
  </div>
</div>
