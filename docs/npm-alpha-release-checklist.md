---
title: npm Alpha Release Checklist
description: Release checklist for npm alpha package preparation.
---

# npm Alpha Release Checklist

This checklist keeps the first npm release path boring and explicit.

The current package lives in:

```txt
npm/
```

It is now prepared for the `0.1.0-alpha.6` npm alpha.

## Current Package Shape

Package name:

```txt
jup-sh
```

Binary:

```txt
jup-sh -> bin/jup-sh
```

Current wrapper behavior:

```txt
node wrapper -> self-contained alpha CLI
```

This is acceptable for the first npm alpha because users do not need Rust or a
repository checkout. The npm alpha still does not move money.

## Alpha 6 Dry Run

Run:

```bash
npm run alpha:pack
```

The dry run asserts that the package contains only:

```txt
README.md
bin/jup-sh
package.json
```

It also checks that common local or secret paths are not included.

## Required Checks Before Any Release

Run:

```bash
npm run release:check
```

This runs:

```bash
npm run check
npm run alpha:smoke
npm run alpha:pack
cd rust && cargo test --workspace
```

Confirm:

- `pay --json` follows `docs/cli-json-contract.md`.
- `pay` returns `0` for `auto_pay`.
- `pay` returns `2` for `review_required`.
- `pay` returns `1` for `rejected` or command failure.
- Risk Review export does not include private keys, signatures, swap
  transactions, or wallet secrets.
- `CHANGELOG.md` has the release notes.
- `docs/releases/0.1.0-alpha.6.md` matches the release scope.
- The GitHub release is marked as a pre-release.

## GitHub Release Draft

Do not create a tag until the release commit is final and `npm run
release:check` has passed.

Recommended tag:

```txt
v0.1.0-alpha.6
```

Recommended title:

```txt
jup.sh 0.1.0-alpha.6
```

Release notes source:

```txt
docs/releases/0.1.0-alpha.6.md
```

Before creating the tag:

- run the required checks above;
- confirm the working tree is clean;
- confirm `npm/package.json` does not have `"private": true`;
- confirm the npm alpha package uses `0.1.0-alpha.6`;
- confirm the release is described as quote-only / developer alpha;
- mark the GitHub release as pre-release.

## Before Publishing to npm

The current alpha package is a self-contained Node.js CLI. Users need Node.js,
but they do not need Rust or a repository checkout.

Before `npm publish`:

- keep `publishConfig.tag` or publish with `--tag alpha`;
- run `npm publish --dry-run` from `npm/`;
- confirm npm account 2FA/provenance settings;
- confirm no `.env*`, tokens, local stores, `node_modules`, `.wrangler`, or
  Rust build artifacts are included;
- tag the GitHub release from the same commit.

## Current Non-Goals

The npm alpha must not add:

- wallet signing;
- swap execution;
- Solana Pay transaction requests;
- custody;
- remote backend persistence;
- authentication.
