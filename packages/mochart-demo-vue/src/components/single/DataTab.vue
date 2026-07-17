<script setup lang="ts">
import { ref, watch } from 'vue';

import { ArrayOfObjectsDataProvider, getDataErrors } from 'mochart';
import type { DataProvider } from 'mochart';

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

watch(() => props.data, (nextData) => {
  dataText.value = formatData(nextData);
});

function onTextChange(nextDataText: string) {
  dataText.value = nextDataText;
}

function resetData() {
  dataText.value = formatData(props.data);
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
      props.onDataError(error);
    }
    else {
      props.onDataChange(parsedData);
    }
  }
  catch (error) {
    console.warn('Invalid Data JSON: ' + String(error));
    alert('Invalid Data JSON');
    props.onDataError('Invalid Data ');
  }
}
</script>

<template>
  <div :class="'mochart-demo-tab-container col data' + (props.active ? ' active' : '')">
    <div class="mochart-demo-tab-content">
      <TextAreaContent :value="dataText" :on-change="onTextChange" />
    </div>
    <div class="mochart-demo-tab-footer">
      <div class="btn-toolbar" role="toolbar">
        <ButtonWithTooltip id="data-reset" tooltip-text="Reset" tooltip-placement="top-start"
                           :on-click="resetData" aria-label="Reset">
          <Icon size="lg" :fixed-width="true" name="undo" />
        </ButtonWithTooltip>
        <ButtonWithTooltip id="data-apply" tooltip-text="Apply" tooltip-placement="top-start"
                           :on-click="applyData" aria-label="Apply">
          <Icon size="lg" :fixed-width="true" name="check" />
        </ButtonWithTooltip>
      </div>
    </div>
  </div>
</template>
