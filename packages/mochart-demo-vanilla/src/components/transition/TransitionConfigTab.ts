import validators from 'movalid';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';

import { buttonWithTooltip, el, icon, setActiveClass, textAreaContent } from '../misc/dom';

import type { TransitionConfig } from '../../types';

export interface TransitionConfigTabProps {
  active?: boolean;
  transitionConfig: TransitionConfig;
  onUpdate: (config: TransitionConfig) => void;
  onReset: () => void;
}

export interface TransitionConfigTabHandle {
  el: HTMLElement;
  setActive(active: boolean): void;
  setTransitionConfig(transitionConfig: TransitionConfig): void;
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

export function transitionConfigTab(props: TransitionConfigTabProps): TransitionConfigTabHandle {
  const { onUpdate, onReset } = props;

  let transitionConfig = props.transitionConfig;
  let errorMessage: string | null = null;

  const textArea = textAreaContent(formatConfig(transitionConfig), () => {
    errorMessage = null;
    sync();
  });

  function jsonError(): string | null {
    try {
      JSON.parse(textArea.getValue());
      return null;
    }
    catch (error) {
      return 'Invalid JSON';
    }
  }

  function onUpdateClick(): void {
    const configText = textArea.getValue();
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
    sync();
  }

  const resetButton = buttonWithTooltip({
    id: 'config-reset', label: 'Reset', ariaLabel: 'Reset',
    tooltipText: 'Restore the original transition config',
    onClick: onReset,
    content: [icon('arrow-rotate-left', { size: 'lg', fixedWidth: true })]
  });
  const applyButton = buttonWithTooltip({
    id: 'config-apply', label: 'Apply', ariaLabel: 'Apply',
    tooltipText: 'Apply this config to the transition charts',
    onClick: onUpdateClick,
    content: [icon('check', { size: 'lg', fixedWidth: true })]
  });

  const footerError = el('span', { className: 'mochart-demo-footer-error', attrs: { role: 'alert' } });
  footerError.hidden = true;

  const container = el('div', {
    className: 'mochart-demo-tab-container col config' + (props.active ? ' active' : '')
  }, [
    el('div', { className: 'mochart-demo-tab-content' }, [textArea.el]),
    el('div', { className: 'mochart-demo-tab-footer' }, [
      el('div', { className: 'btn-toolbar', attrs: { role: 'toolbar' } }, [
        resetButton.el, applyButton.el, footerError
      ])
    ])
  ]);

  function sync(): void {
    const currentJsonError = jsonError();
    const currentFooterError = currentJsonError ?? errorMessage;
    applyButton.setDisabled(currentJsonError !== null);
    footerError.hidden = currentFooterError === null;
    footerError.textContent = currentFooterError ?? '';
  }
  sync();

  return {
    el: container,
    setActive(active: boolean) {
      setActiveClass(container, active);
    },
    setTransitionConfig(nextTransitionConfig: TransitionConfig) {
      if (nextTransitionConfig !== transitionConfig) {
        transitionConfig = nextTransitionConfig;
        textArea.setValue(formatConfig(nextTransitionConfig));
        errorMessage = null;
        sync();
      }
    }
  };
}
