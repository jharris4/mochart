<script>
  // Font Awesome 4 icon (css classes only), the Svelte equivalent of the
  // react demo's react-fontawesome shim. Relies on the `font-awesome`
  // package's css being imported.
  let { name, size = void 0, fixedWidth = false, flip = void 0 } = $props();

  const classes = $derived.by(() => {
    const list = ['fa', `fa-${name}`];
    if (size) {
      list.push(`fa-${size}`);
    }
    if (fixedWidth) {
      list.push('fa-fw');
    }
    if (flip) {
      list.push(`fa-flip-${flip}`);
    }
    return list.join(' ');
  });
</script>

<span aria-hidden="true" class={classes}></span>
