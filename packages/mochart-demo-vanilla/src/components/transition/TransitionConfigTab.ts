
import { applyTransitionConfigEdit, buildMochartDemoConfig, demoText, formatTransitionConfig } from '@mochart/demo-common';

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

export function transitionConfigTab(props: TransitionConfigTabProps): TransitionConfigTabHandle {
  const { onUpdate, onReset } = props;

  let transitionConfig = props.transitionConfig;
  let errorMessage: string | null = null;

  const textArea = textAreaContent(formatTransitionConfig(transitionConfig), () => {
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
    const result = applyTransitionConfigEdit(textArea.getValue());
    if (result.ok) {
      errorMessage = null;
      onUpdate(result.config);
    }
    else {
      errorMessage = result.errorMessage;
    }
    sync();
  }

  const resetButton = buttonWithTooltip({
    id: 'config-reset', label: demoText.transitionConfigTab.reset.label, ariaLabel: demoText.transitionConfigTab.reset.aria,
    tooltipText: demoText.transitionConfigTab.reset.tooltip,
    onClick: onReset,
    content: [icon('arrow-rotate-left', { size: 'lg', fixedWidth: true })]
  });
  const applyButton = buttonWithTooltip({
    id: 'config-apply', label: demoText.transitionConfigTab.apply.label, ariaLabel: demoText.transitionConfigTab.apply.aria,
    tooltipText: demoText.transitionConfigTab.apply.tooltip,
    onClick: onUpdateClick,
    content: [icon('check', { size: 'lg', fixedWidth: true })]
  });

  const footerError = el('span', { className: 'mochart-demo-footer-error', attrs: { role: 'alert' } });
  footerError.hidden = true;

  const container = el('div', {
    className: 'mochart-demo-tab-container demo-layout-col config' + (props.active ? ' active' : '')
  }, [
    el('div', { className: 'mochart-demo-tab-content' }, [textArea.el]),
    el('div', { className: 'mochart-demo-tab-footer' }, [
      el('div', { className: 'demo-toolbar', attrs: { role: 'toolbar' } }, [
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
        textArea.setValue(formatTransitionConfig(nextTransitionConfig));
        errorMessage = null;
        sync();
      }
    }
  };
}
