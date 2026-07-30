// Geometry for the demo-notes popover (the ⓘ button in each mode's navigation
// row). Shared by all six framework ports so the clamp arithmetic — and its
// agreement with `.demo-menu-notes` in demo.css — lives in one place.

/** Gap between the trigger and the panel, and from the viewport edge. */
const panelGap = 6;

/** Keep in step with the `width` of `.demo-menu-notes` in demo.css. */
const panelMaxWidth = 340;
const panelViewportMargin = 32;

export interface NotesPanelPosition {
  top: number;
  left: number;
}

/**
 * Anchors the panel below the trigger's bottom-left corner, clamped so a wide
 * panel near the right edge of a narrow viewport stays on screen.
 *
 * The width is derived from the CSS rather than measured: the panel is
 * `display: none` until it opens, so a port that measures before opening reads
 * 0 and the clamp silently does nothing.
 */
export function getNotesPanelPosition(triggerRect: DOMRect, viewportWidth: number): NotesPanelPosition {
  const width = Math.min(panelMaxWidth, viewportWidth - panelViewportMargin);
  return {
    top: triggerRect.bottom + panelGap,
    left: Math.max(panelGap, Math.min(triggerRect.left, viewportWidth - width - panelGap))
  };
}
