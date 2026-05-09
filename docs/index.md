---
title: Overview
description: Developer documentation for jup.sh.
---

# jup.sh Docs

Risk and settlement for Solana agent payments.

`jup.sh` is an early source-run developer alpha for exploring agent-native
payments on Solana.

```txt
Agents pay with any verified token.
Recipients settle in USDC.
Policy decides when humans step in.
```

## Current Alpha

The first milestone is `v0.1.0-alpha.0`.

It includes:

- local Rust CLI;
- local policy checks;
- mock settlement quotes;
- optional Jupiter quote-only settlement estimates;
- local intent storage;
- Risk Review URL export;
- hosted static Risk Review rendering;
- an agent-facing JSON contract;
- release checks for the alpha package shape.

It does not include:

- wallet signing;
- swap execution;
- custody;
- Solana Pay transaction request generation;
- remote backend persistence;
- a published npm package.

## Start Here

- [Architecture](architecture.md)
- [Quickstart](quickstart.md)
- [CLI JSON Contract](cli-json-contract.md)
- [0.1.0-alpha.0 Release Notes](releases/0.1.0-alpha.0.md)

Read [Architecture](architecture.md) first if you want the system model:
intent creation, policy decisions, Jupiter quote-only settlement, Risk Review,
and the current alpha boundary.

## Product Boundary

`jup.sh` is an independent community-built tool and is not affiliated with
Jupiter.

The current integration direction is Jupiter-powered settlement and
policy-driven risk management. In this alpha, Jupiter integration is quote-only
and does not execute swaps.
