<script setup lang="ts">
// The native title attribute covers the hover hint without a popper-style
// positioning library.
// tooltipPlacement is accepted for call-site parity but unused. Extra
// attributes (e.g. aria-label) fall through to the button element.
// `label` renders visible text beside the icon; `pressed` marks the button
// as a toggle (aria-pressed + active styling).
interface Props {
  id: string;
  tooltipText?: string;
  tooltipPlacement?: string;
  disabled?: boolean;
  onClick: () => void;
  color?: string;
  label?: string;
  pressed?: boolean;
}

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<Props>(), {
  tooltipText: void 0,
  tooltipPlacement: void 0,
  disabled: false,
  color: 'secondary',
  label: void 0,
  pressed: void 0
});
</script>

<template>
  <span class="button-with-tooltip">
    <button :id="props.id" type="button" :class="`demo-btn demo-btn-${props.color}` + (props.pressed ? ' active' : '')"
            :disabled="props.disabled" :title="props.tooltipText"
            :aria-pressed="props.pressed === void 0 ? void 0 : props.pressed"
            v-bind="$attrs" @click="props.onClick()">
      <slot></slot><span v-if="props.label" class="btn-label">{{ props.label }}</span>
    </button>
  </span>
</template>
