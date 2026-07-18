<script setup lang="ts">
import { exportPNG, exportSVG } from '@mochart/export';

import { demoText } from '@mochart/demo-common';

import ButtonWithTooltip from './ButtonWithTooltip.vue';
import Icon from './Icon.vue';

// Download buttons for the chart found inside the container element
// (mochart-export locates the chart svg itself).
interface Props {
  idPrefix: string;
  getContainer: () => Element | null;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
});

function onExportPng() {
  const container = props.getContainer();
  if (container) {
    void exportPNG(container);
  }
}

function onExportSvg() {
  const container = props.getContainer();
  if (container) {
    exportSVG(container);
  }
}
</script>

<template>
  <div class="btn-group">
    <ButtonWithTooltip :id="props.idPrefix + '-export-png'" :disabled="props.disabled" :label="demoText.exportButtons.png.label"
                       :tooltip-text="demoText.exportButtons.png.tooltip" tooltip-placement="top-start"
                       :on-click="onExportPng" :aria-label="demoText.exportButtons.png.aria">
      <Icon size="lg" :fixed-width="true" name="file-image" />
    </ButtonWithTooltip>
    <ButtonWithTooltip :id="props.idPrefix + '-export-svg'" :disabled="props.disabled" :label="demoText.exportButtons.svg.label"
                       :tooltip-text="demoText.exportButtons.svg.tooltip" tooltip-placement="top-start"
                       :on-click="onExportSvg" :aria-label="demoText.exportButtons.svg.aria">
      <Icon size="lg" :fixed-width="true" name="file-code" />
    </ButtonWithTooltip>
  </div>
</template>
