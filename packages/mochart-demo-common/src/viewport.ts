// Viewport-width tiers shared by all six framework ports, so the one thing the
// stylesheet cannot do on its own — leaving a mode out of the switcher — agrees
// with the breakpoints in demo.css.

import { switchableDemoModes } from './gallery';
import type { SwitchableDemoMode } from './gallery';

/**
 * Phones. At this size the demo drops Multi mode: a rows × cols grid of charts
 * has no room to be legible, and the shell does not scroll, so there is nowhere
 * for the overflow to go.
 *
 * Keep in step with the phone tier in demo.css.
 */
export const phoneMaxWidth = 640;

/**
 * A phone turned sideways is still a phone, but it is wider than
 * `phoneMaxWidth` — 896×414 for the largest of them. Height alone would catch
 * short desktop windows too, so both bounds are needed.
 */
export const landscapePhoneMaxWidth = 900;
export const landscapePhoneMaxHeight = 480;

const phoneQuery = '(max-width: ' + phoneMaxWidth + 'px), '
  + '(max-width: ' + landscapePhoneMaxWidth + 'px) and (max-height: ' + landscapePhoneMaxHeight + 'px)';

/** False during SSR/prerender, where there is no viewport to ask. */
export function isPhoneViewport(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(phoneQuery).matches
    : false;
}

/**
 * Calls `onChange` whenever the viewport crosses the phone breakpoint — a
 * rotation or a resized desktop window, not just the initial load. Returns the
 * unsubscribe function; it does not fire on subscribe.
 */
export function watchPhoneViewport(onChange: (isPhone: boolean) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const query = window.matchMedia(phoneQuery);
  const listener = (event: MediaQueryListEvent): void => onChange(event.matches);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

/** The mode a phone falls back to when it asks for one it cannot show. */
export const phoneFallbackDemoMode: SwitchableDemoMode = 'single';

/**
 * Whether a mode is offered at all at this width. Keeping the policy here rather
 * than in each port means the switcher, the router and the share-link handling
 * cannot drift apart.
 */
export function isDemoModeAvailable(mode: SwitchableDemoMode, isPhone: boolean): boolean {
  return !(isPhone && mode === 'multi');
}

/** The modes the in-demo switcher should offer at this width. */
export function getAvailableDemoModes(isPhone: boolean): readonly SwitchableDemoMode[] {
  return switchableDemoModes.filter(mode => isDemoModeAvailable(mode, isPhone));
}
