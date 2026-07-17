<script>
  // The react demo used reactstrap's Tooltip; the native title attribute
  // covers the same hint here without a popper-style positioning library.
  // tooltipPlacement is accepted for call-site parity but unused.
  let {
    id,
    tooltipText,
    tooltipPlacement = void 0,
    disabled = false,
    onClick,
    color = 'secondary',
    children,
    ...rest
  } = $props();
</script>

<span class="button-with-tooltip">
  <button {id} type="button" class={`btn btn-${color}`} {disabled} title={tooltipText} onclick={onClick} {...rest}>
    {@render children()}
  </button>
</span>
