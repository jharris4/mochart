// Light/dark theme controller, synced two-way with the docs site.
//
// The docs (VitePress) store the visitor's choice in localStorage under
// 'vitepress-theme-appearance' and toggle a `dark` class on <html>. The demos
// deploy same-origin with the docs, so reading and writing the same key keeps
// one coherent theme across the whole site: 'auto' (or no entry) follows the
// OS preference, 'light'/'dark' are explicit choices. Each demo's index.html
// carries a matching pre-hydration snippet so the first paint is already
// themed; initTheme() takes over from there.

const storageKey = 'vitepress-theme-appearance';
const darkClass = 'dark';

export interface ThemeController {
  /** Whether the dark theme is currently applied. */
  isDark(): boolean;
  /** Flip the theme, persist the explicit choice, and notify listeners. */
  toggle(): void;
  /** Subscribe to theme changes (toggle, other tabs, OS changes); returns an unsubscribe. */
  onChange(listener: (dark: boolean) => void): () => void;
  /** Remove the controller's window/media listeners. */
  destroy(): void;
}

function readStoredPreference(): string {
  try {
    return localStorage.getItem(storageKey) ?? 'auto';
  }
  catch {
    return 'auto';
  }
}

function writeStoredPreference(value: 'light' | 'dark'): void {
  try {
    localStorage.setItem(storageKey, value);
  }
  catch {
    // Storage can be unavailable (privacy modes); the in-page toggle still works.
  }
}

export function initTheme(): ThemeController {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const listeners = new Set<(dark: boolean) => void>();

  function resolve(): boolean {
    const stored = readStoredPreference();
    return stored === 'auto' ? media.matches : stored === 'dark';
  }

  function apply(dark: boolean): void {
    if (document.documentElement.classList.contains(darkClass) === dark) {
      return;
    }
    document.documentElement.classList.toggle(darkClass, dark);
    listeners.forEach(listener => listener(dark));
  }

  function onStorage(event: StorageEvent): void {
    if (event.key === null || event.key === storageKey) {
      apply(resolve());
    }
  }

  function onMediaChange(): void {
    if (readStoredPreference() === 'auto') {
      apply(media.matches);
    }
  }

  window.addEventListener('storage', onStorage);
  media.addEventListener('change', onMediaChange);
  apply(resolve());

  return {
    isDark() {
      return document.documentElement.classList.contains(darkClass);
    },
    toggle() {
      const next = !document.documentElement.classList.contains(darkClass);
      writeStoredPreference(next ? 'dark' : 'light');
      apply(next);
    },
    onChange(listener: (dark: boolean) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    destroy() {
      window.removeEventListener('storage', onStorage);
      media.removeEventListener('change', onMediaChange);
      listeners.clear();
    }
  };
}
