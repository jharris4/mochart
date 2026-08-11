// Rollup never reads a dependency's .map, so bundled dist code debugs as dist without this.
import { existsSync, readFileSync } from 'node:fs';

// Structurally typed, not `Plugin`: vitepress bundles vite 5 while the rest of the repo is on 8.
export function depSourcemaps() {
  return {
    name: 'dep-sourcemaps',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.includes('/dist/') || !code.includes('sourceMappingURL')) {
        return null;
      }
      const mapPath = id.replace(/\?.*$/, '') + '.map';
      if (!existsSync(mapPath)) {
        return null;
      }
      return { code, map: JSON.parse(readFileSync(mapPath, 'utf8')) };
    }
  };
}
