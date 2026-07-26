<script lang="ts">
  import { onDestroy } from 'svelte';

  import { buildShareUrl, demoText } from '@mochart/demo-common';
  import type { ShareState } from '@mochart/demo-common';

  import Icon from './Icon.svelte';

  // A collapsed export/share menu placed at the end of each mode's controls row.
  // The trigger uses a share icon; the menu holds PNG / SVG downloads and (when a
  // share state is provided) a copy-share-link item. The parent supplies the
  // export actions so this component stays agnostic about single vs. tiled charts.
  //
  // The controls strips (and chart panes) use `overflow: hidden`, which would
  // clip a normal absolutely-positioned dropdown that opens upward over the
  // chart — and the chart's transparent interaction rect would steal clicks. So
  // the menu is positioned `fixed` (measured from the trigger) at a high z-index,
  // which escapes ancestor clipping and stacks above the chart.
  interface Props {
    idPrefix: string;
    exportPng: () => void;
    exportSvg: () => void;
    /** Omit to hide the Share item (e.g. a chart whose state isn't shareable). */
    getShareState?: () => ShareState;
    disabled?: boolean;
  }

  let { idPrefix, exportPng, exportSvg, getShareState = void 0, disabled = false }: Props = $props();

  const copiedFeedbackMs = 1500;
  const menuGap = 4;

  let open = $state(false);
  let copied = $state(false);
  let coords = $state<{ bottom: number; right: number } | null>(null);

  let rootElement = $state<HTMLDivElement | null>(null);
  let triggerElement = $state<HTMLButtonElement | null>(null);
  let revertTimer: ReturnType<typeof setTimeout> | null = null;

  function close() {
    open = false;
    coords = null;
  }

  // Anchor the fixed menu just above the trigger's top-right corner, so it opens
  // upward and right-aligned. Measured synchronously (before paint) on open.
  function toggle() {
    if (open) {
      close();
    }
    else {
      const rect = triggerElement?.getBoundingClientRect();
      if (rect) {
        coords = {
          bottom: window.innerHeight - rect.top + menuGap,
          right: window.innerWidth - rect.right
        };
      }
      open = true;
    }
  }

  // Close on an outside click or Escape while the menu is open. A fixed menu
  // would drift on scroll/resize; just close it instead.
  $effect(() => {
    if (!open) {
      return;
    }
    const onDocMouseDown = (event: MouseEvent) => {
      if (rootElement && !rootElement.contains(event.target as Node)) {
        close();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };
    const onReflow = () => close();
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
    };
  });

  onDestroy(() => {
    if (revertTimer !== null) {
      clearTimeout(revertTimer);
    }
  });

  function runAndClose(action: () => void) {
    action();
    close();
  }

  function onShare() {
    if (!getShareState) {
      return;
    }
    const url = buildShareUrl(getShareState());
    navigator.clipboard.writeText(url).then(() => {
      copied = true;
      if (revertTimer !== null) {
        clearTimeout(revertTimer);
      }
      revertTimer = setTimeout(() => { copied = false; revertTimer = null; }, copiedFeedbackMs);
    }, () => {
      // Clipboard access can be unavailable (e.g. insecure context); let the
      // user copy the link manually instead of failing silently.
      window.prompt(demoText.shareButton.tooltip, url);
    });
    close();
  }

  const menuOpen = $derived(open && coords !== null);
  const menuStyle = $derived(menuOpen && coords
    ? `position: fixed; bottom: ${coords.bottom}px; right: ${coords.right}px; margin: 0; z-index: 1080;`
    : void 0);
</script>

<div class="demo-btn-group demo-menu-up mochart-export-share-menu" bind:this={rootElement}>
  <button id={idPrefix + '-export-share'} type="button" bind:this={triggerElement}
          class={'demo-btn demo-btn-secondary demo-menu-trigger' + (open ? ' active' : '')}
          {disabled} aria-haspopup="true" aria-expanded={open}
          title={demoText.exportShareMenu.trigger.tooltip} aria-label={demoText.exportShareMenu.trigger.aria}
          onclick={toggle}>
    <Icon size="lg" fixedWidth={true} name="share-nodes" />
  </button>
  <div class={'demo-menu' + (menuOpen ? ' open' : '')} style={menuStyle}>
    <button type="button" class="demo-menu-item" onclick={() => runAndClose(exportPng)}
            aria-label={demoText.exportButtons.png.aria}>
      <Icon fixedWidth={true} name="file-image" /> <span class="mochart-menu-item-label">{demoText.exportButtons.png.label}</span>
    </button>
    <button type="button" class="demo-menu-item" onclick={() => runAndClose(exportSvg)}
            aria-label={demoText.exportButtons.svg.aria}>
      <Icon fixedWidth={true} name="file-code" /> <span class="mochart-menu-item-label">{demoText.exportButtons.svg.label}</span>
    </button>
    {#if getShareState}
      <div class="demo-menu-divider"></div>
      <button type="button" class="demo-menu-item" onclick={onShare}
              aria-label={demoText.shareButton.aria}>
        <Icon fixedWidth={true} name={copied ? 'check' : 'link'} /> <span class="mochart-menu-item-label">{copied ? demoText.shareButton.tooltipCopied : demoText.shareButton.label}</span>
      </button>
    {/if}
  </div>
</div>
