import { defineConfig } from 'vitepress';
import { loadConfigReference } from './lib/model';

// The deployed site nests the demo galleries next to the docs (see
// scripts/build-pages.mjs), so demo links resolve only on the assembled site,
// not under `vitepress dev`.
const rawBase = process.env.PAGES_BASE !== undefined ? process.env.PAGES_BASE : '/';
const base = rawBase.endsWith('/') ? rawBase : rawBase + '/';

const demoLinks = [
  { text: 'Vanilla TypeScript', link: '/vanilla/', target: '_self' },
  { text: 'Angular', link: '/angular/', target: '_self' },
  { text: 'Lit', link: '/lit/', target: '_self' },
  { text: 'React', link: '/react/', target: '_self' },
  { text: 'Svelte', link: '/svelte/', target: '_self' },
  { text: 'Vue', link: '/vue/', target: '_self' }
];

const referenceItems = loadConfigReference().sections.map(section => ({
  text: section.title,
  link: '/reference/' + section.id
}));

export default defineConfig({
  base,
  title: 'mochart',
  description: 'Animated interactive SVG charting library with zero framework dependencies',
  srcExclude: ['README.md'],
  // Demo gallery links resolve on the assembled site only.
  ignoreDeadLinks: [/^\/(angular|lit|react|svelte|vanilla|vue)\//],
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started', activeMatch: '^/(guide|recipes)/' },
      { text: 'Reference', link: '/reference/', activeMatch: '^/reference/' },
      { text: 'Demos', items: demoLinks }
    ],
    sidebar: {
      '/guide/': guideSidebar(),
      '/recipes/': guideSidebar(),
      '/reference/': [
        { text: 'Overview', link: '/reference/' },
        { text: 'API', link: '/reference/api' },
        { text: 'Config sections', items: referenceItems }
      ]
    },
    outline: { level: [2, 3] },
    search: { provider: 'local' },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/jharris4/mochart' }
    ],
    footer: {
      message: 'Released under the BSD-3-Clause License.'
    }
  }
});

function guideSidebar() {
  return [
    {
      text: 'Guide',
      items: [
        { text: 'Getting started', link: '/guide/getting-started' },
        { text: 'The config model', link: '/guide/config-model' },
        { text: 'Data providers', link: '/guide/data-providers' },
        { text: 'Staged animation', link: '/guide/staged-animation' },
        { text: 'Interaction', link: '/guide/interaction' },
        { text: 'Chart states', link: '/guide/chart-states' }
      ]
    },
    {
      text: 'Frameworks',
      items: [
        { text: 'Angular', link: '/guide/frameworks/angular' },
        { text: 'Lit', link: '/guide/frameworks/lit' },
        { text: 'React', link: '/guide/frameworks/react' },
        { text: 'Svelte', link: '/guide/frameworks/svelte' },
        { text: 'Vue', link: '/guide/frameworks/vue' }
      ]
    },
    {
      text: 'Recipes',
      items: [
        { text: 'Stacked bars', link: '/recipes/stacked-bars' },
        { text: 'Grouped series', link: '/recipes/grouped-series' },
        { text: 'Dual value axes', link: '/recipes/dual-axes' },
        { text: 'Date axis', link: '/recipes/date-axis' },
        { text: 'Horizontal charts', link: '/recipes/horizontal-bars' },
        { text: 'Thresholds and ranges', link: '/recipes/thresholds-ranges' },
        { text: 'Gradients', link: '/recipes/gradients' },
        { text: 'Markers and labels', link: '/recipes/markers-labels' },
        { text: 'Tooltip formatting', link: '/recipes/tooltip-formatting' },
        { text: 'Histogram', link: '/recipes/histogram' },
        { text: 'Waterfall', link: '/recipes/waterfall' },
        { text: 'Sparklines', link: '/recipes/sparklines' },
        { text: 'Heatmap', link: '/recipes/heatmap' }
      ]
    }
  ];
}
