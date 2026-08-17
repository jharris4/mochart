# Releasing

How the nine public `@mochart/*` packages get to npm. Versioning and changelogs
are handled by [Changesets](https://github.com/changesets/changesets); publishing
runs in GitHub Actions ([`ci.yml`](.github/workflows/ci.yml), `release-*` jobs)
via [npm trusted publishing](https://docs.npmjs.com/trusted-publishers), so no
npm token exists anywhere.

## Overview

- **Published packages** (everything under `packages/` that is not `private`):
  `@mochart/movalid`, `@mochart/core`, `@mochart/editor`, `@mochart/export`,
  `@mochart/react`, `@mochart/svelte`, `@mochart/vue`, `@mochart/lit`,
  `@mochart/angular`.
- **Fixed versioning**: all nine share one version number
  ([`.changeset/config.json`](.changeset/config.json) `fixed` group). A release
  bumps and republishes all of them, and rewrites the internal `^` ranges
  (including the bindings' `@mochart/core` peer range) to the new version.
- **Publishing goes through pnpm**, never `npm publish` or `changeset publish`:
  pnpm swaps in each package's `publishConfig.exports` at pack time, which
  strips the monorepo-only `development` export condition. `npm run
  check:publish` guards this and `scripts/publish-libs.mjs` does the
  publishing. Both `changeset publish` and `changeset pack` would use `npm`
  in this npm-workspaces repo, so they are not used.
- **Tags** are per package (`@mochart/core@1.2.0`, …), created by
  `changeset git-tag`; the action turns them into one GitHub Release per
  package with that package's changelog section as the body.

## Making a change that should appear in the release notes

```sh
npx changeset
```

Pick any one of the fixed-group packages (they all move together), choose the
bump (`patch` / `minor` / `major`), and write a one-line summary. Commit the
generated `.changeset/*.md` with the code. Changes without a changeset still
ship in the next release; they just get no line in the changelog.

For a fix that only touches one binding, name that binding; its changelog gets
the line and the others get "Updated dependencies".

## Cutting a release

1. Push (or merge) to `main`. Once the CI matrix is green the `release-mode`
   job runs `changesets/action/select-mode`, and when changesets are pending
   the `release-version` job opens or refreshes a **"Version Packages"** PR
   containing the bumps, changelog entries, `packages/mochart/src/version.ts`
   stamp and lockfile refresh (`npm run release:version`).
2. Review and merge that PR. GitHub does not run CI on the PR itself (it is
   opened with the workflow token), which is fine: the merge commit runs the
   full matrix before anything is published.
3. On the merge push, `release-mode` reports `publish` (a version is not on the
   registry yet) and `release-publish` runs `npm run release:publish`:
   `check:publish` → `publish-libs.mjs` (in dependency order, skipping versions
   already on npm, so a re-run resumes where it stopped) → `changeset git-tag`.
   The action then pushes the tags and creates the GitHub Releases.

The whole `release-*` chain is gated behind the repository variable
`ENABLE_NPM_RELEASE=true` (Settings → Secrets and variables → Actions →
Variables). Delete or change the variable to pause releases.

Repository setting required once: Settings → Actions → General → **Allow GitHub
Actions to create and approve pull requests**.

### If the publish job fails

- **`check:publish` failed** — a package's `publishConfig.exports` drifted from
  its `exports`; fix the manifest.
- **`stampVersion: src/version.ts is out of date`** — the version PR was edited
  by hand after generation; run `npm run stamp-version -w @mochart/core`.
- **npm 403 / OIDC error** — the trusted publisher on npmjs.com for that
  package must be `mocharts/mochart`, workflow `ci.yml`, no environment. Also
  the job needs npm ≥ 11.5 (the job prints `npm --version`; Node 24 bundles a
  compatible one).
- **A package published, the rest did not** — just re-run the job; published
  versions are skipped and tags are created only where missing.

## Dry run

The **Release dry run** workflow (`workflow_dispatch`, [`release-dry-run.yml`](.github/workflows/release-dry-run.yml))
packs all nine packages the way publishing would, checks each tarball
(dist-only exports, README/LICENSE/CHANGELOG present, every exported path in
the tarball) and installs them into a scratch project to import each one under
Node. The tarballs are uploaded as the `release-tarballs` artifact for
installing into a real project. Locally:

```sh
npm run pack:libs -- --smoke     # tarballs land in pack/
node scripts/publish-libs.mjs --dry-run   # full pnpm publish --dry-run per package
```

## Pre-releases

```sh
npx changeset pre enter next     # subsequent versions are 1.1.0-next.0, … on the `next` dist-tag
npx changeset pre exit
```

`publish-libs.mjs` reads `.changeset/pre.json` and passes the tag to
`pnpm publish --tag`. Merge the pre-mode toggle like any other change; the
Version Packages PR follows.

## First release (1.0.0) — manual, one time

Trusted publishing can only be configured on packages that already exist on
npm, so the first publish happens from a maintainer machine.

1. Confirm the `@mochart` scope on npm belongs to you and log in
   (`npm login`; publishing prompts for a 2FA code, pass `--otp=123456`
   through to every publish if you prefer).
2. `git status` clean on `main`, `npm ci` fresh, then verify:
   `npm run lint && npm run typecheck && npm test && npm run pack:libs -- --smoke`.
3. Publish (all nine, in dependency order):
   ```sh
   npm run publish:libs
   ```
   `check:publish` runs first. To rehearse: `node scripts/publish-libs.mjs --dry-run`.
4. Tag and push:
   ```sh
   npx changeset git-tag
   git push --follow-tags
   ```
5. Create one GitHub Release for the tag `@mochart/core@1.0.0` with the body
   "Initial release." (the per-package `CHANGELOG.md` files already carry that
   entry).
6. On npmjs.com, for **each of the nine packages**: Settings → Trusted
   Publisher → GitHub Actions → owner `mocharts`, repository `mochart`,
   workflow filename `ci.yml`, environment blank.
7. Set the repository variable `ENABLE_NPM_RELEASE=true` and enable "Allow
   GitHub Actions to create and approve pull requests" (see above).

From here on, releases follow "Cutting a release". After 1.0.0 is out, replace
this section with the "Adding a new published package" note below.

## Adding a new published package

A package that is not on npm yet cannot be trusted-published, so its first
version is a manual publish (`npm run publish:libs` after adding it to
`scripts/publish-libs.mjs`, `scripts/pack-libs.mjs`, `build:libs`, and the
`fixed` group in `.changeset/config.json`), followed by the trusted-publisher
registration in step 6 above. It also needs `publishConfig.exports`,
`repository.directory`, `files` including `CHANGELOG.md`, and a `CHANGELOG.md`
starting with `# <package name>`.
