import { applyDataEdit, buildMochartDemoConfig, collectUsedDataProperties, formatDataView, getJsonError, parseFullData } from '@mochart/demo-common';

import { buttonWithTooltip, el, icon, setActiveClass, textAreaContent } from '../misc/dom';

import type { DemoConfig, DataRow } from '../../types';

export interface DataTabProps {
  active?: boolean;
  config: DemoConfig;
  data: DataRow[];
  onDataChange: (data: DataRow[]) => void;
  onDataError: (errorMessage: string) => void;
  onDataReset: () => void;
}

export interface DataTabHandle {
  el: HTMLElement;
  setActive(active: boolean): void;
  setConfig(config: DemoConfig): void;
  setData(data: DataRow[]): void;
}

export function dataTab(props: DataTabProps): DataTabHandle {
  const { onDataChange, onDataError, onDataReset } = props;

  let config = props.config;
  let data = props.data;
  let errorMessage: string | null = null;
  // Data properties the chart config does not read are hidden by default; the
  // Unused button toggles them. fullData is the complete dataset backing the
  // textarea, viewUsedProperties the used-set its current content was rendered
  // with (null when every property is shown).
  let showUnused = false;
  let fullData = data;
  let usedProperties = collectUsedDataProperties(buildMochartDemoConfig(config).mochartConfig);
  let viewUsedProperties: Set<string> | null = null;

  const textArea = textAreaContent('', () => {
    errorMessage = null;
    sync();
  });

  function render(): void {
    viewUsedProperties = showUnused ? null : usedProperties;
    textArea.setValue(formatDataView(fullData, viewUsedProperties));
  }

  function parseCurrentFullData(): ReturnType<typeof parseFullData> {
    return parseFullData(textArea.getValue(), fullData, viewUsedProperties);
  }

  function resetData(): void {
    fullData = data;
    errorMessage = null;
    render();
    onDataReset();
    sync();
  }

  function updateShowUnused(nextShowUnused: boolean): void {
    const parsed = parseCurrentFullData();
    if ('error' in parsed) {
      errorMessage = parsed.error === 'json' ? 'Invalid JSON' : 'Invalid Data — should be an array of objects';
      sync();
      return;
    }
    fullData = parsed.full;
    showUnused = nextShowUnused;
    errorMessage = null;
    render();
    sync();
  }

  function applyData(): void {
    const result = applyDataEdit(textArea.getValue(), fullData, viewUsedProperties, config);
    if (result.ok) {
      errorMessage = null;
      fullData = result.data;
      onDataChange(result.data);
    }
    else {
      errorMessage = result.errorMessage;
      onDataError(result.callbackError);
    }
    sync();
  }

  const resetButton = buttonWithTooltip({
    id: 'data-reset', label: 'Reset', ariaLabel: 'Reset',
    tooltipText: "Restore this demo's original data",
    onClick: resetData,
    content: [icon('arrow-rotate-left', { size: 'lg', fixedWidth: true })]
  });
  const unusedButton = buttonWithTooltip({
    id: 'data-unused', label: 'Unused', pressed: showUnused, ariaLabel: 'Toggle Unused',
    tooltipText: 'Show or hide data properties the chart config does not use',
    onClick: () => updateShowUnused(!showUnused),
    content: [icon('eye-slash', { size: 'lg', fixedWidth: true })]
  });
  const applyButton = buttonWithTooltip({
    id: 'data-apply', label: 'Apply', ariaLabel: 'Apply',
    tooltipText: 'Apply this data — the chart updates when you return to the Chart tab',
    onClick: applyData,
    content: [icon('check', { size: 'lg', fixedWidth: true })]
  });

  const footerError = el('span', { className: 'mochart-demo-footer-error', attrs: { role: 'alert' } });
  footerError.hidden = true;

  const container = el('div', {
    className: 'mochart-demo-tab-container col data' + (props.active ? ' active' : '')
  }, [
    el('div', { className: 'mochart-demo-tab-content' }, [textArea.el]),
    el('div', { className: 'mochart-demo-tab-footer' }, [
      el('div', { className: 'btn-toolbar', attrs: { role: 'toolbar' } }, [
        resetButton.el, unusedButton.el, applyButton.el, footerError
      ])
    ])
  ]);

  function sync(): void {
    const currentJsonError = getJsonError(textArea.getValue());
    const currentFooterError = currentJsonError ?? errorMessage;
    applyButton.setDisabled(currentJsonError !== null);
    footerError.hidden = currentFooterError === null;
    footerError.textContent = currentFooterError ?? '';

    unusedButton.setPressed(showUnused);
    unusedButton.setContent([icon(showUnused ? 'eye' : 'eye-slash', { size: 'lg', fixedWidth: true })]);
  }
  render();
  sync();

  return {
    el: container,
    setActive(active: boolean) {
      setActiveClass(container, active);
    },
    setConfig(nextConfig: DemoConfig) {
      if (nextConfig !== config) {
        config = nextConfig;
        usedProperties = collectUsedDataProperties(buildMochartDemoConfig(nextConfig).mochartConfig);
        // Re-filter for the new config, keeping any (valid) unapplied edits.
        if (!showUnused) {
          const parsed = parseCurrentFullData();
          if (!('error' in parsed)) {
            fullData = parsed.full;
            render();
          }
        }
        sync();
      }
    },
    setData(nextData: DataRow[]) {
      if (nextData !== data) {
        data = nextData;
        fullData = nextData;
        errorMessage = null;
        render();
        sync();
      }
    }
  };
}
