import { useState, useRef, useMemo } from 'react';
import Icon from '../misc/Icon';

import TextAreaContent from '../misc/TextAreaContent';
import ButtonWithTooltip from '../misc/ButtonWithTooltip';

import { demoText, formatRandomConfig, validateRandomConfig } from '@mochart/demo-common';

import type { RandomConfigWithValid } from '../../types';

interface Props {
  active?: boolean;
  randomConfig: RandomConfigWithValid;
  /** The current demo's generator id, for schema dispatch. */
  generator?: string;
  onUpdate: (config: RandomConfigWithValid) => void;
  onReset: () => void;
}

export default function RandomMochartConfigTab({ active, randomConfig, generator, onUpdate, onReset }: Props) {
  const [configText, setConfigText] = useState(() => formatRandomConfig(randomConfig));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const prevRandomConfig = useRef(randomConfig);
  if (prevRandomConfig.current !== randomConfig) {
    prevRandomConfig.current = randomConfig;
    setConfigText(formatRandomConfig(randomConfig));
  }

  const onUpdateClick = () => {
    try {
      const newConfig = JSON.parse(configText);
      newConfig.valid = validateRandomConfig(newConfig, generator);
      setErrorMessage(newConfig.valid ? null : demoText.errors.invalidRandomConfigValues);
      onUpdate(newConfig);
    }
    catch {
      console.warn('Invalid Random Config JSON: ' + configText);
      setErrorMessage(demoText.errors.invalidJson);
    }
  };

  const jsonError = useMemo(() => {
    try {
      JSON.parse(configText);
      return null;
    }
    catch {
      return demoText.errors.invalidJson;
    }
  }, [configText]);
  const footerError = jsonError ?? errorMessage;

  return (
    <div className={"mochart-demo-tab-container demo-layout-col config" + (active ? " active" : "")} inert={!active}>
      <div className="mochart-demo-tab-content">
        <TextAreaContent value={configText} onChange={(text: string) => { setConfigText(text); setErrorMessage(null); }} />
      </div>
      <div className="mochart-demo-tab-footer">
        <div className="demo-toolbar" role="toolbar">
          <ButtonWithTooltip id="config-reset" label={demoText.randomConfigTab.reset.label} tooltipText={demoText.randomConfigTab.reset.tooltip} tooltipPlacement="top-start"
            onClick={onReset} aria-label={demoText.randomConfigTab.reset.aria}>
            <Icon size="lg" fixedWidth={true} name="arrow-rotate-left" />
          </ButtonWithTooltip>
          <ButtonWithTooltip id="config-apply" label={demoText.randomConfigTab.apply.label} disabled={jsonError !== null}
            tooltipText={demoText.randomConfigTab.apply.tooltip} tooltipPlacement="top-start"
            onClick={onUpdateClick} aria-label={demoText.randomConfigTab.apply.aria}>
            <Icon size="lg" fixedWidth={true} name="check" />
          </ButtonWithTooltip>
          {footerError ? <span className="mochart-demo-footer-error" role="alert">{footerError}</span> : null}
        </div>
      </div>
    </div>
  );
}
