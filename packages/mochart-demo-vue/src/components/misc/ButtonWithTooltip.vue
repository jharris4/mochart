<script setup lang="ts">
// The react demo used reactstrap's Tooltip; the native title attribute
// covers the same hint here without a popper-style positioning library.
// tooltipPlacement is accepted for call-site parity but unused. Extra
// attributes (e.g. aria-label) fall through to the button element.
interface Props {
  id: string;
  tooltipText?: string;
  tooltipPlacement?: string;
  disabled?: boolean;
  onClick: () => void;
  color?: string;
}

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<Props>(), {
  tooltipText: void 0,
  tooltipPlacement: void 0,
  disabled: false,
  color: 'secondary'
});
</script>

<template>
  <span class="button-with-tooltip">
    <button :id="props.id" type="button" :class="`btn btn-${props.color}`" :disabled="props.disabled"
            :title="props.tooltipText" v-bind="$attrs" @click="props.onClick()">
      <slot></slot>
    </button>
  </span>
</template>
