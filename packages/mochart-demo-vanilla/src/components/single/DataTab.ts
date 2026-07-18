import { ArrayOfObjectsDataProvider, getDataErrors } from '@mochart/core';
import type { DataProvider } from '@mochart/core';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';
import { collectUsedDataProperties, filterDataProperties, restoreHiddenDataProperties } from '../../config/unusedDataProperties';

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

function formatData(dataJSON: unknown): string {
  return JSON.stringify(dataJSON).replace(/,/g, ', ').replace(/},/g, '},\n');
}

function isObject(v: unknown): boolean {
  return v !== null && v !== undefined && typeof v === 'object';
}

function isArrayOfObjects(candidate: unknown): boolean {
  return Array.isArray(candidate) && !candidate.some(v => !isObject(v));
}

type ParsedFullData = { full: DataRow[] } | { error: 'json' | 'data' };

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
    const viewRows = viewUsedProperties === null ? fullData : filterDataProperties(fullData, viewUsedProperties);
    textArea.setValue(formatData(viewRows));
  }

  function jsonError(): string | null {
    try {
      JSON.parse(textArea.getValue());
      return null;
    }
    catch (error) {
      return 'Invalid JSON';
    }
  }

  // Parse the textarea back to a full dataset, restoring any properties the
  // filtered view hid.
  function parseFullData(): ParsedFullData {
    let parsed: unknown;
    try {
      parsed = JSON.parse(textArea.getValue());
    }
    catch (error) {
      return { error: 'json' };
    }
    if (!isArrayOfObjects(parsed)) {
      return { error: 'data' };
    }
    const rows = parsed as DataRow[];
    return { full: viewUsedProperties === null ? rows : restoreHiddenDataProperties(rows, fullData, viewUsedProperties) };
  }

  function resetData(): void {
    fullData = data;
    errorMessage = null;
    render();
    onDataReset();
    sync();
  }

  function updateShowUnused(nextShowUnused: boolean): void {
    const parsed = parseFullData();
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
    const parsed = parseFullData();
    if ('error' in parsed) {
      if (parsed.error === 'json') {
        console.warn('Invalid Data JSON');
        errorMessage = 'Invalid JSON';
        onDataError('Invalid Data ');
      }
      else {
        console.warn('Invalid Data - should be an array of objects');
        errorMessage = 'Invalid Data — details in the browser console';
        onDataError('Invalid Data');
      }
      sync();
      return;
    }
    const parsedData = parsed.full;
    let error = null;
    const { mochartConfig } = buildMochartDemoConfig(config);
    if (mochartConfig.validation.valid) {
      const dataErrors = getDataErrors(mochartConfig, new ArrayOfObjectsDataProvider(parsedData, mochartConfig.groupAxisConfig.property ?? '') as unknown as DataProvider);
      if (dataErrors.length > 0) {
        console.warn('Invalid Data - Content Errors: ', dataErrors.join('\n'));
        error = 'Invalid Data Content';
      }
    }
    else {
      console.warn('Could not validate data since mochart config was not valid');
      error = 'Invalid Config & Data';
    }
    if (error) {
      errorMessage = error + ' — details in the browser console';
      onDataError(error);
    }
    else {
      errorMessage = null;
      fullData = parsedData;
      onDataChange(parsedData);
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
    const currentJsonError = jsonError();
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
          const parsed = parseFullData();
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
