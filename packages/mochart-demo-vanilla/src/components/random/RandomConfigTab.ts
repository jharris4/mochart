
import { buttonWithTooltip, el, icon, setActiveClass, textAreaContent } from '../misc/dom';

import { demoText, formatRandomConfig, validateRandomConfig } from '@mochart/demo-common';

import type { RandomConfigWithValid } from '../../types';

export interface RandomConfigTabProps {
  active?: boolean;
  randomConfig: RandomConfigWithValid;
  onUpdate: (config: RandomConfigWithValid) => void;
  onReset: () => void;
}

export interface RandomConfigTabHandle {
  el: HTMLElement;
  setActive(active: boolean): void;
  setRandomConfig(randomConfig: RandomConfigWithValid): void;
}

export function randomConfigTab(props: RandomConfigTabProps): RandomConfigTabHandle {
  const { onUpdate, onReset } = props;

  let randomConfig = props.randomConfig;
  let errorMessage: string | null = null;

  const textArea = textAreaContent(formatRandomConfig(randomConfig), () => {
    errorMessage = null;
    sync();
  });

  function jsonError(): string | null {
    try {
      JSON.parse(textArea.getValue());
      return null;
    }
    catch (error) {
      return demoText.errors.invalidJson;
    }
  }

  function onUpdateClick(): void {
    try {
      const newConfig = JSON.parse(textArea.getValue());
      newConfig.valid = validateRandomConfig(newConfig);
      errorMessage = newConfig.valid ? null : demoText.errors.invalidRandomConfigValues;
      onUpdate(newConfig);
    }
    catch (error) {
      console.warn('Invalid Random Config JSON: ' + textArea.getValue());
      errorMessage = demoText.errors.invalidJson;
    }
    sync();
  }

  const resetButton = buttonWithTooltip({
    id: 'config-reset', label: demoText.randomConfigTab.reset.label, ariaLabel: demoText.randomConfigTab.reset.aria,
    tooltipText: demoText.randomConfigTab.reset.tooltip,
    onClick: onReset,
    content: [icon('arrow-rotate-left', { size: 'lg', fixedWidth: true })]
  });
  const applyButton = buttonWithTooltip({
    id: 'config-apply', label: demoText.randomConfigTab.apply.label, ariaLabel: demoText.randomConfigTab.apply.aria,
    tooltipText: demoText.randomConfigTab.apply.tooltip,
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
    setRandomConfig(nextRandomConfig: RandomConfigWithValid) {
      if (nextRandomConfig !== randomConfig) {
        randomConfig = nextRandomConfig;
        textArea.setValue(formatRandomConfig(nextRandomConfig));
        sync();
      }
    }
  };
}
