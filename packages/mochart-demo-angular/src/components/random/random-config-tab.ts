import { Component, Input, signal } from '@angular/core';
import type { OnChanges, OnInit, SimpleChanges } from '@angular/core';

import validators from 'movalid';
import type { Validator } from 'movalid';

import { TextAreaContent } from '../misc/text-area-content';
import { ButtonWithTooltip } from '../misc/button-with-tooltip';
import { Icon } from '../misc/icon';

import type { RandomConfigWithValid } from '../../types';

const configValidator = {
  error: {
    probability: validators.numberMinMax(0, 1)
  },
  group: {
    count: validators.integerMin(0),
    order: {
      sort: validators.boolean()
    },
    reuse: {
      globalPercentage: validators.numberMinMax(0, 1),
      stepPercentage: validators.numberMinMax(0, 1)
    },
    number: {
      rangeValidator: (o: any) => o.min <= o.max,
      min: validators.number(),
      max: validators.number(),
      interval: validators.numberMin(0.001)
    },
    date: {
      rangeValidator: (o: any) => new Date(o.min).getTime() <= new Date(o.max).getTime(),
      min: validators.dateAny(),
      max: validators.dateAny(),
      interval: validators.integerMin(1),
      intervalUnit: validators.oneOf(['second', 'minute', 'hour', 'day'])
    },
    string: {
      rangeValidator: (o: any) => o.minLength <= o.maxLength,
      minLength: validators.integerMin(1),
      maxLength: validators.integerMax(20)
    }
  },
  series: {
    number: {
      rangeValidator: (o: any) => o.min <= o.max,
      min: validators.number(),
      max: validators.number(),
      limitToAxisConfig: validators.boolean()
    },
    missing: {
      probability: validators.numberMinMax(0, 1)
    },
    reuse: {
      global: validators.boolean(),
      step: validators.boolean()
    }
  }
};

function addErrorMessage(errorMessages: string[], config: any, prefix: string, validator: Validator) {
  if (!validator(config)) {
    errorMessages.push(prefix + validator.getErrorMessage(config));
  }
}

function addErrorMessages(errorMessages: string[], config: any, prefix: string, validatorObject: Record<string, any>) {
  const objectValidator = validators.object();
  if (objectValidator(config)) {
    const validatorKeys = Object.keys(validatorObject);
    let hadKeyError = false;
    for (const validatorKey of validatorKeys) {
      if (validatorKey !== 'rangeValidator') {
        if (!validatorObject[validatorKey](config[validatorKey])) {
          errorMessages.push(prefix + validatorKey + ' - ' + validatorObject[validatorKey].getErrorMessage(config[validatorKey]));
          hadKeyError = true;
        }
      }
    }
    if (!hadKeyError && validatorObject['rangeValidator']) {
      if (!validatorObject['rangeValidator'](config)) {
        errorMessages.push(prefix + 'min must be <= max');
      }
    }
  }
  else {
    errorMessages.push(prefix + objectValidator.getErrorMessage(config));
  }
}

function validateConfig(randomConfig: any): boolean {
  const objectValidator = validators.object();
  const errorMessages: string[] = [];
  if (objectValidator(randomConfig)) {
    const errorPrefix = 'error - ';
    addErrorMessages(errorMessages, randomConfig.error, errorPrefix, configValidator.error);

    const groupPrefix = 'group - ';
    if (objectValidator(randomConfig.group)) {
      const groupConfig = randomConfig.group;
      const countPrefix = groupPrefix + 'count - ';
      addErrorMessage(errorMessages, groupConfig.count, countPrefix, configValidator.group.count);
      const numberPrefix = groupPrefix + 'number - ';
      addErrorMessages(errorMessages, groupConfig.number, numberPrefix, configValidator.group.number);
      const datePrefix = groupPrefix + 'date - ';
      addErrorMessages(errorMessages, groupConfig.date, datePrefix, configValidator.group.date);
      const stringPrefix = groupPrefix + 'string - ';
      addErrorMessages(errorMessages, groupConfig.string, stringPrefix, configValidator.group.string);
      if (errorMessages.length === 0) {
        const { count, number, date } = groupConfig;

        const minDate = new Date(date.min).getTime();
        const maxDate = new Date(date.max).getTime();
        let dateRange = maxDate - minDate;
        let dateInterval = date.interval;
        let dateUnit = 1;
        if (date.intervalUnit === 'second') {
          dateUnit = 1000;
        }
        else if (date.intervalUnit === 'minute') {
          dateUnit = 60000;
        }
        else if (date.intervalUnit === 'hour') {
          dateUnit = 3600000;
        }
        else if (date.intervalUnit === 'day') {
          dateUnit = 86400000;
        }
        dateInterval *= dateUnit;
        dateRange = Math.floor(dateRange / dateInterval);

        if (dateRange < count.max) {
          errorMessages.push(datePrefix + 'range insufficient to fulfill group count');
        }

        const min = number.min;
        const max = number.max;
        let range = max - min;
        const interval = number.interval;
        range = Math.floor(range / interval);

        if (range < count.max) {
          errorMessages.push(numberPrefix + 'range insufficient to fulfill group count');
        }
      }
    }
    else {
      errorMessages.push(groupPrefix + objectValidator.getErrorMessage(randomConfig.group));
    }

    const seriesPrefix = 'series - ';
    if (objectValidator(randomConfig.series)) {
      const seriesConfig = randomConfig.series;
      const numberPrefix = seriesPrefix + 'number - ';
      addErrorMessages(errorMessages, seriesConfig.number, numberPrefix, configValidator.series.number);
      const missingPrefix = seriesPrefix + 'missing - ';
      addErrorMessages(errorMessages, seriesConfig.missing, missingPrefix, configValidator.series.missing);
    }
    else {
      errorMessages.push(seriesPrefix + objectValidator.getErrorMessage(randomConfig.series));
    }
  }
  else {
    errorMessages.push(objectValidator.getErrorMessage(randomConfig));
  }
  if (errorMessages.length > 0) {
    console.warn('random config had error messages: ', errorMessages.join('\n'));
  }
  return errorMessages.length === 0;
}

function formatConfig(config: RandomConfigWithValid): string {
  return JSON.stringify({ error: config.error, group: config.group, series: config.series }, null, '\t');
}

@Component({
  selector: 'app-random-config-tab',
  imports: [TextAreaContent, ButtonWithTooltip, Icon],
  styles: [':host { display: contents; }'],
  template: `
    <div [class]="'mochart-demo-tab-container col config' + (active ? ' active' : '')">
      <div class="mochart-demo-tab-content">
        <app-text-area-content [value]="configText()" [onChange]="onTextChange" />
      </div>
      <div class="mochart-demo-tab-footer">
        <div class="btn-toolbar" role="toolbar">
          <app-button-with-tooltip id="config-reset" label="Reset" tooltipText="Restore the original random generator config" tooltipPlacement="top-start"
                                   [onClick]="onReset" aria-label="Reset">
            <app-icon size="lg" [fixedWidth]="true" name="arrow-rotate-left" />
          </app-button-with-tooltip>
          <app-button-with-tooltip id="config-apply" label="Apply" [disabled]="jsonError !== null"
                                   tooltipText="Apply this generator config to the random chart" tooltipPlacement="top-start"
                                   [onClick]="onUpdateClick" aria-label="Apply">
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
export class RandomConfigTab implements OnInit, OnChanges {
  @Input() active = false;
  @Input({ required: true }) randomConfig!: RandomConfigWithValid;
  @Input({ required: true }) onUpdate!: (config: RandomConfigWithValid) => void;
  @Input({ required: true }) onReset!: () => void;

  configText = signal('');
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.configText.set(formatConfig(this.randomConfig));
  }

  ngOnChanges(changes: SimpleChanges): void {
    const randomConfigChange = changes['randomConfig'];
    if (randomConfigChange && !randomConfigChange.firstChange) {
      this.configText.set(formatConfig(this.randomConfig));
    }
  }

  onTextChange = (nextConfigText: string): void => {
    this.configText.set(nextConfigText);
    this.errorMessage.set(null);
  };

  onUpdateClick = (): void => {
    try {
      const newConfig = JSON.parse(this.configText());
      newConfig.valid = validateConfig(newConfig);
      this.errorMessage.set(newConfig.valid ? null : 'Config has invalid values — details in the browser console');
      this.onUpdate(newConfig);
    }
    catch (error) {
      console.warn('Invalid Random Config JSON: ' + this.configText());
      this.errorMessage.set('Invalid JSON');
    }
  };

  get jsonError(): string | null {
    try {
      JSON.parse(this.configText());
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
