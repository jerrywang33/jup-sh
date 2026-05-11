---
title: CLI Release Plan
description: Release path for the jup.sh npm alpha CLI.
---

# CLI Release Plan

This document tracks how the `jup-sh` CLI is being released as a public npm
alpha.

## Current State

The public alpha is available through npm:

```bash
npx jup-sh@alpha init
npx jup-sh@alpha pay --agent deepseek --token SOL --amount 20 --settle USDC --json
```

The package name and binary are:

```txt
jup-sh
```

Source development still supports:

```bash
npm run cli:alpha -- pay --agent deepseek --token SOL --amount 20 --settle USDC
npm run cli -- pay --agent deepseek --token SOL --amount 20 --settle USDC
```

The release gate is:

```bash
npm run release:check
```

The alpha smoke test covers the CLI contract for agents:

- `init` writes local config and policy files
- `policy trust` and `policy set` mutate local risk policy
- `pay --json` emits parseable JSON only
- `auto_pay` exits with code `0`
- `review_required` exits with code `2`
- `rejected` exits with code `1`
- key payment intent fields match `docs/cli-json-contract.md`
- `intent list`, `intent export`, and `review` work after those outcomes

The package dry run is available as:

```bash
npm run alpha:pack
```

The detailed release checklist is in:

```txt
docs/npm-alpha-release-checklist.md
```

Release notes are in:

```txt
docs/releases/
```

## Target Developer Experience

Primary public path:

```bash
npx jup-sh@alpha init
npx jup-sh@alpha policy trust api.vendor.example
npx jup-sh@alpha pay --agent deepseek --token SOL --amount 6 --settle USDC --recipient api.vendor.example --json
```

Installed target:

```bash
npm install -g jup-sh
jup-sh pay --agent deepseek --token SOL --amount 20 --settle USDC
```

The command should stay aligned with the website:

```txt
pay --agent deepseek --token SOL --amount 20 --settle USDC
```

## Why npm / npx First

npm is the right first distribution channel because:

- the target users are agent, app, and API developers
- `npx` works well for trying a CLI without installation
- the website already presents the tool as a command-first developer product
- it can later wrap the Rust binary without changing the user-facing command

Cargo install and Homebrew can come later.

## Packaging Approach

The current npm alpha package is a self-contained Node.js CLI. It does not
require Rust or a repository checkout.

The repository still keeps Rust and TypeScript source paths for development:

```txt
rust/crates/core
rust/crates/cli
sdk/
```

Current npm package:

```txt
npm/
  package.json
  bin/
    jup-sh
```

Longer term, the npm package may wrap prebuilt Rust binaries once the CLI
surface stabilizes. The public command shape should stay stable.

## Release Criteria

Before moving beyond alpha, the CLI should have:

- stable command names for `pay`, `policy`, and `intent`
- clear JSON output for agents
- documented exit codes for `pay`
- documented CLI JSON contract
- no private keys, signatures, or transactions in exported review payloads
- `README.md` Quickstart that matches the published install path
- GitHub release notes based on `CHANGELOG.md`
- npm package dry-run checklist
- GitHub pre-release notes for each alpha checkpoint
- basic smoke tests for:
  - `jup-sh policy show`
  - `jup-sh pay ...`
  - `jup-sh intent list`
  - `jup-sh intent export ...`
  - `npm run alpha:smoke`

## Current Non-Goals

The npm alpha should not include:

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

Completed.

### Alpha 1

SDK risk-layer checkpoint.

Completed.

### Alpha 2

First public npm alpha:

```bash
npx jup-sh@alpha ...
```

Completed.

### Alpha 3

First-run init workflow.

Completed.

### Alpha 4

Policy tuning from CLI.

Completed.

### Alpha 5

Top-level Risk Review shortcut.

Completed.

### Beta

Add backend intent storage or Solana Pay transaction request generation.
