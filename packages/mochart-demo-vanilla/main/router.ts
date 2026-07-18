// Tiny history-based router. Keeps the same URL scheme as the framework
// demos (react-router paths), including the optional window.__config
// routerBasePath used when the demo is hosted on a sub-path.

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

type RouteListener = (path: string) => void;
const listeners = new Set<RouteListener>();

function notify(): void {
  for (const listener of listeners) {
    listener(currentPath);
  }
}

window.addEventListener('popstate', () => {
  currentPath = stripBasePath(window.location.pathname);
  notify();
});

export function getPath(): string {
  return currentPath;
}

export function navigate(to: string, { replace = false }: { replace?: boolean } = {}): void {
  const url = normalizedBase + to;
  if (replace) {
    window.history.replaceState(null, '', url);
  }
  else {
    window.history.pushState(null, '', url);
  }
  currentPath = to;
  notify();
}

/** Subscribe to path changes; returns an unsubscribe function. */
export function onNavigate(listener: RouteListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
