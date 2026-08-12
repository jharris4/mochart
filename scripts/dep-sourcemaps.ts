// Rollup never reads a dependency's .map, so bundled dist code debugs as dist without this.
import { existsSync, readFileSync } from 'node:fs';

type MaybeTransform = { handler?: (this: unknown, ...args: never[]) => unknown } | undefined;

// Structurally typed, not `Plugin`: vitepress bundles vite 5 while the rest of the repo is on 8.
export function depSourcemaps() {
  const mapped = new Set<string>();
  return {
    name: 'dep-sourcemaps',
    enforce: 'pre' as const,
    // The angular optimizer answers every non-angular .js with an empty map, which would drop ours.
    configResolved(config: { plugins: readonly { name: string; transform?: unknown }[] }) {
      const optimizer = config.plugins.find((p) => p.name === '@analogjs/vite-plugin-angular-optimizer');
      const transform = optimizer?.transform as MaybeTransform;
      const inner = transform?.handler;
      if (!optimizer) {
        return;
      }
      // a shape change upstream would otherwise silently put us back to dist-only maps
      if (!transform || !inner) {
        console.warn('dep-sourcemaps: the angular optimizer no longer exposes transform.handler, '
          + 'so dependency sourcemaps will be dropped from this build');
        return;
      }
      transform.handler = function (this: unknown, ...args: never[]) {
        const id = args[1] as unknown as string;
        return mapped.has(id) ? null : inner.apply(this, args);
      };
    },
    // The map has to come from `load`: rollup reads a `transform` map as a link in the chain back to
    // the dist file rather than as the file's own map, and drops it (vite 5, i.e. the docs site).
    load(id: string) {
      const mapPath = id + '.map';
      if (!id.endsWith('.js') || !id.includes('/dist/') || !existsSync(mapPath)) {
        return null;
      }
      const code = readFileSync(id, 'utf8');
      if (!code.includes('sourceMappingURL')) {
        return null;
      }
      mapped.add(id);
      return { code, map: JSON.parse(readFileSync(mapPath, 'utf8')) };
    }
  };
}
