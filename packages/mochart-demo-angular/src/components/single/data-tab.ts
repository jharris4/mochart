import { Component, Input, signal } from '@angular/core';
import type { OnChanges, OnInit, SimpleChanges } from '@angular/core';

import { applyDataEdit, buildMochartDemoConfig, collectUsedDataProperties, demoText, formatDataView, getJsonError, parseFullData } from '@mochart/demo-common';
import type { ParsedFullData } from '@mochart/demo-common';

import { TextAreaContent } from '../misc/text-area-content';
import { ButtonWithTooltip } from '../misc/button-with-tooltip';
import { Icon } from '../misc/icon';

import type { DemoConfig, DataRow } from '../../types';

@Component({
  selector: 'app-data-tab',
  imports: [TextAreaContent, ButtonWithTooltip, Icon],
  styles: [':host { display: contents; }'],
  template: `
    <div [class]="'mochart-demo-tab-container demo-layout-col data' + (active ? ' active' : '')">
      <div class="mochart-demo-tab-content">
        <app-text-area-content [value]="dataText()" [onChange]="onTextChange" />
      </div>
      <div class="mochart-demo-tab-footer">
        <div class="demo-toolbar" role="toolbar">
          <app-button-with-tooltip id="data-reset" [label]="text.reset.label" [tooltipText]="text.reset.tooltip" tooltipPlacement="top-start"
                                   [onClick]="resetData" [aria-label]="text.reset.aria">
            <app-icon size="lg" [fixedWidth]="true" name="arrow-rotate-left" />
          </app-button-with-tooltip>
          <app-button-with-tooltip id="data-unused" [label]="text.unused.label" [pressed]="showUnused()"
                                   [tooltipText]="text.unused.tooltip" tooltipPlacement="top-start"
                                   [onClick]="toggleShowUnused" [aria-label]="text.unused.aria">
            <app-icon size="lg" [fixedWidth]="true" [name]="showUnused() ? 'eye' : 'eye-slash'" />
          </app-button-with-tooltip>
          <app-button-with-tooltip id="data-apply" [label]="text.apply.label" [disabled]="jsonError !== null"
                                   [tooltipText]="text.apply.tooltip" tooltipPlacement="top-start"
                                   [onClick]="applyData" [aria-label]="text.apply.aria">
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

  readonly text = demoText.dataTab;

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
        const parsed = this.parseCurrentFullData();
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
    this.dataText.set(formatDataView(fullRows, this.viewUsedProperties));
  }

  private parseCurrentFullData(): ParsedFullData {
    return parseFullData(this.dataText(), this.fullData, this.viewUsedProperties);
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
    const parsed = this.parseCurrentFullData();
    if ('error' in parsed) {
      this.errorMessage.set(parsed.error === 'json' ? demoText.errors.invalidJson : demoText.errors.invalidDataArray);
      return;
    }
    this.showUnused.set(!this.showUnused());
    this.errorMessage.set(null);
    this.renderView(parsed.full);
  };

  applyData = (): void => {
    const result = applyDataEdit(this.dataText(), this.fullData, this.viewUsedProperties, this.config);
    if (result.ok) {
      this.errorMessage.set(null);
      this.fullData = result.data;
      this.onDataChange(result.data);
    }
    else {
      this.errorMessage.set(result.errorMessage);
      this.onDataError(result.callbackError);
    }
  };

  get jsonError(): string | null {
    return getJsonError(this.dataText());
  }

  get footerError(): string | null {
    return this.jsonError ?? this.errorMessage();
  }
}
