// Tiny history-based router built on Svelte 5 runes. Keeps the same URL
// scheme as the react demo (react-router paths), including the optional
// window.__config routerBasePath used when the demo is hosted on a sub-path.

let routerBasePath = '/';

const config = window['__config'];
if (config !== void 0) {
  if (config['routerBasePath'] !== void 0) {
    routerBasePath = config['routerBasePath'];
  }
}

const normalizedBase = routerBasePath.replace(/\/+$/, '');

function stripBasePath(pathname) {
  if (normalizedBase !== '' && pathname.startsWith(normalizedBase)) {
    pathname = pathname.slice(normalizedBase.length);
  }
  return pathname === '' ? '/' : pathname;
}

const router = $state({ path: stripBasePath(window.location.pathname) });

window.addEventListener('popstate', () => {
  router.path = stripBasePath(window.location.pathname);
});

export function getPath() {
  return router.path;
}

export function navigate(to, { replace = false } = {}) {
  const url = normalizedBase + to;
  if (replace) {
    window.history.replaceState(null, '', url);
  }
  else {
    window.history.pushState(null, '', url);
  }
  router.path = to;
}
