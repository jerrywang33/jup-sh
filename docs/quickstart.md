---
title: Quickstart
description: Run the jup.sh alpha locally or with npx.
---

# Quickstart

This guide runs the current `jup.sh` alpha with `npx` or from source.

The alpha is useful for testing the agent-facing payment contract:

```txt
agent intent -> policy decision -> quote estimate -> local intent -> review URL
```

It does not sign transactions, execute swaps, custody funds, or move tokens.

## Prerequisites

You need:

- Node.js and npm.

For the npm alpha, initialize a local workspace:

```bash
npx jup-sh@alpha init
```

Then create a payment intent:

```bash
npx jup-sh@alpha pay --agent deepseek --token SOL --amount 20 --settle USDC --json
```

For source development, you also need a working Rust toolchain and git:

```bash
git clone https://github.com/jerrywang33/jup-sh.git
cd jup-sh
npm install
```

Use `npm run cli:alpha --` for the local Node wrapper, or `npm run cli --` to
run the Rust CLI directly through Cargo.

## Command Flow

```mermaid
flowchart LR
  Agent["agent or script"]
  CLI["jup.sh CLI"]
  Policy["local policy"]
  Quote["mock or Jupiter quote"]
  Store["local intent store"]
  Result["JSON + exit code"]
  Review["Risk Review URL"]

  Agent -->|"pay command"| CLI
  CLI --> Policy
  CLI --> Quote
  Policy --> Result
  Quote --> Result
  Result --> Store
  Result -->|"review_required"| Review
```

The CLI always creates a local intent record when the command is valid enough
to evaluate. The policy decision controls what the caller should do next.

## 1. Initialize Local Config

```bash
npx jup-sh@alpha init
```

This writes:

```txt
jup.config.json
jup.policy.json
```

`jup.config.json` controls local paths and defaults. `jup.policy.json`
controls risk thresholds. Use `--force` if you intentionally want to overwrite
them.

For source development, use:

```bash
npm run cli:alpha -- init
```

## 2. Inspect The Default Policy

```bash
npm run cli:alpha -- policy show
```

The default policy is conservative:

- verified tokens only;
- USDC settlement only;
- auto-pay limit of 5 USDC;
- hard max of 100 USDC;
- unknown recipients require review;
- high price impact requires review.

Create or overwrite only the local policy file:

```bash
npm run cli:alpha -- policy init
```

This writes:

```txt
jup.policy.json
```

Use `--force` if you intentionally want to overwrite it.

Trust a known API or vendor recipient:

```bash
npm run cli:alpha -- policy trust api.vendor.example
```

Raise the auto-pay limit:

```bash
npm run cli:alpha -- policy set max-auto 10
```

Check the local workspace:

```bash
npm run cli:alpha -- doctor
npm run cli:alpha -- doctor --json
```

## 3. Create A Payment Intent

```bash
npm run cli:alpha -- pay --agent deepseek --token SOL --amount 20 --settle USDC
```

This creates a local payment intent and saves it under:

```txt
.jup-sh/intents/<intent_id>.json
```

By default, the command uses the mock quote provider. That makes tests stable
and does not call external APIs.

## 4. Use JSON Mode For Agents

Agents and scripts should use `--json`:

```bash
npm run --silent cli:alpha -- pay \
  --agent deepseek \
  --token SOL \
  --amount 20 \
  --settle USDC \
  --json
```

`--json` prints one structured object to stdout. Agents should branch on the
exit code and `nextAction`.

| Exit code | Decision | Agent behavior |
| --- | --- | --- |
| `0` | `auto_pay` | Intent is inside policy and ready for local authorization in a future phase. |
| `2` | `review_required` | Open or return the Risk Review URL. This is a controlled policy outcome. |
| `1` | `rejected` or command failure | Stop the payment flow. |

The field-level contract is documented in
[CLI JSON Contract](cli-json-contract.md).

For a fuller caller guide, see [Agent Integration](agent-integration.md).

## 5. Test The Three Policy Outcomes

Auto-pay candidate with a trusted recipient and small amount:

```bash
npm run cli:alpha -- pay \
  --agent deepseek \
  --token SOL \
  --amount 2 \
  --settle USDC \
  --recipient jup-sh-demo \
  --json
```

Review-required payment with the default policy:

```bash
npm run cli:alpha -- pay \
  --agent deepseek \
  --token SOL \
  --amount 20 \
  --settle USDC \
  --json
```

Rejected payment with an unsupported token:

```bash
npm run cli:alpha -- pay \
  --agent deepseek \
  --token FAKE \
  --amount 20 \
  --settle USDC \
  --json
```

## 6. Use Jupiter Quote-Only Mode

```bash
npm run cli:alpha -- pay \
  --agent deepseek \
  --token SOL \
  --amount 20 \
  --settle USDC \
  --quote-provider jupiter
```

This asks Jupiter for a quote estimate. It still does not sign, submit, or
execute a swap.

Optional settings:

```bash
--jupiter-api-key <key>
--jupiter-quote-url <url>
--slippage-bps 50
```

You can also set:

```bash
JUPITER_API_KEY=...
```

See [Jupiter Quote-Only Design](jupiter-quote-design.md) for the settlement
boundary.

## 7. Inspect Local Intents

List saved intents:

```bash
npm run cli:alpha -- intent list
```

Show one intent:

```bash
npm run cli:alpha -- intent show intent_xxx
```

Export a Risk Review URL:

```bash
npm run cli:alpha -- intent export intent_xxx
```

Or use the review shortcut:

```bash
npm run cli:alpha -- review intent_xxx
```

The exported URL contains a fragment payload:

```txt
https://jup.sh/pay/intent_xxx#intent=<base64url-json-payload>
```

See [Risk Review Export Design](risk-review-export-design.md) for the static
review model.

## 8. Try The SDK Surface

The first TypeScript SDK surface is local and source-only:

```ts
import { createPaymentIntent } from "../sdk/index.js";

const intent = await createPaymentIntent({
  agent: "deepseek",
  token: "SOL",
  amount: 20,
  settle: "USDC",
});
```

Typecheck the SDK and example:

```bash
npm run sdk:check
npm run sdk:smoke
npm run sdk:jupiter:live
```

The SDK returns the same `PaymentIntent` contract as the CLI JSON mode. The SDK
itself is still source-only and does not call a hosted backend yet.

Use the SDK Jupiter quote-only provider:

```ts
import { createJupiterQuoteProvider, createPaymentIntent } from "../sdk/index.js";

const intent = await createPaymentIntent(
  {
    agent: "deepseek",
    token: "SOL",
    amount: 20,
    settle: "USDC",
  },
  {
    quoteProvider: createJupiterQuoteProvider(),
  }
);
```

This calls Jupiter for a quote estimate only. It does not sign, submit, or
execute a swap.

`sdk:jupiter:live` is skipped by default. Set `JUP_SH_LIVE_JUPITER=1` when you
want to call Jupiter's live quote API from the example.

Generate a Risk Review URL from the SDK:

```ts
import {
  createPaymentIntent,
  createRiskReviewUrl,
} from "../sdk/index.js";

const intent = await createPaymentIntent({
  agent: "deepseek",
  token: "SOL",
  amount: 20,
  settle: "USDC",
});

if (intent.nextAction === "open_review") {
  const reviewUrl = createRiskReviewUrl(intent, {
    reviewBaseUrl: "https://www.jup.sh",
  });

  console.log(reviewUrl);
}
```

This uses the same `#intent=<base64url-json-payload>` model as CLI
`intent export`, so the URL opens directly in the hosted Risk Review page.

Try SDK policy profiles:

```ts
import {
  createPaymentIntent,
  getPolicyProfile,
} from "../sdk/index.js";

const intent = await createPaymentIntent(
  {
    agent: "deepseek",
    token: "SOL",
    amount: 20,
    settle: "USDC",
  },
  {
    policy: getPolicyProfile("sandbox"),
  }
);
```

Available profiles:

| Profile | Intended use |
| --- | --- |
| `sandbox` | Agent demos, hackathons, and local testing with fewer review interruptions. |
| `balanced` | Known agents paying known APIs. This is the default alpha behavior. |
| `strict` | New agents, unknown recipients, or higher-risk environments. |

Add a trusted recipient to a profile:

```ts
import {
  createPaymentIntent,
  getPolicyProfile,
  withTrustedRecipients,
} from "../sdk/index.js";

const policy = withTrustedRecipients(getPolicyProfile("balanced"), [
  "api.vendor.example",
]);

const intent = await createPaymentIntent(
  {
    agent: "deepseek",
    token: "SOL",
    amount: 2,
    settle: "USDC",
    recipient: "api.vendor.example",
  },
  { policy }
);
```

This keeps small known-recipient payments inside policy while still sending
unknown recipients to Risk Review.

Explain a policy decision:

```ts
import {
  createPaymentIntent,
  explainPolicyDecision,
  getPolicyProfile,
} from "../sdk/index.js";

const intent = await createPaymentIntent(
  {
    agent: "deepseek",
    token: "SOL",
    amount: 20,
    settle: "USDC",
  },
  {
    policy: getPolicyProfile("balanced"),
  }
);

const explanation = explainPolicyDecision(intent);

console.log(explanation.summary);
console.log(explanation.riskFactors);
console.log(explanation.recommendedAction);
```

This is useful for agent logs, Risk Review, and local audit trails. It explains
the existing `policyChecks`; it does not change the payment decision.

## 8. Run The Release Gate

Before a release checkpoint:

```bash
npm run release:check
```

This runs:

- JavaScript syntax checks;
- Rust workspace checks;
- alpha smoke tests;
- npm package dry-run checks;
- Rust tests.

The release gate exists because agent payment tools need predictable command
behavior before they touch signing or money movement.
