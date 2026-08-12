import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Stamps the package.json version into src/version.ts (the successor to the
// pre-monorepo `update-version` script). Runs as `prepack`, so every published
// build ships whatever version package.json declares.
//
// Usage: tsx scripts/stampVersion.ts [--check]
// --check exits 1 when src/version.ts is out of sync instead of writing it, so
// builds and installs never modify the tracked file.
const check = process.argv.includes('--check');

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8')) as { version: string };

const versionPath = path.join(packageDir, 'src', 'version.ts');
const source = fs.readFileSync(versionPath, 'utf8');
if (!/mochartVersion = "[^"]+"/.test(source)) {
  console.error('stampVersion: could not find `mochartVersion = "..."` in ' + versionPath);
  process.exit(1);
}

const stamped = source.replace(/mochartVersion = "[^"]+"/, 'mochartVersion = "' + version + '"');
if (stamped !== source) {
  if (check) {
    console.error('stampVersion: src/version.ts is out of date with package.json version ' + version
      + ' — run `npm run stamp-version -w @mochart/core`');
    process.exit(1);
  }
  fs.writeFileSync(versionPath, stamped);
  console.log('stampVersion: stamped ' + version + ' into src/version.ts');
}
