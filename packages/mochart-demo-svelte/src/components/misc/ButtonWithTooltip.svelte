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
    tooltipPlacement = undefined,
    disabled = false,
    onClick,
    color = 'secondary',
    label = undefined,
    pressed = undefined,
    children,
    ...rest
  }: Props = $props();
</script>

<span class="button-with-tooltip">
  <button {id} type="button" class={`demo-btn demo-btn-${color}` + (pressed ? ' active' : '')} {disabled} title={tooltipText}
          aria-pressed={pressed === undefined ? undefined : pressed} onclick={onClick} {...rest}>
    {@render children()}{#if label}<span class="btn-label">{label}</span>{/if}
  </button>
</span>
