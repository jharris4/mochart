<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { ArrayOfObjectsDataProvider, getDataErrors } from '@mochart/core';
import type { DataProvider } from '@mochart/core';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';

import TextAreaContent from '../misc/TextAreaContent.vue';
import ButtonWithTooltip from '../misc/ButtonWithTooltip.vue';
import Icon from '../misc/Icon.vue';

import type { DemoConfig, DataRow } from '../../types';

interface Props {
  active?: boolean;
  config: DemoConfig;
  data: DataRow[];
  onDataChange: (data: DataRow[]) => void;
  onDataError: (errorMessage: string) => void;
  onDataReset: () => void;
}

function formatData(dataJSON: unknown): string {
  return JSON.stringify(dataJSON).replace(/,/g, ', ').replace(/},/g, '},\n');
}

function isObject(v: unknown): boolean {
  return v !== null && v !== void 0 && typeof v === "object";
}

function isArrayOfObjects(candidate: unknown): boolean {
  return Array.isArray(candidate) && !candidate.some(v => !isObject(v));
}

const props = withDefaults(defineProps<Props>(), {
  active: false
});

const dataText = ref(formatData(props.data));
const errorMessage = ref<string | null>(null);

watch(() => props.data, (nextData) => {
  dataText.value = formatData(nextData);
});

function onTextChange(nextDataText: string) {
  dataText.value = nextDataText;
  errorMessage.value = null;
}

function resetData() {
  dataText.value = formatData(props.data);
  errorMessage.value = null;
  props.onDataReset();
}

function applyData() {
  try {
    const parsedData = JSON.parse(dataText.value);
    let error = null;
    if (isArrayOfObjects(parsedData)) {
      const { mochartConfig } = buildMochartDemoConfig(props.config);
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
      errorMessage.value = error + ' — details in the browser console';
      props.onDataError(error);
    }
    else {
      errorMessage.value = null;
      props.onDataChange(parsedData);
    }
  }
  catch (error) {
    console.warn('Invalid Data JSON: ' + String(error));
    errorMessage.value = 'Invalid JSON';
    props.onDataError('Invalid Data ');
  }
}

const jsonError = computed(() => {
  try {
    JSON.parse(dataText.value);
    return null;
  }
  catch (error) {
    return 'Invalid JSON';
  }
});
const footerError = computed(() => jsonError.value ?? errorMessage.value);
</script>

<template>
  <div :class="'mochart-demo-tab-container col data' + (props.active ? ' active' : '')">
    <div class="mochart-demo-tab-content">
      <TextAreaContent :value="dataText" :on-change="onTextChange" />
    </div>
    <div class="mochart-demo-tab-footer">
      <div class="btn-toolbar" role="toolbar">
        <ButtonWithTooltip id="data-reset" label="Reset" tooltip-text="Restore this demo's original data" tooltip-placement="top-start"
                           :on-click="resetData" aria-label="Reset">
          <Icon size="lg" :fixed-width="true" name="arrow-rotate-left" />
        </ButtonWithTooltip>
        <ButtonWithTooltip id="data-apply" label="Apply" :disabled="jsonError !== null"
                           tooltip-text="Apply this data — the chart updates when you return to the Chart tab" tooltip-placement="top-start"
                           :on-click="applyData" aria-label="Apply">
          <Icon size="lg" :fixed-width="true" name="check" />
        </ButtonWithTooltip>
        <span v-if="footerError" class="mochart-demo-footer-error" role="alert">{{ footerError }}</span>
      </div>
    </div>
  </div>
</template>
