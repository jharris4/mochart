import React, { useState, useRef, useMemo } from 'react';
import { ButtonToolbar } from 'reactstrap';
import FontAwesome from 'react-fontawesome';

import { applyTransitionConfigEdit, buildMochartDemoConfig, demoText, formatTransitionConfig } from '@mochart/demo-common';

import TextAreaContent from '../misc/TextAreaContent';
import ButtonWithTooltip from '../misc/ButtonWithTooltip';

import type { TransitionConfig } from '../../types';

interface Props {
  active: boolean;
  transitionConfig: TransitionConfig;
  onUpdate: (config: TransitionConfig) => void;
  onReset: () => void;
}

export default function TransitionConfigTab({ active, transitionConfig, onUpdate, onReset }: Props) {
  const [configText, setConfigText] = useState(() => formatTransitionConfig(transitionConfig));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const prevTransitionConfig = useRef(transitionConfig);
  if (prevTransitionConfig.current !== transitionConfig) {
    prevTransitionConfig.current = transitionConfig;
    setConfigText(formatTransitionConfig(transitionConfig));
  }

  const onUpdateClick = () => {
    const result = applyTransitionConfigEdit(configText);
    if (result.ok) {
      setErrorMessage(null);
      onUpdate(result.config);
    }
    else {
      setErrorMessage(result.errorMessage);
    }
  };

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

  return (
    <div className={"mochart-demo-tab-container col config" + (active ? " active" : "")}>
      <div className="mochart-demo-tab-content">
        <TextAreaContent value={configText} onChange={(text: string) => { setConfigText(text); setErrorMessage(null); }} />
      </div>
      <div className="mochart-demo-tab-footer">
        <ButtonToolbar>
          <ButtonWithTooltip id="config-reset" label={demoText.transitionConfigTab.reset.label} tooltipText={demoText.transitionConfigTab.reset.tooltip} tooltipPlacement="top-start"
            onClick={onReset} aria-label={demoText.transitionConfigTab.reset.aria}>
            <FontAwesome size="lg" fixedWidth={true} name="arrow-rotate-left" />
          </ButtonWithTooltip>
          <ButtonWithTooltip id="config-apply" label={demoText.transitionConfigTab.apply.label} disabled={jsonError !== null}
            tooltipText={demoText.transitionConfigTab.apply.tooltip} tooltipPlacement="top-start"
            onClick={onUpdateClick} aria-label={demoText.transitionConfigTab.apply.aria}>
            <FontAwesome size="lg" fixedWidth={true} name="check" />
          </ButtonWithTooltip>
          {footerError ? <span className="mochart-demo-footer-error" role="alert">{footerError}</span> : null}
        </ButtonToolbar>
      </div>
    </div>
  );
}
