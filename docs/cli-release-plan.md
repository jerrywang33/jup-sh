# CLI Release Plan

This document describes how the current local Rust CLI should become a public
developer tool.

## Current State

Today the CLI runs from source:

```bash
npm run cli -- pay --agent claude --token SOL --settle 20 USDC
```

The actual binary name is already:

```bash
jup-sh
```

The repository is not published as an npm package yet. The root `package.json`
is intentionally private while the CLI is still changing quickly.

There is now a local npm wrapper prototype:

```bash
npm run cli:alpha -- pay --agent claude --token SOL --settle 20 USDC
```

It calls the Rust CLI from the current repository. It is a development bridge,
not a published package.

The wrapper has a smoke test:

```bash
npm run alpha:smoke
```

It verifies `policy show`, `pay`, `intent list`, and `intent export` through
the npm wrapper.

The smoke test now covers the alpha CLI contract for agents:

- `pay --json` emits parseable JSON only
- `auto_pay` exits with code `0`
- `review_required` exits with code `2`
- `rejected` exits with code `1`
- key payment intent fields match `docs/cli-json-contract.md`
- intent list/export still work after those outcomes

The package dry run is available as:

```bash
npm run alpha:pack
```

The detailed release checklist is in:

```txt
docs/npm-alpha-release-checklist.md
```

Draft release notes for the first alpha checkpoint are in:

```txt
docs/releases/0.1.0-alpha.0.md
```

## Target Developer Experience

Primary target:

```bash
npx jup-sh pay --agent claude --token SOL --settle 20 USDC
```

Installed target:

```bash
npm install -g jup-sh
jup-sh pay --agent claude --token SOL --settle 20 USDC
```

The command should stay aligned with the website:

```txt
pay --agent claude --token SOL --settle 20 USDC
```

## Why npm / npx First

npm is the right first distribution channel because:

- the target users are agent, app, and API developers
- `npx` works well for trying a CLI without installation
- the website already presents the tool as a command-first developer product
- it can later wrap the Rust binary without changing the user-facing command

Cargo install and Homebrew can come later.

## Packaging Approach

Keep the payment logic in Rust:

```txt
rust/crates/core
rust/crates/cli
```

Publish an npm wrapper package named `jup-sh` that exposes the `jup-sh` binary.

Possible release structure:

```txt
npm/
  package.json
  bin/
    jup-sh
```

Current local wrapper:

```txt
npm/package.json
npm/bin/jup-sh
```

The current wrapper shells out to:

```bash
cargo run --quiet --
```

That is acceptable for Alpha 0 validation, but should be replaced before public
npm release.

The wrapper can either:

1. download a prebuilt Rust binary for the user's platform, or
2. package prebuilt binaries inside npm releases, or
3. temporarily run the Rust binary from source for early alpha users.

Option 1 is the cleanest long-term route. Option 3 is acceptable only for a
private alpha.

## Release Criteria

Before publishing to npm, the CLI should have:

- stable command names for `pay`, `policy`, and `intent`
- clear JSON output for agents
- documented exit codes for `pay`
- documented CLI JSON contract
- no private keys, signatures, or transactions in exported review payloads
- `README.md` Quickstart that matches the published install path
- GitHub release notes based on `CHANGELOG.md`
- npm package dry-run checklist
- GitHub pre-release draft for `v0.1.0-alpha.0`
- basic smoke tests for:
  - `jup-sh policy show`
  - `jup-sh pay ...`
  - `jup-sh intent list`
  - `jup-sh intent export ...`
  - `npm run alpha:smoke`

## Current Non-Goals

The first npm release should not include:

- wallet signing
- swap execution
- Solana Pay transaction requests
- remote backend persistence
- authentication

## Proposed Milestones

### Alpha 0

Source-only:

```bash
npm run cli -- ...
npm run cli:alpha -- ...
```

This is the current state.

### Alpha 1

Npm package with command:

```bash
npx jup-sh ...
```

Still quote-only and local-intent-only.

### Alpha 2

Add a small SDK or MCP surface after the CLI command shape stabilizes.

### Beta

Add backend intent storage or Solana Pay transaction request generation.
