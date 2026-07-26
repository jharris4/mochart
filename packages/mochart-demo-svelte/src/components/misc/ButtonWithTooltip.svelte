<script lang="ts">
  import type { Snippet } from 'svelte';

  // The native title attribute covers the hover hint without a popper-style
  // positioning library.
  // tooltipPlacement is accepted for call-site parity but unused.
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
    children: Snippet;
    [key: string]: unknown;
  }

  let {
    id,
    tooltipText,
    tooltipPlacement = void 0,
    disabled = false,
    onClick,
    color = 'secondary',
    label = void 0,
    pressed = void 0,
    children,
    ...rest
  }: Props = $props();
</script>

<span class="button-with-tooltip">
  <button {id} type="button" class={`demo-btn demo-btn-${color}` + (pressed ? ' active' : '')} {disabled} title={tooltipText}
          aria-pressed={pressed === void 0 ? void 0 : pressed} onclick={onClick} {...rest}>
    {@render children()}{#if label}<span class="btn-label">{label}</span>{/if}
  </button>
</span>
