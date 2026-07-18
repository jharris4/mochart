import { defineComponent, h } from 'vue';
import { createChart } from '@mochart/core';
import { useChartHost } from './useChartHost';
import { chartProps } from './props';

/**
 * Vue wrapper around mochart's `createChart`: takes an enhanced config
 * (`mochartConfig`) and a data provider. Omit `width`/`height` to have the
 * chart track the container div's size. `class`/`style` fall through to the
 * container div.
 */
export default defineComponent({
  name: 'Chart',
  props: chartProps,
  setup(props) {
    const containerRef = useChartHost(createChart, () => ({ ...props }));
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
