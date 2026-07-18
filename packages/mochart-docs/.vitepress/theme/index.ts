import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import LiveChart from './LiveChart.vue';
import './custom.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('LiveChart', LiveChart);
  }
} satisfies Theme;
