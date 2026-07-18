import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { PropertyValues } from 'lit';

import { ArrayOfObjectsDataProvider, getDataErrors } from '@mochart/core';
import type { DataProvider } from '@mochart/core';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';

import { LightElement } from '../misc/LightElement';
import { textAreaContent, buttonWithTooltip, icon } from '../misc/templates';

import type { DemoConfig, DataRow } from '../../types';

function formatData(dataJSON: unknown): string {
  return JSON.stringify(dataJSON).replace(/,/g, ', ').replace(/},/g, '},\n');
}

function isObject(v: unknown): boolean {
  return v !== null && v !== void 0 && typeof v === "object";
}

function isArrayOfObjects(candidate: unknown): boolean {
  return Array.isArray(candidate) && !candidate.some(v => !isObject(v));
}

@customElement('data-tab')
export class DataTab extends LightElement {
  @property({ attribute: false }) active = false;
  @property({ attribute: false }) config!: DemoConfig;
  @property({ attribute: false }) data!: DataRow[];
  @property({ attribute: false }) onDataChange!: (data: DataRow[]) => void;
  @property({ attribute: false }) onDataError!: (errorMessage: string) => void;
  @property({ attribute: false }) onDataReset!: () => void;

  @state() private dataText = '';
  @state() private errorMessage: string | null = null;

  override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('data')) {
      this.dataText = formatData(this.data);
    }
  }

  private onTextChange = (nextDataText: string): void => {
    this.dataText = nextDataText;
    this.errorMessage = null;
  };

  private resetData = (): void => {
    this.dataText = formatData(this.data);
    this.errorMessage = null;
    this.onDataReset();
  };

  private applyData = (): void => {
    try {
      const parsedData = JSON.parse(this.dataText);
      let error = null;
      if (isArrayOfObjects(parsedData)) {
        const { mochartConfig } = buildMochartDemoConfig(this.config);
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
        this.errorMessage = error + ' — details in the browser console';
        this.onDataError(error);
      }
      else {
        this.errorMessage = null;
        this.onDataChange(parsedData);
      }
    }
    catch (error) {
      console.warn('Invalid Data JSON: ' + String(error));
      this.errorMessage = 'Invalid JSON';
      this.onDataError('Invalid Data ');
    }
  };

  private get jsonError(): string | null {
    try {
      JSON.parse(this.dataText);
      return null;
    }
    catch (error) {
      return 'Invalid JSON';
    }
  }

  override render(): unknown {
    const jsonError = this.jsonError;
    const footerError = jsonError ?? this.errorMessage;
    return html`<div class=${'mochart-demo-tab-container col data' + (this.active ? ' active' : '')}>
      <div class="mochart-demo-tab-content">
        ${textAreaContent({ value: this.dataText, onChange: this.onTextChange })}
      </div>
      <div class="mochart-demo-tab-footer">
        <div class="btn-toolbar" role="toolbar">
          ${buttonWithTooltip(
            { id: 'data-reset', label: 'Reset', tooltipText: "Restore this demo's original data", tooltipPlacement: 'top-start', onClick: this.resetData, ariaLabel: 'Reset' },
            icon({ size: 'lg', fixedWidth: true, name: 'arrow-rotate-left' })
          )}
          ${buttonWithTooltip(
            { id: 'data-apply', label: 'Apply', disabled: jsonError !== null, tooltipText: 'Apply this data — the chart updates when you return to the Chart tab', tooltipPlacement: 'top-start', onClick: this.applyData, ariaLabel: 'Apply' },
            icon({ size: 'lg', fixedWidth: true, name: 'check' })
          )}
          ${footerError ? html`<span class="mochart-demo-footer-error" role="alert">${footerError}</span>` : nothing}
        </div>
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'data-tab': DataTab;
  }
}
