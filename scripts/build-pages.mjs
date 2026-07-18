// Assembles the GitHub Pages site in site/: builds every demo gallery with a
// sub-path base, copies each dist into site/<slug>/, and adds the landing page
// plus the 404.html that lets history-routed demo URLs survive a hard refresh
// (GitHub Pages has no rewrites, so 404.html stashes the requested URL in
// sessionStorage and redirects to the demo's index.html, which restores it).
//
// Usage: node scripts/build-pages.mjs
// The base path defaults to /mochart/ and can be overridden with PAGES_BASE.
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const siteDir = join(rootDir, 'site');

const rawBase = process.env.PAGES_BASE !== void 0 ? process.env.PAGES_BASE : '/mochart/';
const base = rawBase.endsWith('/') ? rawBase : rawBase + '/';

const demos = [
  { slug: 'angular', pkg: '@mochart/demo-angular', title: 'Angular', detail: 'angular router, zoneless', historyRouting: true },
  { slug: 'lit', pkg: '@mochart/demo-lit', title: 'Lit', detail: 'lit-html directive router', historyRouting: true },
  { slug: 'react', pkg: '@mochart/demo-react', title: 'React', detail: 'react-router 7', historyRouting: true },
  { slug: 'svelte', pkg: '@mochart/demo-svelte', title: 'Svelte', detail: 'svelte 5 runes router', historyRouting: true },
  { slug: 'vanilla', pkg: '@mochart/demo-vanilla', title: 'Vanilla TypeScript', detail: 'no framework, history router', historyRouting: true },
  { slug: 'vue', pkg: '@mochart/demo-vue', title: 'Vue', detail: 'vue reactivity router', historyRouting: true }
];

function landingPage() {
  const items = demos.map((demo) =>
    `      <li><a href="${demo.slug}/">${demo.title}</a> <span class="detail">— ${demo.detail}</span></li>`
  ).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>mochart demos</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 3rem auto; padding: 0 1rem; line-height: 1.6; }
    h1 { margin-bottom: 0.25rem; }
    li { margin: 0.5rem 0; }
    .detail { color: #666; }
  </style>
</head>
<body>
  <main>
    <h1>mochart</h1>
    <p>Demo galleries for the mochart charting library, one per binding.</p>
    <ul>
${items}
    </ul>
    <p><a href="https://github.com/jharris4/mochart">github.com/jharris4/mochart</a></p>
  </main>
</body>
</html>
`;
}

function notFoundPage() {
  const historySlugs = demos.filter((demo) => demo.historyRouting).map((demo) => demo.slug);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>mochart demos</title>
  <script>
    // Deep link into a history-routed demo: stash the requested URL and load
    // the demo's index.html, which restores it via history.replaceState.
    (function () {
      var base = ${JSON.stringify(base)};
      var historyDemos = ${JSON.stringify(historySlugs)};
      var path = location.pathname;
      if (path.indexOf(base) === 0) {
        var slug = path.slice(base.length).split('/')[0];
        if (historyDemos.indexOf(slug) !== -1) {
          sessionStorage.setItem('mochart:redirect', path + location.search + location.hash);
          location.replace(base + slug + '/');
          return;
        }
      }
      location.replace(base);
    })();
  </script>
</head>
<body>Redirecting&hellip;</body>
</html>
`;
}

rmSync(siteDir, { recursive: true, force: true });
mkdirSync(siteDir);

for (const demo of demos) {
  // Package directories keep the unscoped mochart-* names.
  const pkgDir = demo.pkg.replace('@mochart/', 'mochart-');
  execSync(`npm run build -w ${demo.pkg} -- --base=${base}${demo.slug}/`, { cwd: rootDir, stdio: 'inherit' });
  cpSync(join(rootDir, 'packages', pkgDir, 'dist'), join(siteDir, demo.slug), { recursive: true });
}

// Cloudflare Pages honors _redirects with 200 rewrites, so deep links into the
// history-routed demos get real 200 responses there. GitHub Pages ignores the
// file and falls back to the 404.html trick below.
function redirectsFile() {
  return demos.filter((demo) => demo.historyRouting)
    .map((demo) => `${base}${demo.slug}/* ${base}${demo.slug}/index.html 200`)
    .join('\n') + '\n';
}

writeFileSync(join(siteDir, 'index.html'), landingPage());
writeFileSync(join(siteDir, '404.html'), notFoundPage());
writeFileSync(join(siteDir, '_redirects'), redirectsFile());
// Without this GitHub Pages runs the site through Jekyll, which drops files.
writeFileSync(join(siteDir, '.nojekyll'), '');

console.log(`site assembled in site/ with base ${base}`);
