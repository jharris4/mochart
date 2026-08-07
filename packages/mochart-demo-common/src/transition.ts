import validators from '@mochart/movalid';

import { ArrayOfObjectsDataProvider } from '@mochart/core';
import type { MochartConfig } from '@mochart/core';

import buildMochartDemoConfig from './mochartDemoConfig';
import { demoText } from './demoText';
import { stringifyWithSpacedCommas } from './dataEditing';

import type { TransitionConfig, ChartDataProviderLike } from './types';

const objectValidator = validators.object();
const arrayValidator = validators.array();

export const defaultTransitionConfig: TransitionConfig = {
  "config": {
    "version": "1.0.0",
    "animation": {
      "initialDuration": 1000,
      "expansionDuration": 3000,
      "valueChangeDuration": 3000,
      "contractionDuration": 3000
    },
    "categoryAxis": {
      "property": "timestamp",
      "type": "string",
      "scale": "ordinal",
      "valueLabel": "Date",
      "dateUTC": false
    },
    "legend": {
      "visible": true
    },
    "valueAxes": [
      {
        "id": "VA0",
        "min": 0
      }
    ],
    "seriesStacks": [{
      "id": "SS0",
      "axis": "VA0"
    }],
    "series": [
      {
        "axis": "VA0",
        "stack": "SS0",
        "property": "count",
        "title": "Count",
        "renderer": "bar",
        "markerShape": null,
        "valueFormat": ",d"
      }
    ]
  },
  "data": [
    [
      { "timestamp": "aaa", "count": 50 },
      { "timestamp": "bbb", "count": 48 },
      { "timestamp": "ccc", "count": 28 },
      { "timestamp": "ddd", "count": 27 },
      { "timestamp": "eee", "count": 25 },
      { "timestamp": "fff", "count": 22 }
    ],
    [
      { "timestamp": "ccc", "count": 45 },
      { "timestamp": "bbb", "count": 42 },
      { "timestamp": "ddd", "count": 27 },
      { "timestamp": "eee", "count": 25 },
      { "timestamp": "fff", "count": 22 },
      { "timestamp": "ggg", "count": 20 }
    ],
    [
      { "timestamp": "bbb", "count": 42 },
      { "timestamp": "ccc", "count": 45 },
      { "timestamp": "ddd", "count": 27 },
      { "timestamp": "eee", "count": 25 },
      { "timestamp": "fff", "count": 22 },
      { "timestamp": "ggg", "count": 20 }
    ]
  ]
};

export function getTransitionMochartConfig(transitionConfig: TransitionConfig): MochartConfig {
  return buildMochartDemoConfig(transitionConfig.config).mochartConfig;
}

export function getTransitionDataProviders(transitionConfig: TransitionConfig): ChartDataProviderLike[] {
  // the providers wrap the rows wholesale: displayProperty and extra series
  // properties are read through getSeriesValue like any other row property
  const categoryProperty = transitionConfig.config.categoryAxis.property;
  return transitionConfig.data.map(data => new ArrayOfObjectsDataProvider(data, categoryProperty));
}

export function formatTransitionConfig(transitionConfig: TransitionConfig): string {
  if (transitionConfig && objectValidator(transitionConfig)) {
    let configText = '{}';
    let dataText = '[]';
    if (transitionConfig.config && objectValidator(transitionConfig.config)) {
      configText = JSON.stringify(transitionConfig.config, null, '\t');
      configText = configText.replace(/\n\t/g, '\n\t\t');
      configText = configText.replace(/\n}/g, '\n\t}');
    }
    if (transitionConfig.data && arrayValidator(transitionConfig.data)) {
      const dataArray = transitionConfig.data;
      const dataTexts: string[] = [];
      let aDataText: string;
      for (const data of dataArray) {
        if (data && arrayValidator(data)) {
          // structural spacing keeps commas inside string values untouched
          const rowTexts = (data as unknown[]).map(row => stringifyWithSpacedCommas(row));
          aDataText = rowTexts.length === 0 ? '[]' : '[\n\t\t\t' + rowTexts.join(', \n\t\t\t') + '\n\t\t]';
          dataTexts.push(aDataText);
        }
      }
      dataText = '[\n\t\t' + dataTexts.join(',\n\t\t') + '\n\t]';
    }
    return '{\n' + '\t"config": ' + configText + ',\n\t"data": ' + dataText + '\n}';
  }
  else {
    return String(transitionConfig);
  }
}

export type TransitionConfigEditResult = { ok: true; config: TransitionConfig } | { ok: false; errorMessage: string };

/** Parse + validate a transition-config edit for Apply. */
export function applyTransitionConfigEdit(configText: string): TransitionConfigEditResult {
  try {
    const newConfig = JSON.parse(configText);
    if (objectValidator(newConfig)) {
      if (objectValidator(newConfig.config)) {
        const mochartDemoConfig = buildMochartDemoConfig(newConfig.config);
        const { configValidation } = mochartDemoConfig;
        const { valid, errors, warnings } = configValidation;
        if (valid) {
          if (arrayValidator(newConfig.data) && !newConfig.data.some((aData: unknown) => !arrayValidator(aData))) {
            return { ok: true, config: newConfig };
          }
          else {
            console.warn('Invalid Transition Config, data should be an array of arrays: ', newConfig.data);
            return { ok: false, errorMessage: demoText.errors.transitionDataArrays };
          }
        }
        else {
          if (errors.length > 0) {
            console.warn('errors: ', errors);
          }
          if (warnings.length > 0) {
            console.warn('warnings: ', warnings);
          }
          return { ok: false, errorMessage: demoText.errors.invalidChartConfig };
        }
      }
      else {
        console.warn('Invalid Transition Config, config should be an object: ', newConfig.config);
        return { ok: false, errorMessage: demoText.errors.transitionConfigObject };
      }
    }
    else {
      console.warn('Invalid Transition Config, should be an object: ', configText);
      return { ok: false, errorMessage: demoText.errors.transitionObject };
    }
  }
  catch {
    console.warn('Invalid Transition Config JSON: ', configText);
    return { ok: false, errorMessage: demoText.errors.invalidJson };
  }
}
