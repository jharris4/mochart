import validators from '@mochart/movalid';
import type { Validator } from '@mochart/movalid';

import type { DemoRandomConfig, RandomConfigWithValid } from './types';

// Every chart-type generator validates against the schema its random JSON
// uses (see demo-data types.ts); demos without a generator use the generic
// per-property schema. Unknown generator ids fall back to generic.
type RandomSchemaId = 'pool' | 'walk' | 'histogram' | 'heatmap' | 'errorBars';

const generatorSchemaIds: Record<string, RandomSchemaId> = {
  pie: 'pool',
  donut: 'pool',
  gauge: 'pool',
  waterfall: 'pool',
  candlestick: 'walk',
  'candlestick-hollow': 'walk',
  ohlc: 'walk',
  histogram: 'histogram',
  heatmap: 'heatmap',
  'error-bars': 'errorBars'
};

const probabilityValidator = validators.numberMinMax(0, 1);
const booleanValidator = validators.boolean();

function minMaxRange(o: any): boolean {
  return o.min <= o.max;
}

const genericValidator = {
  group: {
    count: validators.integerMin(0),
    order: {
      sort: booleanValidator
    },
    missing: {
      probability: probabilityValidator
    },
    reuse: {
      globalPercentage: probabilityValidator,
      stepPercentage: probabilityValidator
    },
    number: {
      rangeValidator: minMaxRange,
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
      rangeValidator: minMaxRange,
      min: validators.number(),
      max: validators.number(),
      round: booleanValidator,
      limitToAxisConfig: booleanValidator
    },
    missing: {
      probability: probabilityValidator
    },
    reuse: {
      global: booleanValidator,
      step: booleanValidator
    }
  }
};

// Two-level section validators for the chart-type generator schemas; the
// generators themselves clamp pool-bound counts (candles to the day pool,
// months to twelve, dropped heatmap columns to leave at least one).
const schemaValidators: Record<RandomSchemaId, Record<string, Record<string, unknown>>> = {
  pool: {
    value: { rangeValidator: minMaxRange, min: validators.number(), max: validators.number() },
    missing: { probability: probabilityValidator },
    reuse: { globalPercentage: probabilityValidator, stepPercentage: probabilityValidator }
  },
  walk: {
    candles: { rangeValidator: minMaxRange, min: validators.integerMin(1), max: validators.integerMin(1) },
    price: { rangeValidator: minMaxRange, min: validators.numberMin(0.01), max: validators.numberMin(0.01), volatility: validators.numberMinMax(0, 0.5) },
    reuse: { step: booleanValidator }
  },
  histogram: {
    samples: { rangeValidator: minMaxRange, min: validators.integerMin(1), max: validators.integerMin(1) },
    value: { rangeValidator: minMaxRange, min: validators.number(), max: validators.number() },
    reuse: { global: booleanValidator, step: booleanValidator }
  },
  heatmap: {
    columns: { dropProbability: probabilityValidator, maxDropped: validators.integerMin(0) },
    missing: { probability: probabilityValidator },
    reuse: { global: booleanValidator, step: booleanValidator }
  },
  errorBars: {
    months: { rangeValidator: minMaxRange, min: validators.integerMin(1), max: validators.integerMin(1) },
    margin: { rangeValidator: minMaxRange, min: validators.numberMin(0), max: validators.numberMin(0) },
    missing: { probability: probabilityValidator },
    reuse: { global: booleanValidator, step: booleanValidator }
  }
};

function addErrorMessage(errorMessages: string[], config: any, prefix: string, validator: Validator): void {
  if (!validator(config)) {
    errorMessages.push(prefix + validator.getErrorMessage(config));
  }
}

function addErrorMessages(errorMessages: string[], config: any, prefix: string, validatorObject: Record<string, any>): void {
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
    if (!hadKeyError && validatorObject.rangeValidator) {
      if (!validatorObject.rangeValidator(config)) {
        errorMessages.push(prefix + 'min must be <= max');
      }
    }
  }
  else {
    errorMessages.push(prefix + objectValidator.getErrorMessage(config));
  }
}

function addGenericErrorMessages(errorMessages: string[], randomConfig: any): void {
  const objectValidator = validators.object();

  const groupPrefix = 'group - ';
  if (objectValidator(randomConfig.group)) {
    const groupConfig = randomConfig.group;
    const countPrefix = groupPrefix + 'count - ';
    addErrorMessage(errorMessages, groupConfig.count, countPrefix, genericValidator.group.count);
    const orderPrefix = groupPrefix + 'order - ';
    addErrorMessages(errorMessages, groupConfig.order, orderPrefix, genericValidator.group.order);
    const groupMissingPrefix = groupPrefix + 'missing - ';
    addErrorMessages(errorMessages, groupConfig.missing, groupMissingPrefix, genericValidator.group.missing);
    const groupReusePrefix = groupPrefix + 'reuse - ';
    addErrorMessages(errorMessages, groupConfig.reuse, groupReusePrefix, genericValidator.group.reuse);
    const numberPrefix = groupPrefix + 'number - ';
    addErrorMessages(errorMessages, groupConfig.number, numberPrefix, genericValidator.group.number);
    const datePrefix = groupPrefix + 'date - ';
    addErrorMessages(errorMessages, groupConfig.date, datePrefix, genericValidator.group.date);
    const stringPrefix = groupPrefix + 'string - ';
    addErrorMessages(errorMessages, groupConfig.string, stringPrefix, genericValidator.group.string);
    if (errorMessages.length === 0) {
      const { count, number, date, string, reuse } = groupConfig;

      // mirrors generateChartGroupValues: the step-preview lineages draw up to global + 3*halfStep uniques
      const globalPercentage = typeof reuse?.globalPercentage === 'number' ? reuse.globalPercentage : 0;
      const stepPercentage = typeof reuse?.stepPercentage === 'number' ? reuse.stepPercentage : 0;
      const globalCount = Math.floor(globalPercentage * count);
      const stepCount = globalPercentage < 1 && stepPercentage > 0 ? 2 * Math.floor((count - globalCount) * stepPercentage / 2.0) : 0;
      const halfStepCount = Math.floor(stepCount / 2);
      const requiredDistinct = Math.max(count, globalCount + 3 * halfStepCount);

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

      if (dateRange < requiredDistinct) {
        errorMessages.push(datePrefix + 'range insufficient to fulfill group count');
      }

      const min = number.min;
      const max = number.max;
      let range = max - min;
      const interval = number.interval;
      range = Math.floor(range / interval);

      if (range < requiredDistinct) {
        errorMessages.push(numberPrefix + 'range insufficient to fulfill group count');
      }

      const stringRange = Math.pow(10, string.maxLength - 1) - Math.pow(10, string.minLength - 1);

      if (stringRange < requiredDistinct) {
        errorMessages.push(stringPrefix + 'range insufficient to fulfill group count');
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
    addErrorMessages(errorMessages, seriesConfig.number, numberPrefix, genericValidator.series.number);
    const missingPrefix = seriesPrefix + 'missing - ';
    addErrorMessages(errorMessages, seriesConfig.missing, missingPrefix, genericValidator.series.missing);
    const seriesReusePrefix = seriesPrefix + 'reuse - ';
    addErrorMessages(errorMessages, seriesConfig.reuse, seriesReusePrefix, genericValidator.series.reuse);
  }
  else {
    errorMessages.push(seriesPrefix + objectValidator.getErrorMessage(randomConfig.series));
  }
}

/**
 * Validate a random config against the schema its demo uses: the demo's
 * chart-type generator schema when `generator` names one, the generic
 * per-property schema otherwise.
 */
export function validateRandomConfig(randomConfig: any, generator?: string): boolean {
  const objectValidator = validators.object();
  const errorMessages: string[] = [];
  if (objectValidator(randomConfig)) {
    const schemaId = generator !== undefined ? generatorSchemaIds[generator] : undefined;
    if (schemaId !== undefined) {
      const schemaValidator = schemaValidators[schemaId];
      for (const sectionKey of Object.keys(schemaValidator)) {
        addErrorMessages(errorMessages, randomConfig[sectionKey], sectionKey + ' - ', schemaValidator[sectionKey]);
      }
    }
    else {
      addGenericErrorMessages(errorMessages, randomConfig);
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

/**
 * Validated restore for a shared random config: share payloads are untrusted,
 * so the valid flag is computed here, never taken from the sender.
 */
export function restoreSharedRandomConfig(randomConfig: DemoRandomConfig, generator?: string): RandomConfigWithValid {
  return { ...randomConfig, valid: validateRandomConfig(randomConfig, generator) };
}

function neutralizedReuseSection(reuse: Record<string, unknown>): Record<string, unknown> {
  const neutralized: Record<string, unknown> = {};
  for (const key of Object.keys(reuse)) {
    const value = reuse[key];
    neutralized[key] = typeof value === 'number' ? 0 : typeof value === 'boolean' ? false : value;
  }
  return neutralized;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * A copy of any random config with its reuse settings neutralized (numbers to
 * 0, booleans to false), so every dataset generates independently. Works
 * structurally across the generic shape (group.reuse / series.reuse) and the
 * chart-type generator shapes (top-level reuse).
 */
export function neutralizeRandomReuse<T>(config: T): T {
  const result = { ...(config as Record<string, unknown>) };
  for (const parentKey of ['group', 'series']) {
    const parent = result[parentKey];
    if (isPlainObject(parent) && isPlainObject(parent.reuse)) {
      result[parentKey] = { ...parent, reuse: neutralizedReuseSection(parent.reuse) };
    }
  }
  if (isPlainObject(result.reuse)) {
    result.reuse = neutralizedReuseSection(result.reuse);
  }
  return result as T;
}

export function formatRandomConfig(config: RandomConfigWithValid): string {
  const { valid: _valid, ...rest } = config as unknown as Record<string, unknown> & { valid?: boolean };
  return JSON.stringify(rest, null, '\t');
}
