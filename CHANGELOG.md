# Changelog

All notable changes to jup.sh will be documented in this file.

## 0.1.0-alpha.0 - Unreleased

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
