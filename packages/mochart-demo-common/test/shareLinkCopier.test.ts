// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { createShareLinkCopier, shareHashPrefix } from '../src/shareState';
import { demoText } from '../src/demoText';
import type { ShareState } from '../src/shareState';

const state: ShareState = { mode: 'multi', rows: 2, cols: 2, step: 0, interval: 2000 };

function stubClipboard(writeText: (url: string) => Promise<void>): void {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
}

// DEMO-12: the clipboard write, the prompt fallback and the revert timer were
// spelled out in all six ports' export/share menus.
describe('createShareLinkCopier', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('copies the share URL and reports copied, then reverts', async () => {
    const written: string[] = [];
    stubClipboard(url => { written.push(url); return Promise.resolve(); });
    const changes: boolean[] = [];
    const copier = createShareLinkCopier(copied => changes.push(copied));

    copier.copy(state);
    await vi.waitFor(() => expect(changes).toEqual([true]));
    expect(written[0]).toContain(shareHashPrefix);

    vi.advanceTimersByTime(1500);
    expect(changes).toEqual([true, false]);
  });

  it('offers the link in a prompt when the clipboard refuses', async () => {
    stubClipboard(() => Promise.reject(new Error('insecure context')));
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue(null);
    const changes: boolean[] = [];
    const copier = createShareLinkCopier(copied => changes.push(copied));

    copier.copy(state);
    await vi.waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
    expect(prompt.mock.calls[0][0]).toBe(demoText.shareButton.tooltip);
    expect(changes).toEqual([]);
  });

  it('drops a pending revert on dispose, so a torn-down menu never calls back', async () => {
    stubClipboard(() => Promise.resolve());
    const changes: boolean[] = [];
    const copier = createShareLinkCopier(copied => changes.push(copied));

    copier.copy(state);
    await vi.waitFor(() => expect(changes).toEqual([true]));
    copier.dispose();
    vi.advanceTimersByTime(5000);
    expect(changes).toEqual([true]);
  });
});
