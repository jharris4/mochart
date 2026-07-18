import React, { useState, useRef, useMemo } from 'react';
import { ButtonToolbar } from 'reactstrap';
import FontAwesome from 'react-fontawesome';

import TextAreaContent from '../misc/TextAreaContent';
import ButtonWithTooltip from '../misc/ButtonWithTooltip';

import { formatRandomConfig, validateRandomConfig } from '@mochart/demo-common';

import type { RandomConfigWithValid } from '../../types';

interface Props {
  active?: boolean;
  randomConfig: RandomConfigWithValid;
  onUpdate: (config: RandomConfigWithValid) => void;
  onReset: () => void;
}

export default function RandomMochartConfigTab({ active, randomConfig, onUpdate, onReset }: Props) {
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
      newConfig.valid = validateRandomConfig(newConfig);
      setErrorMessage(newConfig.valid ? null : 'Config has invalid values — details in the browser console');
      onUpdate(newConfig);
    }
    catch (error) {
      console.warn('Invalid Random Config JSON: ' + configText);
      setErrorMessage('Invalid JSON');
    }
  };

  const jsonError = useMemo(() => {
    try {
      JSON.parse(configText);
      return null;
    }
    catch (error) {
      return 'Invalid JSON';
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
          <ButtonWithTooltip id="config-reset" label="Reset" tooltipText="Restore the original random generator config" tooltipPlacement="top-start"
            onClick={onReset} aria-label="Reset">
            <FontAwesome size="lg" fixedWidth={true} name="arrow-rotate-left" />
          </ButtonWithTooltip>
          <ButtonWithTooltip id="config-apply" label="Apply" disabled={jsonError !== null}
            tooltipText="Apply this generator config to the random chart" tooltipPlacement="top-start"
            onClick={onUpdateClick} aria-label="Apply">
            <FontAwesome size="lg" fixedWidth={true} name="check" />
          </ButtonWithTooltip>
          {footerError ? <span className="mochart-demo-footer-error" role="alert">{footerError}</span> : null}
        </ButtonToolbar>
      </div>
    </div>
  );
}
