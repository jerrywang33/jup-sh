# Changelog

All notable changes to jup.sh will be documented in this file.

## 0.1.0-alpha.3 - 2026-05-11

### Added

- Added top-level `jup-sh init` for first-run local workspace setup.
- Added `jup.config.json` generation with defaults for:
  - Risk Review base URL
  - policy file path
  - local intent store
  - quote provider
- Added config-aware defaults for `pay` and `intent` commands.
- Added an Agent Integration guide for safe CLI usage from agents and scripts.
- Updated Quickstart and npm README around the new `init -> pay --json`
  workflow.

### Not Included

- No wallet signing.
- No swap execution.
- No Solana Pay transaction request generation.
- No custody of funds.
- No remote backend persistence.
- No authentication.
- No published SDK package yet.

## 0.1.0-alpha.2 - 2026-05-11

### Added

- Prepared the first public npm alpha package under `jup-sh`.
- Added a self-contained Node.js CLI wrapper for `npx jup-sh@alpha`.
- Documented the npm alpha command path:
  - `npx jup-sh@alpha pay --agent deepseek --token SOL --amount 20 --settle USDC --json`
- Kept the CLI alpha quote-only, local-intent-only, and policy-driven.

### Not Included

- No wallet signing.
- No swap execution.
- No Solana Pay transaction request generation.
- No custody of funds.
- No remote backend persistence.
- No authentication.
- No published SDK package yet.

## 0.1.0-alpha.1 - 2026-05-10

### Added

- Added a source-only TypeScript SDK prototype with:
  - `createPaymentIntent`
  - `createJupiterQuoteProvider`
  - `createRiskReviewUrl`
  - `encodeRiskReviewPayload`
  - `parseRiskReviewPayload`
- Added SDK policy profiles:
  - `sandbox`
  - `balanced`
  - `strict`
- Added SDK `withTrustedRecipients` helper for known API/vendor destinations.
- Added SDK `explainPolicyDecision` helper for policy decision summaries,
  risk factors, passed checks, and recommended actions.
- Updated the hosted Risk Review page to present policy explanations before
  raw policy check evidence.

### Not Included

- No wallet signing.
- No swap execution.
- No Solana Pay transaction request generation.
- No custody of funds.
- No remote backend persistence.
- No authentication.
- No published npm package yet.

## 0.1.0-alpha.0 - 2026-05-09

### Added

- Added the initial pay.sh-inspired static website for `jup.sh`.
- Added a Rust workspace for CLI and reusable payment intent logic.
- Added `jup-sh pay` for local payment intent creation.
- Added deterministic local policy checks.
- Added structured intent fields for agents and scripts:
  - `status`
  - `decision`
  - `nextAction`
  - `riskLevel`
  - `policyChecks`
- Added local policy commands:
  - `jup-sh policy show`
  - `jup-sh policy init`
- Added a `SettlementQuoter` boundary.
- Added the default mock settlement quote provider.
- Added optional Jupiter quote-only settlement estimates with:
  - `--quote-provider jupiter`
  - `--slippage-bps`
  - `--jupiter-api-key`
- Added quote-aware policy checks:
  - `quote_available`
  - `quote_settlement_token`
  - `quote_price_impact`
- Added local intent persistence under `.jup-sh/intents`.
- Added local intent commands:
  - `jup-sh intent list`
  - `jup-sh intent show`
  - `jup-sh intent export`
- Added Risk Review URL export using a base64url fragment payload.
- Added static Risk Review page support for exported intent payloads.
- Added a private npm alpha wrapper prototype:
  - `npm/bin/jup-sh`
  - `npm run cli:alpha`
- Added alpha wrapper smoke test:
  - `npm run alpha:smoke`
- Added agent-facing CLI contract coverage for:
  - `pay --json`
  - `auto_pay` exit code `0`
  - `review_required` exit code `2`
  - `rejected` exit code `1`
- Added CLI JSON contract documentation and a review-required fixture.
- Added npm alpha package dry-run tooling and release checklist.
- Added draft GitHub release notes for `0.1.0-alpha.0`.
- Added a `release:check` gate for the alpha release checks.
- Added GitHub Pages developer documentation under `docs/`.
- Added release-readiness documentation:
  - `docs/cli-release-plan.md`
  - `docs/jupiter-quote-design.md`
  - `docs/risk-review-export-design.md`
  - `docs/cli-technical-design.md`

### Not Included

- No wallet signing.
- No swap execution.
- No Solana Pay transaction request generation.
- No custody of funds.
- No remote backend persistence.
- No authentication.
- No published npm package yet.
