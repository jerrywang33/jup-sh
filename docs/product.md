# jup.sh Product Document

## 1. V1 Snapshot

Date: 2026-05-07

`jup.sh` V1 is live as a public product shell at:

```txt
https://jup.sh
```

V1 establishes the positioning, visual direction, and first product primitive:

```txt
Risk and settlement for Solana agent payments.
```

Core positioning:

```txt
jup.sh is a Jupiter-powered risk and settlement layer for Solana agent payments.
Agents can pay with any verified token, recipients settle in USDC, and policy
decides when human review is required.
```

Primary command shown on the site:

```txt
pay --agent claude --token SOL --settle 20 USDC
```

## 2. Product Thesis

`jup.sh` should become an agent-first Solana payment risk and settlement layer.

The product should not behave like a traditional checkout where every payment
requires a human to open a link and confirm the route. The default path should
be automatic, and human review should appear only when policy or risk signals
require it.

The core model is:

```txt
Agents pay with any verified token. Recipients settle in USDC. Policy decides
when humans step in.
```

The two product handles are:

```txt
Jupiter-powered settlement + policy-driven risk management.
```

Jupiter helps agents pay with any verified token and settle recipients in USDC.
The risk layer decides whether a payment should auto-execute, require review,
or be rejected.

This makes the payment link a fallback review surface, not the main product.

## 3. Two-Layer Model

### Layer 1: Auto Pay

Agents create payment intents through CLI, SDK, or API. Each intent passes
through a policy and risk check before execution.

If the payment is inside the user's policy, it can continue automatically.

Example checks:

- Amount is below the per-payment limit.
- Daily spend remains below the daily limit.
- Token is verified or explicitly trusted.
- Jupiter route has acceptable slippage and price impact.
- Recipient is trusted or already known.
- Agent source is allowed.
- Payment frequency is normal.

### Layer 2: Risk Review

Risk Review is triggered only when a payment falls outside policy.

Example triggers:

- First-time recipient.
- Amount above the per-payment limit.
- Daily limit exceeded or close to exceeded.
- Token is unverified or low-liquidity.
- Jupiter quote has high slippage or poor route quality.
- Agent creates too many payments in a short window.
- Payment description or merchant metadata is unclear.

The review page should show:

- Amount.
- Payer token.
- USDC settlement amount.
- Jupiter route.
- Recipient wallet.
- Risk reason.
- Payment reference.

## 4. What V1 Includes

V1 includes:

- A pay.sh-inspired landing page.
- The `JUP.SH` wordmark and rainbow icon direction.
- The risk and settlement positioning.
- A command-first demo.
- A terminal-style flow preview with policy and risk checks.
- A Risk Review prototype at `/pay/:id`.
- A create-payment prototype at `/pay/new`.
- A homepage CTA that points to Risk Review instead of manual payment creation.
- A public GitHub nav link.
- Docs route remains available but is not shown in the top navigation.
- Product docs in this repository.
- Cloudflare Pages deployment for `jup.sh`.

Current agent list shown on the homepage:

```txt
Claude
Codex
DeepSeek
Kimi
MiniMax
Doubao
```

## 5. Product Layer

An agent needs to pay for a task, service, API call, digital good, or workflow
step on Solana using a verified token.

Expected product flow:

1. Agent creates a USDC-denominated payment intent.
2. jup.sh checks policy and risk.
3. If policy passes, Auto Pay continues.
4. If policy flags the payment, jup.sh opens Risk Review.
5. Jupiter API routes the payer token toward USDC.
6. Recipient receives USDC.

Short version:

```txt
agent intent -> policy check -> auto pay or risk review -> Jupiter route -> USDC settlement
```

## 6. Policy as the First Risk Engine

Phase 2 does not need a complex AI risk system on day one. The first useful
risk engine can be a clear policy layer.

Example policy shape:

```json
{
  "maxPerPaymentUSDC": 5,
  "dailyLimitUSDC": 50,
  "verifiedTokensOnly": true,
  "allowedTokens": ["SOL", "USDC", "BONK"],
  "maxSlippageBps": 50,
  "reviewNewRecipients": true,
  "reviewHighPriceImpact": true,
  "reviewUnknownAgents": true
}
```

The important product rule:

```txt
Policy decides whether a payment is automatic or requires Risk Review.
```

## 7. Current Limits

V1 is a static prototype and positioning release. It does not yet include:

- A real backend intent store.
- A real CLI package.
- A real SDK.
- Real policy evaluation.
- Real risk scoring.
- Real Jupiter quote or swap integration.
- Real Solana Pay transaction request generation.
- Real payment status verification.
- Public docs navigation.

These are intentionally left for Phase 2.

## 8. Phase 2 Direction

Phase 2 should turn the product shell into a real agent payment primitive.

Recommended Phase 2 target:

```txt
Build a working intent API + CLI demo with policy-gated Auto Pay, Risk Review
fallback, Solana Pay transaction requests, and Jupiter API token-to-USDC
settlement.
```

Phase 2 should focus on one credible end-to-end path:

1. `pay --agent claude --token SOL --settle 20 USDC`
2. CLI creates a payment intent.
3. Backend stores the intent.
4. Policy engine evaluates amount, token, route, recipient, and frequency.
5. If policy passes, payment proceeds through Auto Pay.
6. If policy flags it, user opens Risk Review.
7. Jupiter route settles USDC to recipient.
8. API returns status and receipt.

## 9. Target API Shape

```txt
POST /api/intents
GET  /api/intents/:id
POST /api/intents/:id/risk
POST /api/intents/:id/quote
POST /api/intents/:id/transaction
GET  /pay/:id
GET  /api/intents/:id/status
```

The hosted review link and API should represent the same underlying object: a
payment intent. The link should only be necessary when policy requires human
inspection.

## 10. Open Source Plan

The public repository should launch only when there is something useful for
developers to run.

Suggested initial repo contents:

- Landing page source.
- Intent API prototype.
- Policy engine prototype.
- Risk Review page.
- CLI package skeleton.
- Example agent payment command.
- Solana Pay transaction request example.
- Jupiter quote and swap integration notes.
- Safety and brand disclaimer.

## 11. Safety Rules

The product should remain conservative:

- No custody of user funds.
- No hidden routes.
- No blind signing.
- Only verified or trusted token inputs.
- Explicit policy limits.
- Inspectable risk reasons.
- Risk Review must show amount, route, recipient, and payment reference.
- Keep the Jupiter and Solana relationship wording accurate.

## 12. Brand

`jup.sh` is an independent community-built tool inspired by Jupiter routing and
pay.sh-style agent payments.

It should not imply official affiliation with Jupiter Exchange or Solana
Foundation unless that relationship exists.
