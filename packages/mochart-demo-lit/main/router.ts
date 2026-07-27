// Tiny history-based router built on a plain listener set (Lit has no global
// reactivity; DemoApp subscribes and re-renders on change). Keeps the same
// URL scheme as the react demo (react-router paths), including the optional
// window.__config routerBasePath used when the demo is hosted on a sub-path.

interface DemoWindowConfig {
  routerBasePath?: string;
}

let routerBasePath = '/';

const config = (window as unknown as { __config?: DemoWindowConfig })['__config'];
if (config !== undefined) {
  if (config['routerBasePath'] !== undefined) {
    routerBasePath = config['routerBasePath'];
  }
}

const normalizedBase = routerBasePath.replace(/\/+$/, '');

function stripBasePath(pathname: string): string {
  if (normalizedBase !== '' && pathname.startsWith(normalizedBase)) {
    pathname = pathname.slice(normalizedBase.length);
  }
  return pathname === '' ? '/' : pathname;
}

let currentPath = stripBasePath(window.location.pathname);

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

window.addEventListener('popstate', () => {
  currentPath = stripBasePath(window.location.pathname);
  notify();
});

export function getPath(): string {
  return currentPath;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function navigate(to: string, { replace = false }: { replace?: boolean } = {}): void {
  // Carry query params (e.g. the ?siteRoot debug switch) across navigations;
  // routes themselves only ever use the pathname.
  const url = normalizedBase + to + window.location.search;
  if (replace) {
    window.history.replaceState(null, '', url);
  }
  else {
    window.history.pushState(null, '', url);
  }
  currentPath = to;
  notify();
}
