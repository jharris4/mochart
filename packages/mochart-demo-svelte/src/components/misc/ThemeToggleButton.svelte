<script lang="ts" module>
  import { initTheme } from '@mochart/demo-common';

  // One controller for the whole app; every view's toggle button shares it.
  const theme = initTheme();
</script>

<script lang="ts">
  // Icon-only light/dark toggle; shares the docs site's theme choice.
  import { demoText } from '@mochart/demo-common';

  import Icon from './Icon.svelte';

  let dark = $state(theme.isDark());
  $effect(() => theme.onChange(value => { dark = value; }));
</script>

<!-- The `.btn-menu-label` span is text for the phone fold only: folded into
     the nav overflow menu this would be the one row with nothing to read, and
     the class is `display: none` everywhere except inside a `.demo-menu`. -->
<button type="button" class="demo-btn demo-btn-secondary mochart-demo-theme-toggle"
        title={dark ? demoText.themeToggle.tooltipToLight : demoText.themeToggle.tooltipToDark}
        aria-label={demoText.themeToggle.aria}
        onclick={() => theme.toggle()}>
  <Icon size="lg" name={dark ? 'sun' : 'moon'} fixedWidth />
  <span class="btn-menu-label">{dark ? demoText.themeToggle.menuLabelToLight : demoText.themeToggle.menuLabelToDark}</span>
</button>
