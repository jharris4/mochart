// Rollup never reads a dependency's .map, so bundled dist code debugs as dist without this.
import { existsSync, readFileSync } from 'node:fs';
import type { Plugin } from 'vite';

export function depSourcemaps(): Plugin {
  return {
    name: 'dep-sourcemaps',
    enforce: 'pre',
    transform(code, id) {
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
