import { defineComponent, h } from 'vue';
import { createDefaultChart } from '@mochart/core';
import { useChartHost } from './useChartHost.js';
import { defaultChartProps } from './props.js';

/**
 * Vue wrapper around mochart's `createDefaultChart`: takes a raw `config`
 * (enhanced internally) and a plain array-of-objects `data`. Omit
 * `width`/`height` to have the chart track the container div's size.
 * `class`/`style` fall through to the container div.
 */
export default defineComponent({
  name: 'DefaultChart',
  props: defaultChartProps,
  setup(props) {
    const containerRef = useChartHost(createDefaultChart, () => ({ ...props }));
    return () =>
      h('div', {
        ref: containerRef,
        style: {
          width: typeof props.width === 'number' ? `${props.width}px` : undefined,
          height: typeof props.height === 'number' ? `${props.height}px` : undefined
        }
      });
  }
});
