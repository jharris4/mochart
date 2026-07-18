import { Component, Input, signal } from '@angular/core';
import type { OnChanges, OnInit, SimpleChanges } from '@angular/core';

import { ArrayOfObjectsDataProvider, getDataErrors } from '@mochart/core';
import type { DataProvider } from '@mochart/core';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';

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

  ngOnInit(): void {
    this.dataText.set(formatData(this.data));
  }

  ngOnChanges(changes: SimpleChanges): void {
    const dataChange = changes['data'];
    if (dataChange && !dataChange.firstChange) {
      this.dataText.set(formatData(this.data));
    }
  }

  onTextChange = (nextDataText: string): void => {
    this.dataText.set(nextDataText);
    this.errorMessage.set(null);
  };

  resetData = (): void => {
    this.dataText.set(formatData(this.data));
    this.errorMessage.set(null);
    this.onDataReset();
  };

  applyData = (): void => {
    try {
      const parsedData = JSON.parse(this.dataText());
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
        this.errorMessage.set(error + ' — details in the browser console');
        this.onDataError(error);
      }
      else {
        this.errorMessage.set(null);
        this.onDataChange(parsedData);
      }
    }
    catch (error) {
      console.warn('Invalid Data JSON: ' + String(error));
      this.errorMessage.set('Invalid JSON');
      this.onDataError('Invalid Data ');
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
