<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { ArrayOfObjectsDataProvider, getDataErrors } from '@mochart/core';
import type { DataProvider } from '@mochart/core';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';
import { collectUsedDataProperties, filterDataProperties, restoreHiddenDataProperties } from '../../config/unusedDataProperties';

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

type ParsedFullData = { full: DataRow[] } | { error: 'json' | 'data' };

const props = withDefaults(defineProps<Props>(), {
  active: false
});

// Data properties the chart config does not read are hidden by default; the
// Unused button toggles them. fullData is the complete dataset backing the
// textarea, viewUsedProperties the used-set its current content was rendered
// with (null when every property is shown).
const usedProperties = computed(() => collectUsedDataProperties(buildMochartDemoConfig(props.config).mochartConfig));
const showUnused = ref(false);
let fullData: DataRow[] = props.data;
let viewUsedProperties: Set<string> | null = null;

const dataText = ref('');
const errorMessage = ref<string | null>(null);

function renderView(fullRows: DataRow[]): void {
  fullData = fullRows;
  viewUsedProperties = showUnused.value ? null : usedProperties.value;
  dataText.value = formatData(viewUsedProperties === null ? fullRows : filterDataProperties(fullRows, viewUsedProperties));
}

// Parse the textarea back to a full dataset, restoring any properties the
// filtered view hid.
function parseFullData(): ParsedFullData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(dataText.value);
  }
  catch (error) {
    return { error: 'json' };
  }
  if (!isArrayOfObjects(parsed)) {
    return { error: 'data' };
  }
  const rows = parsed as DataRow[];
  return { full: viewUsedProperties === null ? rows : restoreHiddenDataProperties(rows, fullData, viewUsedProperties) };
}

renderView(props.data);

watch(() => props.data, (nextData) => {
  renderView(nextData);
});

// Re-filter when the applied config changes, keeping any (valid) unapplied edits.
watch(() => props.config, () => {
  if (!showUnused.value) {
    const parsed = parseFullData();
    if (!('error' in parsed)) {
      renderView(parsed.full);
    }
  }
});

function onTextChange(nextDataText: string) {
  dataText.value = nextDataText;
  errorMessage.value = null;
}

function resetData() {
  renderView(props.data);
  errorMessage.value = null;
  props.onDataReset();
}

function toggleShowUnused() {
  const parsed = parseFullData();
  if ('error' in parsed) {
    errorMessage.value = parsed.error === 'json' ? 'Invalid JSON' : 'Invalid Data — should be an array of objects';
    return;
  }
  showUnused.value = !showUnused.value;
  errorMessage.value = null;
  renderView(parsed.full);
}

function applyData() {
  const parsed = parseFullData();
  if ('error' in parsed) {
    if (parsed.error === 'json') {
      console.warn('Invalid Data JSON');
      errorMessage.value = 'Invalid JSON';
      props.onDataError('Invalid Data ');
    }
    else {
      console.warn('Invalid Data - should be an array of objects');
      errorMessage.value = 'Invalid Data — details in the browser console';
      props.onDataError('Invalid Data');
    }
    return;
  }
  const parsedData = parsed.full;
  let error = null;
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
  if (error) {
    errorMessage.value = error + ' — details in the browser console';
    props.onDataError(error);
  }
  else {
    errorMessage.value = null;
    fullData = parsedData;
    props.onDataChange(parsedData);
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
        <ButtonWithTooltip id="data-unused" label="Unused" :pressed="showUnused"
                           tooltip-text="Show or hide data properties the chart config does not use" tooltip-placement="top-start"
                           :on-click="toggleShowUnused" aria-label="Toggle Unused">
          <Icon size="lg" :fixed-width="true" :name="showUnused ? 'eye' : 'eye-slash'" />
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
