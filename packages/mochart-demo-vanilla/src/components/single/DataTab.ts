import { ArrayOfObjectsDataProvider, getDataErrors } from 'mochart';
import type { DataProvider } from 'mochart';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';

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

export function dataTab(props: DataTabProps): DataTabHandle {
  const { onDataChange, onDataError, onDataReset } = props;

  let config = props.config;
  let data = props.data;
  let errorMessage: string | null = null;

  const textArea = textAreaContent(formatData(data), () => {
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

  function resetData(): void {
    textArea.setValue(formatData(data));
    errorMessage = null;
    onDataReset();
    sync();
  }

  function applyData(): void {
    try {
      const parsedData = JSON.parse(textArea.getValue());
      let error = null;
      if (isArrayOfObjects(parsedData)) {
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
      }
      else {
        console.warn('Invalid Data - should be an array of objects');
        error = 'Invalid Data';
      }
      if (error) {
        errorMessage = error + ' — details in the browser console';
        onDataError(error);
      }
      else {
        errorMessage = null;
        onDataChange(parsedData);
      }
    }
    catch (error) {
      console.warn('Invalid Data JSON: ' + String(error));
      errorMessage = 'Invalid JSON';
      onDataError('Invalid Data ');
    }
    sync();
  }

  const resetButton = buttonWithTooltip({
    id: 'data-reset', label: 'Reset', ariaLabel: 'Reset',
    tooltipText: "Restore this demo's original data",
    onClick: resetData,
    content: [icon('arrow-rotate-left', { size: 'lg', fixedWidth: true })]
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
    setConfig(nextConfig: DemoConfig) {
      config = nextConfig;
    },
    setData(nextData: DataRow[]) {
      if (nextData !== data) {
        data = nextData;
        textArea.setValue(formatData(nextData));
        errorMessage = null;
        sync();
      }
    }
  };
}
