import { defineComponent, h } from 'vue';
import { createChart } from '@mochart/core';
import { useChartHost } from './useChartHost.js';
import { chartProps } from './props.js';

/**
 * Vue wrapper around mochart's `createChart`: takes an enhanced config
 * (`mochartConfig`) and a data provider. Omit `width`/`height` to have the
 * chart track the container div's size. `class`/`style` fall through to the
 * container div.
 */
export default defineComponent({
  name: 'Chart',
  props: chartProps,
  // inheritAttrs off so the explicit size props can win over a fallthrough style
  inheritAttrs: false,
  setup(props, { attrs }) {
    const containerRef = useChartHost(createChart, () => ({ ...props }));
    return () => {
      const sizeStyle: Record<string, string> = {};
      if (typeof props.width === 'number') {
        sizeStyle.width = `${props.width}px`;
      }
      if (typeof props.height === 'number') {
        sizeStyle.height = `${props.height}px`;
      }
      return h('div', {
        ...attrs,
        ref: containerRef,
        style: [attrs.style, sizeStyle]
      });
    };
  }
});
