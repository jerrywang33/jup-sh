---
title: Agent Integration
description: How an agent should call jup.sh safely.
---

# Agent Integration

This guide describes the current safe integration pattern for agents and
scripts.

`jup.sh` is still an early alpha. It creates local payment intents, evaluates
local policy, estimates settlement, and returns a structured result. It does
not sign transactions, execute swaps, custody funds, or move tokens.

## Integration Model

```mermaid
sequenceDiagram
  participant Agent as Agent
  participant CLI as jup-sh CLI
  participant Policy as Local policy
  participant Quote as Quote provider
  participant Review as Risk Review

  Agent->>CLI: pay --json
  CLI->>Policy: evaluate intent
  CLI->>Quote: estimate settlement
  CLI-->>Agent: JSON + exit code
  alt auto_pay
    Agent-->>Agent: wait for future local authorization layer
  else review_required
    Agent->>Review: open reviewUrl or return it to user
  else rejected
    Agent-->>Agent: stop the payment flow
  end
```

The agent should not treat the CLI as a wallet. In the current alpha, the CLI
is a policy and settlement-intent layer.

## 1. Initialize A Local Workspace

```bash
npx jup-sh@alpha init
```

This writes:

```txt
jup.config.json
jup.policy.json
```

`jup.config.json` contains local defaults:

```json
{
  "reviewBaseUrl": "https://www.jup.sh",
  "policyPath": "jup.policy.json",
  "intentStore": ".jup-sh/intents",
  "quoteProvider": "mock"
}
```

`jup.policy.json` contains the risk controls:

```json
{
  "maxAutoSettleUSDC": 5,
  "maxAllowedSettleUSDC": 100,
  "maxPriceImpactBps": 100,
  "reviewHighPriceImpact": true,
  "verifiedTokens": ["USDC", "SOL", "JUP", "BONK"],
  "trustedRecipients": [],
  "reviewUnknownRecipients": true
}
```

Use `--force` only when you intentionally want to overwrite local files.

Check the local workspace:

```bash
npx jup-sh@alpha doctor
```

Agents and scripts can use:

```bash
npx jup-sh@alpha doctor --json
```

## 2. Call `pay --json`

Agents should use JSON mode and branch on the process exit code:

```bash
npx jup-sh@alpha pay --agent deepseek --token SOL --amount 20 --settle USDC --json
```

Exit codes:

| Exit code | Decision | Agent behavior |
| --- | --- | --- |
| `0` | `auto_pay` | Intent is inside policy and ready for future local authorization. |
| `2` | `review_required` | Return or open `reviewUrl`. This is a controlled outcome. |
| `1` | `rejected` or command failure | Stop the payment flow. |

## 3. Tune Local Policy

The default policy is intentionally conservative. Unknown recipients and
amounts above the auto-pay limit require review.

Trust a known API or vendor recipient:

```bash
npx jup-sh@alpha policy trust api.vendor.example
```

Raise the auto-pay limit:

```bash
npx jup-sh@alpha policy set max-auto 10
```

Now a small payment to the trusted recipient can stay on the automatic path:

```bash
npx jup-sh@alpha pay \
  --agent deepseek \
  --token SOL \
  --amount 6 \
  --settle USDC \
  --recipient api.vendor.example \
  --json
```

This should return:

```json
{
  "decision": "auto_pay",
  "nextAction": "ready_for_authorization"
}
```

The current alpha still stops before signing. `auto_pay` means the intent is
inside local policy and ready for a future authorization layer.

## 4. Handle Review

When policy requires review, the JSON output includes:

```json
{
  "decision": "review_required",
  "nextAction": "open_review",
  "reviewUrl": "https://www.jup.sh/pay/intent_xxx"
}
```

The agent should return that URL to the user or open it in the surrounding app.
It should not bypass policy.

You can also recreate the full Risk Review URL from a saved intent:

```bash
npx jup-sh@alpha review intent_xxx
```

For agents, use JSON mode:

```bash
npx jup-sh@alpha review intent_xxx --json
```

This returns:

```json
{
  "intentId": "intent_xxx",
  "decision": "review_required",
  "nextAction": "open_review",
  "reviewUrl": "https://www.jup.sh/pay/intent_xxx#intent=...",
  "payload": "..."
}
```

## 5. Export A Review Payload

Saved intents can be exported as a static Risk Review URL:

```bash
npx jup-sh@alpha intent export intent_xxx
```

`jup-sh review <intent_id>` is the preferred shortcut for this path. `intent
export` remains available for lower-level scripting.

The exported URL uses a fragment payload:

```txt
https://www.jup.sh/pay/intent_xxx#intent=<base64url-json-payload>
```

This lets a local CLI or SDK hand off review evidence without a jup.sh backend.

## Current Non-Goals

- No signing.
- No custody.
- No swap execution.
- No Solana Pay transaction request generation.
- No remote backend persistence.
- No authentication.
