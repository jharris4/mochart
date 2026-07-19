import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import LiveChart from './LiveChart.vue';
// Structural defaults for the chart's HTML overlays — shields the live
// examples from VitePress's base CSS resets (e.g. `svg { display: block }`).
import '@mochart/core/mochart.css';
import './custom.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('LiveChart', LiveChart);
  }
} satisfies Theme;
