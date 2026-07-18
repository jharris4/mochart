import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { PropertyValues } from 'lit';

import { ArrayOfObjectsDataProvider, getDataErrors } from '@mochart/core';
import type { DataProvider } from '@mochart/core';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';
import { collectUsedDataProperties, filterDataProperties, restoreHiddenDataProperties } from '../../config/unusedDataProperties';

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

type ParsedFullData = { full: DataRow[] } | { error: 'json' | 'data' };

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
  // Data properties the chart config does not read are hidden by default; the
  // Unused button toggles them. fullData is the complete dataset backing the
  // textarea, viewUsedProperties the used-set its current content was rendered
  // with (null when every property is shown).
  @state() private showUnused = false;
  private fullData: DataRow[] = [];
  private usedProperties: Set<string> | null = null;
  private viewUsedProperties: Set<string> | null = null;

  override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('config')) {
      this.usedProperties = collectUsedDataProperties(buildMochartDemoConfig(this.config).mochartConfig);
      // Re-filter for the changed config, keeping any (valid) unapplied edits.
      // The data branch below renders the initial view instead.
      if (!changed.has('data') && !this.showUnused) {
        const parsed = this.parseFullData();
        if (!('error' in parsed)) {
          this.renderView(parsed.full);
        }
      }
    }
    if (changed.has('data')) {
      this.renderView(this.data);
    }
  }

  private renderView(fullRows: DataRow[]): void {
    this.fullData = fullRows;
    this.viewUsedProperties = this.showUnused ? null : this.usedProperties;
    this.dataText = formatData(this.viewUsedProperties === null ? fullRows : filterDataProperties(fullRows, this.viewUsedProperties));
  }

  // Parse the textarea back to a full dataset, restoring any properties the
  // filtered view hid.
  private parseFullData(): ParsedFullData {
    let parsed: unknown;
    try {
      parsed = JSON.parse(this.dataText);
    }
    catch (error) {
      return { error: 'json' };
    }
    if (!isArrayOfObjects(parsed)) {
      return { error: 'data' };
    }
    const rows = parsed as DataRow[];
    return { full: this.viewUsedProperties === null ? rows : restoreHiddenDataProperties(rows, this.fullData, this.viewUsedProperties) };
  }

  private onTextChange = (nextDataText: string): void => {
    this.dataText = nextDataText;
    this.errorMessage = null;
  };

  private resetData = (): void => {
    this.renderView(this.data);
    this.errorMessage = null;
    this.onDataReset();
  };

  private toggleShowUnused = (): void => {
    const parsed = this.parseFullData();
    if ('error' in parsed) {
      this.errorMessage = parsed.error === 'json' ? 'Invalid JSON' : 'Invalid Data — should be an array of objects';
      return;
    }
    this.showUnused = !this.showUnused;
    this.errorMessage = null;
    this.renderView(parsed.full);
  };

  private applyData = (): void => {
    const parsed = this.parseFullData();
    if ('error' in parsed) {
      if (parsed.error === 'json') {
        console.warn('Invalid Data JSON');
        this.errorMessage = 'Invalid JSON';
        this.onDataError('Invalid Data ');
      }
      else {
        console.warn('Invalid Data - should be an array of objects');
        this.errorMessage = 'Invalid Data — details in the browser console';
        this.onDataError('Invalid Data');
      }
      return;
    }
    const parsedData = parsed.full;
    let error = null;
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
    if (error) {
      this.errorMessage = error + ' — details in the browser console';
      this.onDataError(error);
    }
    else {
      this.errorMessage = null;
      this.fullData = parsedData;
      this.onDataChange(parsedData);
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
            { id: 'data-unused', label: 'Unused', pressed: this.showUnused, tooltipText: 'Show or hide data properties the chart config does not use', tooltipPlacement: 'top-start', onClick: this.toggleShowUnused, ariaLabel: 'Toggle Unused' },
            icon({ size: 'lg', fixedWidth: true, name: this.showUnused ? 'eye' : 'eye-slash' })
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
