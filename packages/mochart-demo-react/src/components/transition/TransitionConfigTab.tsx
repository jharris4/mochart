import React, { useState, useRef, useMemo } from 'react';
import { ButtonToolbar } from 'reactstrap';
import FontAwesome from 'react-fontawesome';

import validators from '@mochart/movalid';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';

import TextAreaContent from '../misc/TextAreaContent';
import ButtonWithTooltip from '../misc/ButtonWithTooltip';

import type { TransitionConfig } from '../../types';

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

interface Props {
  active: boolean;
  transitionConfig: TransitionConfig;
  onUpdate: (config: TransitionConfig) => void;
  onReset: () => void;
}

export default function TransitionConfigTab({ active, transitionConfig, onUpdate, onReset }: Props) {
  const [configText, setConfigText] = useState(() => formatConfig(transitionConfig));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const prevTransitionConfig = useRef(transitionConfig);
  if (prevTransitionConfig.current !== transitionConfig) {
    prevTransitionConfig.current = transitionConfig;
    setConfigText(formatConfig(transitionConfig));
  }

  const onUpdateClick = () => {
    try {
      const newConfig = JSON.parse(configText);
      if (objectValidator(newConfig)) {
        if (objectValidator(newConfig.config)) {
          const mochartDemoConfig = buildMochartDemoConfig(newConfig.config);
          const { configValidation } = mochartDemoConfig;
          const { valid, errors, warnings } = configValidation;
          if (valid) {
            if (arrayValidator(newConfig.data) && !newConfig.data.some((aData: unknown) => !arrayValidator(aData))) {
              setErrorMessage(null);
              onUpdate(newConfig);
            }
            else {
              console.warn('Invalid Transition Config, data should be an array of arrays: ', newConfig.data);
              setErrorMessage('"data" should be an array of arrays');
            }
          }
          else {
            if (errors.length > 0) {
              console.warn('errors: ', errors);
            }
            if (warnings.length > 0) {
              console.warn('warnings: ', warnings);
            }
            setErrorMessage('Invalid chart config — details in the browser console');
          }
        }
        else {
          console.warn('Invalid Transition Config, config should be an object: ', newConfig.config);
          setErrorMessage('"config" should be an object');
        }
      }
      else {
        console.warn('Invalid Transition Config, should be an object: ', configText);
        setErrorMessage('Transition config should be an object');
      }
    }
    catch (error) {
      console.warn('Invalid Transition Config JSON: ', configText);
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
          <ButtonWithTooltip id="config-reset" label="Reset" tooltipText="Restore the original transition config" tooltipPlacement="top-start"
            onClick={onReset} aria-label="Reset">
            <FontAwesome size="lg" fixedWidth={true} name="arrow-rotate-left" />
          </ButtonWithTooltip>
          <ButtonWithTooltip id="config-apply" label="Apply" disabled={jsonError !== null}
            tooltipText="Apply this config to the transition charts" tooltipPlacement="top-start"
            onClick={onUpdateClick} aria-label="Apply">
            <FontAwesome size="lg" fixedWidth={true} name="check" />
          </ButtonWithTooltip>
          {footerError ? <span className="mochart-demo-footer-error" role="alert">{footerError}</span> : null}
        </ButtonToolbar>
      </div>
    </div>
  );
}
