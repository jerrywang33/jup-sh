# npm Alpha Release Checklist

This checklist keeps the first npm release path boring and explicit.

The current package prototype lives in:

```txt
npm/
```

It is still private and should not be published yet.

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
node wrapper -> cargo run --quiet -- ... -> Rust CLI
```

This is acceptable for local alpha validation, but not ideal for a public npm
release because users would need Rust and the repository source tree.

## Alpha 0 Dry Run

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
- `docs/releases/0.1.0-alpha.0.md` matches the release scope.
- The GitHub release is marked as a pre-release.

## GitHub Release Draft

Do not create a tag until the release commit is final.

Recommended tag:

```txt
v0.1.0-alpha.0
```

Recommended title:

```txt
jup.sh 0.1.0-alpha.0
```

Release notes source:

```txt
docs/releases/0.1.0-alpha.0.md
```

Before creating the tag:

- run the required checks above;
- confirm the working tree is clean;
- confirm `npm/package.json` still has `"private": true`;
- confirm no npm package has been published;
- confirm the release is described as source-run / developer alpha;
- mark the GitHub release as pre-release.

## Before Publishing to npm

Decide the packaging model:

1. prebuilt Rust binary downloaded by the npm wrapper;
2. prebuilt Rust binaries bundled into npm releases;
3. source-run wrapper for a very early developer alpha.

Preferred long-term path: prebuilt binary download.

If publishing an early source-run alpha, the README must clearly say users need:

- Node.js;
- Rust toolchain;
- repository source checkout.

Before `npm publish`:

- remove `"private": true` from `npm/package.json`;
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
