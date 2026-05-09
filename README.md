# jup.sh

Risk and settlement for Solana agent payments.

`jup.sh` is an early side project exploring the intersection of Solana DeFi,
AI, and payments.

The idea:

```txt
Agents pay with any verified token.
Recipients settle in USDC.
Policy decides when humans step in.
```

## Status

This repository currently contains a static V1 product prototype and an early
local Rust CLI prototype.

It is not a production payment system and does not execute real payments yet.

Live site:

```txt
https://www.jup.sh
```

## Current MVP

The current MVP is a source-run CLI plus static Risk Review prototype:

```txt
policy init/show
-> payment intent
-> mock or Jupiter quote
-> quote-aware policy checks
-> local intent store
-> Risk Review URL export
-> hosted Risk Review page
```

It is intentionally quote-only and review-only. It does not sign transactions,
execute swaps, custody funds, or move tokens.

## Product Direction

`jup.sh` is designed as a Jupiter-powered risk and settlement layer for Solana
agent payments.

The intended flow:

```txt
agent intent -> policy decision -> Jupiter settlement -> authorize or review
```

The default path should be automatic. Human review should appear only when
policy or risk signals require it.

## Quickstart

Install dependencies:

```bash
npm install
```

Show the default local policy:

```bash
npm run cli -- policy show
```

Create a local policy file:

```bash
npm run cli -- policy init
```

Create a payment intent with the default mock quote provider:

```bash
npm run cli -- pay --agent claude --token SOL --settle 20 USDC
```

Create a payment intent with a real Jupiter quote, without signing or executing
a payment:

```bash
npm run cli -- pay --agent claude --token SOL --settle 20 USDC --quote-provider jupiter
```

List saved local intents:

```bash
npm run cli -- intent list
```

Export a saved intent as a Risk Review URL:

```bash
npm run cli -- intent export intent_xxx
```

Show a saved intent:

```bash
npm run cli -- intent show intent_xxx
```

The CLI saves generated intents locally:

```txt
.jup-sh/intents/<intent_id>.json
```

## Current Prototype

V1 includes:

- A pay.sh-inspired landing page.
- A command-first agent payment concept.
- A Risk Review prototype.
- A static product shell for the current positioning.
- Changelog in `CHANGELOG.md`.
- Product notes in `docs/product.md`.
- CLI release plan in `docs/cli-release-plan.md`.
- Jupiter quote-only design in `docs/jupiter-quote-design.md`.
- Risk Review export design in `docs/risk-review-export-design.md`.
- X / Twitter content notes in `docs/x-content.md`.

Current demo command:

```bash
jup-sh pay --agent claude --token SOL --settle 20 USDC
```

Current source command:

```bash
npm run cli -- pay --agent claude --token SOL --settle 20 USDC
```

Target published command:

```bash
npx jup-sh pay --agent claude --token SOL --settle 20 USDC
```

Local npm wrapper prototype:

```bash
npm run cli:alpha -- pay --agent claude --token SOL --settle 20 USDC
```

Alpha wrapper smoke test:

```bash
npm run alpha:smoke
```

JSON output for agents or scripts:

```bash
npm run cli -- pay --agent claude --token SOL --settle 20 USDC --json
```

The CLI returns a structured local payment intent with:

- `status`: `ready_for_authorization`, `review_required`, or `rejected`.
- `decision`: `auto_pay`, `review_required`, or `rejected`.
- `nextAction`: `ready_for_authorization`, `open_review`, or `rejected`.
- `riskLevel`: `low`, `medium`, or `high`.
- `policyChecks`: deterministic local checks over intent fields and quote risk.

The default quote provider is `mock`. Use `jupiter` for quote-only real routing:

```bash
npm run cli -- pay --agent claude --token SOL --settle 20 USDC --quote-provider jupiter
```

Set `JUPITER_API_KEY` or pass `--jupiter-api-key` if the Jupiter endpoint
requires an API key.

Useful local commands:

```bash
npm run cli -- policy show
npm run cli -- policy show --json
npm run cli -- policy init
npm run cli -- intent list
npm run cli -- intent list --json
npm run cli -- intent export intent_xxx
npm run cli -- intent export intent_xxx --payload-only
npm run cli -- intent show intent_xxx
npm run cli -- intent show intent_xxx --json
```

Example policy override:

```json
{
  "maxAutoSettleUSDC": 10,
  "maxAllowedSettleUSDC": 250,
  "maxPriceImpactBps": 100,
  "reviewHighPriceImpact": true,
  "verifiedTokens": ["USDC", "SOL", "JUP", "BONK"],
  "trustedRecipients": ["jup-sh-demo"],
  "reviewUnknownRecipients": true
}
```

Save it as `jup.policy.json`, then run:

```bash
npm run cli -- pay --agent claude --token SOL --settle 2 USDC --recipient jup-sh-demo
```

## Local Development

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Open:

```txt
http://localhost:5173
```

Run checks:

```bash
npm run check
```

## Roadmap

Planned Phase 2 work:

- Intent API.
- Risk Review fallback.
- Solana Pay transaction request.
- Jupiter API token-to-USDC settlement.
- Payment status and receipt.
- Published CLI package.
- SDK.

## Disclaimer

`jup.sh` is an independent community-built tool.

It is not affiliated with, sponsored by, or endorsed by Jupiter Exchange, Solana
Foundation, or pay.sh.

References to Jupiter are about using Jupiter API/routing as infrastructure.

## License

MIT
