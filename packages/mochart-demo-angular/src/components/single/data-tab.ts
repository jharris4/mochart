import { Component, Input, signal } from '@angular/core';
import type { OnChanges, OnInit, SimpleChanges } from '@angular/core';

import { ArrayOfObjectsDataProvider, getDataErrors } from '@mochart/core';
import type { DataProvider } from '@mochart/core';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';
import { collectUsedDataProperties, filterDataProperties, restoreHiddenDataProperties } from '../../config/unusedDataProperties';

import { TextAreaContent } from '../misc/text-area-content';
import { ButtonWithTooltip } from '../misc/button-with-tooltip';
import { Icon } from '../misc/icon';

import type { DemoConfig, DataRow } from '../../types';

function formatData(dataJSON: unknown): string {
  return JSON.stringify(dataJSON).replace(/,/g, ', ').replace(/},/g, '},\n');
}

function isObject(v: unknown): boolean {
  return v !== null && v !== void 0 && typeof v === 'object';
}

function isArrayOfObjects(candidate: unknown): boolean {
  return Array.isArray(candidate) && !candidate.some(v => !isObject(v));
}

type ParsedFullData = { full: DataRow[] } | { error: 'json' | 'data' };

@Component({
  selector: 'app-data-tab',
  imports: [TextAreaContent, ButtonWithTooltip, Icon],
  styles: [':host { display: contents; }'],
  template: `
    <div [class]="'mochart-demo-tab-container col data' + (active ? ' active' : '')">
      <div class="mochart-demo-tab-content">
        <app-text-area-content [value]="dataText()" [onChange]="onTextChange" />
      </div>
      <div class="mochart-demo-tab-footer">
        <div class="btn-toolbar" role="toolbar">
          <app-button-with-tooltip id="data-reset" label="Reset" tooltipText="Restore this demo's original data" tooltipPlacement="top-start"
                                   [onClick]="resetData" aria-label="Reset">
            <app-icon size="lg" [fixedWidth]="true" name="arrow-rotate-left" />
          </app-button-with-tooltip>
          <app-button-with-tooltip id="data-unused" label="Unused" [pressed]="showUnused()"
                                   tooltipText="Show or hide data properties the chart config does not use" tooltipPlacement="top-start"
                                   [onClick]="toggleShowUnused" aria-label="Toggle Unused">
            <app-icon size="lg" [fixedWidth]="true" [name]="showUnused() ? 'eye' : 'eye-slash'" />
          </app-button-with-tooltip>
          <app-button-with-tooltip id="data-apply" label="Apply" [disabled]="jsonError !== null"
                                   tooltipText="Apply this data — the chart updates when you return to the Chart tab" tooltipPlacement="top-start"
                                   [onClick]="applyData" aria-label="Apply">
            <app-icon size="lg" [fixedWidth]="true" name="check" />
          </app-button-with-tooltip>
          @if (footerError) {
            <span class="mochart-demo-footer-error" role="alert">{{ footerError }}</span>
          }
        </div>
      </div>
    </div>
  `
})
export class DataTab implements OnInit, OnChanges {
  @Input() active = false;
  @Input({ required: true }) config!: DemoConfig;
  @Input({ required: true }) data!: DataRow[];
  @Input({ required: true }) onDataChange!: (data: DataRow[]) => void;
  @Input({ required: true }) onDataError!: (errorMessage: string) => void;
  @Input({ required: true }) onDataReset!: () => void;

  dataText = signal('');
  errorMessage = signal<string | null>(null);
  // Data properties the chart config does not read are hidden by default; the
  // Unused button toggles them. fullData is the complete dataset backing the
  // textarea, viewUsedProperties the used-set its current content was rendered
  // with (null when every property is shown).
  showUnused = signal(false);
  private fullData: DataRow[] = [];
  private usedProperties: Set<string> | null = null;
  private viewUsedProperties: Set<string> | null = null;

  ngOnInit(): void {
    this.usedProperties = collectUsedDataProperties(buildMochartDemoConfig(this.config).mochartConfig);
    this.renderView(this.data);
  }

  ngOnChanges(changes: SimpleChanges): void {
    const configChange = changes['config'];
    if (configChange && !configChange.firstChange) {
      this.usedProperties = collectUsedDataProperties(buildMochartDemoConfig(this.config).mochartConfig);
      // Re-filter for the changed config, keeping any (valid) unapplied edits.
      // The data branch below re-renders instead when data changed too.
      if (!changes['data'] && !this.showUnused()) {
        const parsed = this.parseFullData();
        if (!('error' in parsed)) {
          this.renderView(parsed.full);
        }
      }
    }
    const dataChange = changes['data'];
    if (dataChange && !dataChange.firstChange) {
      this.renderView(this.data);
    }
  }

  private renderView(fullRows: DataRow[]): void {
    this.fullData = fullRows;
    this.viewUsedProperties = this.showUnused() ? null : this.usedProperties;
    this.dataText.set(formatData(this.viewUsedProperties === null ? fullRows : filterDataProperties(fullRows, this.viewUsedProperties)));
  }

  // Parse the textarea back to a full dataset, restoring any properties the
  // filtered view hid.
  private parseFullData(): ParsedFullData {
    let parsed: unknown;
    try {
      parsed = JSON.parse(this.dataText());
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

  onTextChange = (nextDataText: string): void => {
    this.dataText.set(nextDataText);
    this.errorMessage.set(null);
  };

  resetData = (): void => {
    this.renderView(this.data);
    this.errorMessage.set(null);
    this.onDataReset();
  };

  toggleShowUnused = (): void => {
    const parsed = this.parseFullData();
    if ('error' in parsed) {
      this.errorMessage.set(parsed.error === 'json' ? 'Invalid JSON' : 'Invalid Data — should be an array of objects');
      return;
    }
    this.showUnused.set(!this.showUnused());
    this.errorMessage.set(null);
    this.renderView(parsed.full);
  };

  applyData = (): void => {
    const parsed = this.parseFullData();
    if ('error' in parsed) {
      if (parsed.error === 'json') {
        console.warn('Invalid Data JSON');
        this.errorMessage.set('Invalid JSON');
        this.onDataError('Invalid Data ');
      }
      else {
        console.warn('Invalid Data - should be an array of objects');
        this.errorMessage.set('Invalid Data — details in the browser console');
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
      this.errorMessage.set(error + ' — details in the browser console');
      this.onDataError(error);
    }
    else {
      this.errorMessage.set(null);
      this.fullData = parsedData;
      this.onDataChange(parsedData);
    }
  };

  get jsonError(): string | null {
    try {
      JSON.parse(this.dataText());
      return null;
    }
    catch (error) {
      return 'Invalid JSON';
    }
  }

  get footerError(): string | null {
    return this.jsonError ?? this.errorMessage();
  }
}
