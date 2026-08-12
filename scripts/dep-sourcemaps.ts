// Rollup never reads a dependency's .map, so bundled dist code debugs as dist without this.
import { existsSync, readFileSync } from 'node:fs';

// Structurally typed, not `Plugin`: vitepress bundles vite 5 while the rest of the repo is on 8.
export function depSourcemaps() {
  return {
    name: 'dep-sourcemaps',
    enforce: 'pre' as const,
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
      return { code, map: JSON.parse(readFileSync(mapPath, 'utf8')) };
    }
  };
}
