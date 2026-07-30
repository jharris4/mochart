<script lang="ts">
  import { demoText, getNotesPanelPosition } from '@mochart/demo-common';

  import Icon from './Icon.svelte';

  // The "about this demo" button in each mode's navigation row: an info icon
  // that opens the demo's `notes` (the detail kept out of its one-sentence
  // gallery description) in a popover panel.
  //
  // Positioning follows ExportShareMenu: the surrounding panes use
  // `overflow: hidden`, which would clip a normally-positioned dropdown, so the
  // panel is `fixed` at coordinates measured from the trigger. This one opens
  // downward from the navigation row (the export menu opens upward from the
  // controls row) and is closed on scroll/resize rather than repositioned.
  interface Props {
    /** Demo title, shown as the panel heading. */
    title: string;
    /** The demo's notes; nothing renders when there are none. */
    notes?: string;
  }

  let { title, notes = undefined }: Props = $props();

  let open = $state(false);
  let coords = $state<{ top: number; left: number } | null>(null);

  let rootElement = $state<HTMLDivElement | null>(null);
  let triggerElement = $state<HTMLButtonElement | null>(null);

  function close() {
    open = false;
    coords = null;
  }

  // Positioned synchronously (before paint) on open, like ExportShareMenu.
  function toggle() {
    if (open) {
      close();
    }
    else {
      const rect = triggerElement?.getBoundingClientRect();
      if (rect) {
        coords = getNotesPanelPosition(rect, window.innerWidth);
      }
      open = true;
    }
  }

  // Close whenever the demo changes under us (history navigation between demos).
  $effect(() => {
    void title;
    void notes;
    close();
  });

  // Close on an outside click or Escape while the panel is open. A fixed panel
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

  const menuStyle = $derived(open && coords
    ? `position: fixed; top: ${coords.top}px; left: ${coords.left}px; margin: 0; z-index: 1080;`
    : undefined);
</script>

{#if notes !== undefined}
  <div class="demo-btn-group mochart-demo-notes-menu" bind:this={rootElement}>
    <button type="button" bind:this={triggerElement}
            class={'demo-btn demo-btn-secondary mochart-demo-notes-trigger' + (open ? ' active' : '')}
            aria-haspopup="true" aria-expanded={open}
            title={demoText.demoNotes.trigger.tooltip} aria-label={demoText.demoNotes.trigger.aria}
            onclick={toggle}>
      <Icon size="lg" fixedWidth={true} name="circle-info" />
    </button>
    <div class={'demo-menu demo-menu-notes' + (open ? ' open' : '')} style={menuStyle}>
      <span class="demo-menu-notes-title">{title}</span>
      <span class="demo-menu-notes-body">{notes}</span>
    </div>
  </div>
{/if}
