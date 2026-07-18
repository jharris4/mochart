<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { applyDataEdit, buildMochartDemoConfig, collectUsedDataProperties, demoText, formatDataView, getJsonError, parseFullData } from '@mochart/demo-common';

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
  dataText.value = formatDataView(fullRows, viewUsedProperties);
}

function parseCurrentFullData(): ReturnType<typeof parseFullData> {
  return parseFullData(dataText.value, fullData, viewUsedProperties);
}

renderView(props.data);

watch(() => props.data, (nextData) => {
  renderView(nextData);
});

// Re-filter when the applied config changes, keeping any (valid) unapplied edits.
watch(() => props.config, () => {
  if (!showUnused.value) {
    const parsed = parseCurrentFullData();
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
  const parsed = parseCurrentFullData();
  if ('error' in parsed) {
    errorMessage.value = parsed.error === 'json' ? demoText.errors.invalidJson : demoText.errors.invalidDataArray;
    return;
  }
  showUnused.value = !showUnused.value;
  errorMessage.value = null;
  renderView(parsed.full);
}

function applyData() {
  const result = applyDataEdit(dataText.value, fullData, viewUsedProperties, props.config);
  if (result.ok) {
    errorMessage.value = null;
    fullData = result.data;
    props.onDataChange(result.data);
  }
  else {
    errorMessage.value = result.errorMessage;
    props.onDataError(result.callbackError);
  }
}

const jsonError = computed(() => getJsonError(dataText.value));
const footerError = computed(() => jsonError.value ?? errorMessage.value);
</script>

<template>
  <div :class="'mochart-demo-tab-container col data' + (props.active ? ' active' : '')">
    <div class="mochart-demo-tab-content">
      <TextAreaContent :value="dataText" :on-change="onTextChange" />
    </div>
    <div class="mochart-demo-tab-footer">
      <div class="btn-toolbar" role="toolbar">
        <ButtonWithTooltip id="data-reset" :label="demoText.dataTab.reset.label" :tooltip-text="demoText.dataTab.reset.tooltip" tooltip-placement="top-start"
                           :on-click="resetData" :aria-label="demoText.dataTab.reset.aria">
          <Icon size="lg" :fixed-width="true" name="arrow-rotate-left" />
        </ButtonWithTooltip>
        <ButtonWithTooltip id="data-unused" :label="demoText.dataTab.unused.label" :pressed="showUnused"
                           :tooltip-text="demoText.dataTab.unused.tooltip" tooltip-placement="top-start"
                           :on-click="toggleShowUnused" :aria-label="demoText.dataTab.unused.aria">
          <Icon size="lg" :fixed-width="true" :name="showUnused ? 'eye' : 'eye-slash'" />
        </ButtonWithTooltip>
        <ButtonWithTooltip id="data-apply" :label="demoText.dataTab.apply.label" :disabled="jsonError !== null"
                           :tooltip-text="demoText.dataTab.apply.tooltip" tooltip-placement="top-start"
                           :on-click="applyData" :aria-label="demoText.dataTab.apply.aria">
          <Icon size="lg" :fixed-width="true" name="check" />
        </ButtonWithTooltip>
        <span v-if="footerError" class="mochart-demo-footer-error" role="alert">{{ footerError }}</span>
      </div>
    </div>
  </div>
</template>
