import { defineComponent, h } from 'vue';
import { createDefaultChart } from '@mochart/core';
import { useChartHost } from './useChartHost.js';
import { defaultChartProps } from './props.js';

/**
 * Vue wrapper around mochart's `createDefaultChart`: takes a raw `config`
 * (enhanced internally) and a plain array-of-objects `data`. Omit
 * `width`/`height` to have the chart track the container div's size.
 * `class`/`style` fall through to the container div. A template ref on the
 * component exposes `refresh()`.
 */
export default defineComponent({
  name: 'DefaultChart',
  props: defaultChartProps,
  // inheritAttrs off so the explicit size props can win over a fallthrough style
  inheritAttrs: false,
  setup(props, { attrs, expose }) {
    const { containerRef, refresh } = useChartHost(createDefaultChart, () => ({ ...props }));
    expose({ refresh });
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
