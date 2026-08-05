<script lang="ts">
  import { onDestroy } from 'svelte';

  import { buildShareUrl, demoText } from '@mochart/demo-common';
  import type { ShareState } from '@mochart/demo-common';

  import Icon from './Icon.svelte';
  import { Menu } from './menu.svelte';

  // A collapsed export/share menu placed at the end of each mode's controls row.
  // The trigger uses a share icon; the menu holds PNG / SVG downloads and (when a
  // share state is provided) a copy-share-link item. The parent supplies the
  // export actions so this component stays agnostic about single vs. tiled charts.
  //
  // Positioning, dismissal, focus return and the disclosure ARIA come from the
  // `Menu` class (demo-common's menu geometry + dismissal under runes) —
  // including the reason any of it is hand-rolled (the controls strips clip an
  // absolutely-positioned dropdown, and the chart's interaction rect eats
  // clicks through anything stacked below it). What stays here is what the
  // class does not know about: the items, the copied-link feedback, `disabled`.
  interface Props {
    idPrefix: string;
    exportPng: () => void;
    exportSvg: () => void;
    /** Omit to hide the Share item (e.g. a chart whose state isn't shareable). */
    getShareState?: () => ShareState;
    disabled?: boolean;
    /**
     * The hosting pane's active state. A deactivated pane is only marked
     * inert, and an open panel is `position: fixed` — it would keep painting
     * over the pane that replaced this one. False closes the menu.
     */
    active?: boolean;
  }

  let { idPrefix, exportPng, exportSvg, getShareState = undefined, disabled = false, active = true }: Props = $props();

  const copiedFeedbackMs = 1500;

  let copied = $state(false);
  let revertTimer: ReturnType<typeof setTimeout> | null = null;

  // Opens upward (the controls row sits at the bottom of the pane) and
  // right-aligned (the trigger is the last control in the row).
  // svelte-ignore state_referenced_locally -- idPrefix is fixed per mount
  const menu = new Menu({
    placement: { side: 'top', align: 'end', gap: 4 },
    triggerId: idPrefix + '-export-share'
  });

  // A disabled trigger fires no click, so the menu cannot be opened — but one
  // already open when its trigger is disabled would be stranded.
  $effect(() => {
    if (disabled || !active) {
      menu.close();
    }
  });

  onDestroy(() => {
    if (revertTimer !== null) {
      clearTimeout(revertTimer);
    }
  });

  function runAndClose(action: () => void) {
    action();
    menu.close();
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
    menu.close();
  }
</script>

<div class="demo-btn-category demo-menu-up mochart-export-share-menu">
  <button type="button" bind:this={menu.trigger} {...menu.triggerProps}
          class={'demo-btn demo-btn-secondary demo-menu-trigger' + (menu.open ? ' active' : '')}
          {disabled}
          title={demoText.exportShareMenu.trigger.tooltip} aria-label={demoText.exportShareMenu.trigger.aria}>
    <Icon size="lg" fixedWidth={true} name="share-nodes" />
  </button>
  <div bind:this={menu.panel} {...menu.panelProps}
       class={'demo-menu' + (menu.isPositioned ? ' open' : '')}>
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
