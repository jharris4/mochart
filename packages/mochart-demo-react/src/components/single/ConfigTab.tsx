import { useState, useRef, useMemo } from 'react';
import Icon from '../misc/Icon';

import { buildMochartDemoConfig, copyDemoConfig, demoText, formatMochartDemoConfig, getReferenceSectionIds, parseConfig, slowAnimationConfig, toggleConfigProperty, toggleConfigSection } from '@mochart/demo-common';

import type { DemoConfigView } from '@mochart/demo-common';

import TextAreaContent from '../misc/TextAreaContent';
import ButtonWithTooltip from '../misc/ButtonWithTooltip';
import DocsLinks from '../misc/DocsLinks';
import OverflowMenu, { MenuDivider } from '../misc/OverflowMenu';
import { usePhoneViewport } from '../misc/usePhoneViewport';

import type { DemoConfig, MochartDemoConfig } from '../../types';

interface Props {
  active?: boolean;
  config?: DemoConfig | null;
  onConfigChange: (config: DemoConfig) => void;
  onConfigReset: () => void;
}

interface ConfigTabState {
  mochartDemoConfig: MochartDemoConfig;
  demoConfig: DemoConfigView;
  showDefaults: boolean;
  configText: string;
}

export default function MochartConfigTab({ active, config = null, onConfigChange, onConfigReset }: Props) {
  const build = (nextConfig: DemoConfig | null): ConfigTabState => {
    const mochartDemoConfig = buildMochartDemoConfig(nextConfig ?? {});
    const demoConfig = copyDemoConfig(mochartDemoConfig);
    return { mochartDemoConfig, demoConfig, showDefaults: false, configText: formatMochartDemoConfig(demoConfig, false) };
  };

  const [state, setState] = useState<ConfigTabState>(() => build(config));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  // Rebuild when the incoming config changes.
  const prevConfig = useRef(config);
  if (prevConfig.current !== config) {
    prevConfig.current = config;
    const mochartDemoConfig = buildMochartDemoConfig(config ?? {});
    const demoConfig = copyDemoConfig(mochartDemoConfig);
    setState(prev => ({ ...prev, mochartDemoConfig, demoConfig, configText: formatMochartDemoConfig(demoConfig, prev.showDefaults) }));
  }

  const resetConfig = () => onConfigReset();

  const updateShowDefaults = (showDefaults: boolean) => {
    const { configText } = state;
    try {
      const newConfig = JSON.parse(configText);
      const mochartDemoConfig = buildMochartDemoConfig(newConfig);
      const { configValidation } = mochartDemoConfig;
      const { valid } = configValidation;
      if (valid) {
        setState(prev => ({ ...prev, showDefaults, configText: formatMochartDemoConfig(mochartDemoConfig, showDefaults) }));
        setErrorMessage(null);
      }
      else {
        const { errors, warnings } = configValidation;
        if (errors.length > 0) {
          console.warn('errors: ', errors);
        }
        if (warnings.length > 0) {
          console.warn('warnings: ', warnings);
        }
        setErrorMessage(demoText.errors.invalidChartConfig);
      }
    }
    catch (error) {
      console.warn('Invalid Chart Config JSON: ' + state.configText);
      setErrorMessage(demoText.errors.invalidJson);
    }
  };

  const toggleConfigDefaults = () => updateShowDefaults(!state.showDefaults);

  const toggleConfigInverted = () => {
    const demoConfig = toggleConfigProperty(state.demoConfig, 'plotConfig', 'inverted', true);
    setState(prev => ({ ...prev, demoConfig, configText: formatMochartDemoConfig(demoConfig, prev.showDefaults) }));
  };

  const toggleConfigAnimationSlow = () => {
    const demoConfig = toggleConfigSection(state.mochartDemoConfig, state.demoConfig, 'animationConfig', slowAnimationConfig);
    setState(prev => ({ ...prev, demoConfig, configText: formatMochartDemoConfig(demoConfig, prev.showDefaults) }));
  };

  const applyConfig = () => {
    const parsed = parseConfig(state.configText);
    if (parsed !== null) {
      onConfigChange(parsed);
    }
  };

  const { demoConfig, configText, showDefaults } = state;
  const { configWithDefaults } = demoConfig;
  const { inverted } = configWithDefaults.plotConfig;

  const invertedIcon = inverted ? 'chart-bar' : 'chart-column';
  const slow = configWithDefaults.animationConfig === slowAnimationConfig;
  const slowIcon = slow ? 'hourglass' : 'hourglass-end';

  // Live JSON validity — disables Apply and shows an inline hint while the
  // editor holds unparseable text.
  const jsonError = useMemo(() => {
    try {
      JSON.parse(configText);
      return null;
    }
    catch (error) {
      return demoText.errors.invalidJson;
    }
  }, [configText]);
  const footerError = jsonError ?? errorMessage;

  // The phone fold. Apply stays beside the editor it applies, and the
  // `role="alert"` error span stays inline — a message that has to be read
  // cannot live behind a tap. Everything else, including the reference links,
  // goes to the `⋯` menu. Each control renders in exactly one of the two
  // places (see OverflowMenu.tsx).
  const isPhone = usePhoneViewport();
  const hasDocsLinks = getReferenceSectionIds(state.demoConfig.configWithoutDefaults).length > 0;

  const resetButton = (
    <ButtonWithTooltip id="config-reset" label={demoText.configTab.reset.label} tooltipText={demoText.configTab.reset.tooltip} tooltipPlacement="top-start"
      onClick={resetConfig} aria-label={demoText.configTab.reset.aria}>
      <Icon size="lg" fixedWidth={true} name="arrow-rotate-left" />
    </ButtonWithTooltip>
  );
  const defaultsButton = (
    <ButtonWithTooltip id="config-defaults" label={demoText.configTab.defaults.label} pressed={showDefaults}
      tooltipText={demoText.configTab.defaults.tooltip} tooltipPlacement="top-start"
      onClick={toggleConfigDefaults} aria-label={demoText.configTab.defaults.aria}>
      <Icon size="lg" fixedWidth={true} name={showDefaults ? 'eye' : 'eye-slash'} />
    </ButtonWithTooltip>
  );
  const invertedButton = (
    <ButtonWithTooltip id="config-inverted" label={demoText.configTab.invert.label} pressed={!!inverted}
      tooltipText={demoText.configTab.invert.tooltip} tooltipPlacement="top-start"
      onClick={toggleConfigInverted} aria-label={demoText.configTab.invert.aria}>
      <Icon size="lg" fixedWidth={true} name={invertedIcon} />
    </ButtonWithTooltip>
  );
  const slowButton = (
    <ButtonWithTooltip id="config-animate-slow" label={demoText.configTab.slow.label} pressed={slow}
      tooltipText={demoText.configTab.slow.tooltip} tooltipPlacement="top-start"
      onClick={toggleConfigAnimationSlow} aria-label={demoText.configTab.slow.aria}>
      <Icon size="lg" fixedWidth={true} name={slowIcon} />
    </ButtonWithTooltip>
  );
  const applyButton = (
    <ButtonWithTooltip id="config-apply" label={demoText.configTab.apply.label} disabled={jsonError !== null}
      tooltipText={demoText.configTab.apply.tooltip} tooltipPlacement="top-start"
      onClick={applyConfig} aria-label={demoText.configTab.apply.aria}>
      <Icon size="lg" fixedWidth={true} name="check" />
    </ButtonWithTooltip>
  );
  const docsLinks = <DocsLinks config={state.demoConfig.configWithoutDefaults} />;
  const errorSpan = footerError ? <span className="mochart-demo-footer-error" role="alert">{footerError}</span> : null;

  return (
    <div className={"mochart-demo-tab-container demo-layout-col config" + (active ? " active" : "")} inert={!active}>
      <div className="mochart-demo-tab-content">
        <TextAreaContent value={configText} onChange={(text: string) => { setState(prev => ({ ...prev, configText: text })); setErrorMessage(null); }} />
      </div>
      <div className="mochart-demo-tab-footer" ref={footerRef}>
        <div className="demo-toolbar" role="toolbar">
          {isPhone ? (
            <>
              {applyButton}
              {/* `.editor`, not `.chart`: what folds here edits the JSON, and
                  "more chart controls" would tell a screen-reader user the
                  wrong thing. Anchored to the full-width footer — the trigger
                  sits mid-row, left of an error span that comes and goes. */}
              <OverflowMenu text={demoText.overflowMenu.editor}
                placement={{ side: 'top', align: 'end', gap: 4 }}
                anchorRef={footerRef} active={active !== false}>
                <div className="demo-btn-group">{resetButton}{defaultsButton}{invertedButton}{slowButton}</div>
                {hasDocsLinks ? <><MenuDivider />{docsLinks}</> : null}
              </OverflowMenu>
              {errorSpan}
            </>
          ) : (
            <>
              {resetButton}
              {defaultsButton}
              {invertedButton}
              {slowButton}
              {applyButton}
              {errorSpan}
            </>
          )}
        </div>
        {isPhone ? null : docsLinks}
      </div>
    </div>
  );
}
