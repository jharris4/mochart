<script setup lang="ts">
import { computed, ref } from 'vue';

import { DefaultChart } from '@mochart/vue';

import { demoText, inlineSparklineMetrics, tableSparklineMetrics } from '@mochart/demo-common';

import ButtonWithTooltip from '../misc/ButtonWithTooltip.vue';
import Icon from '../misc/Icon.vue';
import TopBar from '../misc/TopBar.vue';

interface Props {
  siteRootUrl?: string;
  onBackToDemos: () => void;
}

const props = defineProps<Props>();

const text = demoText.sparklinePage;

// The Randomize button steps every metric's dataset in lockstep; each chart's
// data (and each table row's latest text) is derived from the current step.
const step = ref(0);

const inlineData = computed(() => inlineSparklineMetrics.map(metric => metric.generate(step.value)));
const tableData = computed(() => tableSparklineMetrics.map(metric => metric.generate(step.value)));

function onRandomize() {
  step.value++;
}
</script>

<template>
  <div class="mochart-demo-container">
    <TopBar :site-root-url="props.siteRootUrl" :on-back-to-demos="props.onBackToDemos" />
    <div class="sparkline-page">
      <!-- The intro paragraph: copy segments with the inline metrics between
           them. Keep {{ segment }} and the span adjacent so the segments'
           built-in spacing survives template whitespace condensing. -->
      <p class="sparkline-intro">
        <template v-for="(segment, i) in text.intro" :key="i">{{ segment }}<span v-if="inlineSparklineMetrics[i] !== undefined" class="sparkline-inline">
          <DefaultChart :config="inlineSparklineMetrics[i].config" :data="inlineData[i]"
                        :width="inlineSparklineMetrics[i].width" :height="inlineSparklineMetrics[i].height" />
        </span></template>
      </p>
      <div class="sparkline-controls">
        <ButtonWithTooltip id="sparkline-randomize" color="primary" :label="text.randomize.label"
                           :tooltip-text="text.randomize.tooltip" :on-click="onRandomize"
                           :aria-label="text.randomize.aria">
          <Icon :fixed-width="true" name="dice" />
        </ButtonWithTooltip>
      </div>
      <table class="sparkline-table">
        <thead>
          <tr>
            <th>{{ text.table.metric }}</th>
            <th>{{ text.table.latest }}</th>
            <th>{{ text.table.trend }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(metric, i) in tableSparklineMetrics" :key="metric.id">
            <td>{{ metric.label }}</td>
            <td class="sparkline-value">{{ metric.latestText(tableData[i]) }}</td>
            <td class="sparkline-cell">
              <DefaultChart :config="metric.config" :data="tableData[i]"
                            :width="metric.width" :height="metric.height" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
