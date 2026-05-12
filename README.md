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

This repository contains the `jup-sh` 1.0 npm CLI, a static product site, a
hosted Risk Review prototype, a local Intent API, and a source-only TypeScript
SDK prototype.

The 1.0 CLI can execute real Jupiter swaps from the user's machine when the
user explicitly provides a local Solana keypair. The hosted review site and
local transaction request server never custody keys.

Live site:

```txt
https://www.jup.sh
```

Developer docs:

```txt
https://jerrywang33.github.io/jup-sh/
```

## Current Version

The current version is an npm CLI plus static Risk Review prototype:

```txt
init
-> policy trust/set
-> payment intent
-> mock or Jupiter quote
-> quote-aware policy checks
-> local intent store
-> local read-only intent status/API
-> local review approval/rejection state
-> transaction request runtime gate
-> transaction request preflight
-> unavailable receipt scaffold
-> local intent event log
-> intent expiry/replay gate
-> transaction request token gate
-> wallet account binding gate
-> quote freshness gate
-> real Jupiter swap transaction creation
-> local keypair signing and RPC submission
-> confirmed receipt persistence
-> review URL shortcut
-> hosted Risk Review page
```

The SDK path mirrors the same risk layer:

```txt
create intent
-> policy profile
-> trusted recipient check
-> Jupiter quote estimate
-> policy explanation
-> Risk Review URL when needed
```

The server path returns unsigned Solana Pay transaction requests for wallet
authorization. The CLI path can sign and submit only when a user provides a
local keypair with `jup-sh intent execute`.

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

Run the npm CLI:

```bash
npx jup-sh init
npx jup-sh doctor
```

Then configure policy and create a payment intent:

```bash
npx jup-sh policy trust api.vendor.example
npx jup-sh pay --agent deepseek --token SOL --amount 6 --settle USDC --recipient api.vendor.example --json
```

The CLI returns a structured local payment intent. Agents should branch on the
exit code:

```txt
0 = auto_pay
2 = review_required
1 = rejected or command failure
```

Execution boundary:

```txt
Server: no signing, no custody, no private keys.
CLI: signs and submits only with an explicit local keypair.
```

For source development, install dependencies:

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
npm run cli -- pay --agent deepseek --token SOL --amount 20 --settle USDC
```

Create a payment intent with a real Jupiter quote:

```bash
npm run cli -- pay --agent deepseek --token SOL --amount 20 --settle USDC --quote-provider jupiter
```

List saved local intents:

```bash
npm run cli -- intent list
```

Export a saved intent as a Risk Review URL:

```bash
npm run cli -- intent export intent_xxx
```

Use the review shortcut:

```bash
npm run cli -- review intent_xxx
```

Show a saved intent:

```bash
npm run cli -- intent show intent_xxx
```

The CLI saves generated intents locally:

```txt
.jup-sh/intents/<intent_id>.json
```

## Current Surface

V1 includes:

- A pay.sh-inspired landing page.
- A command-first agent payment concept.
- A Risk Review prototype.
- A public npm package: `jup-sh`.
- Real Jupiter swap execution through local `jup-sh intent execute`.
- A minimal TypeScript SDK prototype in `sdk/`.
- SDK policy profiles for `sandbox`, `balanced`, and `strict` risk posture.
- SDK trusted-recipient helper for known API/vendor destinations.
- SDK policy decision explanations for agent logs and Risk Review.
- A static product shell for the current positioning.
- Changelog in `CHANGELOG.md`.
- Product notes in `docs/product.md`.
- Technical architecture and design diagrams in `docs/architecture.md`.
- CLI release plan in `docs/cli-release-plan.md`.
- SDK technical design in `docs/sdk-technical-design.md`.
- CLI JSON contract in `docs/cli-json-contract.md`.
- Agent integration guide in `docs/agent-integration.md`.
- npm release checklist history in `docs/npm-alpha-release-checklist.md`.
- 1.0.0 real execution release notes in `docs/releases/1.0.0.md`.
- Draft alpha release notes in `docs/releases/0.1.0-alpha.0.md`.
- Alpha.1 release notes in `docs/releases/0.1.0-alpha.1.md`.
- Alpha.2 npm release notes in `docs/releases/0.1.0-alpha.2.md`.
- Alpha.3 init release notes in `docs/releases/0.1.0-alpha.3.md`.
- Alpha.4 policy tuning release notes in `docs/releases/0.1.0-alpha.4.md`.
- Alpha.5 review shortcut release notes in `docs/releases/0.1.0-alpha.5.md`.
- Alpha.6 doctor release notes in `docs/releases/0.1.0-alpha.6.md`.
- Alpha.7 review handoff release notes in `docs/releases/0.1.0-alpha.7.md`.
- Draft Alpha.8 transaction request skeleton release notes in
  `docs/releases/0.1.0-alpha.8.md`.
- Draft Alpha.9 Intent API/status model release notes in
  `docs/releases/0.1.0-alpha.9.md`.
- Draft Alpha.10 persisted review decision release notes in
  `docs/releases/0.1.0-alpha.10.md`.
- Draft Alpha.11 transaction request runtime gate release notes in
  `docs/releases/0.1.0-alpha.11.md`.
- Draft Alpha.12 transaction request preflight release notes in
  `docs/releases/0.1.0-alpha.12.md`.
- Draft Alpha.13 receipt scaffold release notes in
  `docs/releases/0.1.0-alpha.13.md`.
- Draft Alpha.14 intent event log release notes in
  `docs/releases/0.1.0-alpha.14.md`.
- Draft Alpha.15 intent expiry/replay gate release notes in
  `docs/releases/0.1.0-alpha.15.md`.
- Draft Alpha.16 transaction request token gate release notes in
  `docs/releases/0.1.0-alpha.16.md`.
- Draft Alpha.17 wallet account binding release notes in
  `docs/releases/0.1.0-alpha.17.md`.
- Draft Alpha.18 quote freshness gate release notes in
  `docs/releases/0.1.0-alpha.18.md`.
- GitHub Pages developer docs in `docs/`.
- Jupiter quote-only design in `docs/jupiter-quote-design.md`.
- Risk Review export design in `docs/risk-review-export-design.md`.
- Transaction request skeleton design in
  `docs/transaction-request-skeleton-design.md`.
- X / Twitter content notes in `docs/x-content.md`.

Current npm flow:

```bash
npx jup-sh init
npx jup-sh doctor
npx jup-sh policy trust api.vendor.example
npx jup-sh pay --agent deepseek --token SOL --amount 6 --settle USDC --recipient api.vendor.example --json
```

Review-required shortcut:

```bash
npx jup-sh review intent_xxx
```

Source development command:

```bash
npm run cli -- pay --agent deepseek --token SOL --amount 20 --settle USDC
```

Local TypeScript SDK example:

```bash
npm run sdk:check
npm run sdk:smoke
npm run sdk:jupiter:live
```

```ts
import { createPaymentIntent } from "./sdk/index.js";

const intent = await createPaymentIntent({
  agent: "deepseek",
  token: "SOL",
  amount: 20,
  settle: "USDC",
});
```

SDK Jupiter quote-only provider:

```ts
import { createJupiterQuoteProvider, createPaymentIntent } from "./sdk/index.js";

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

`sdk:jupiter:live` is skipped by default. Set `JUP_SH_LIVE_JUPITER=1` to call
Jupiter's quote API.

SDK Risk Review URL export:

```ts
import { createPaymentIntent, createRiskReviewUrl } from "./sdk/index.js";

const intent = await createPaymentIntent({
  agent: "deepseek",
  token: "SOL",
  amount: 20,
  settle: "USDC",
});

const reviewUrl = createRiskReviewUrl(intent, {
  reviewBaseUrl: "https://www.jup.sh",
});
```

This uses the same base64url fragment payload as `jup-sh intent export`.

SDK policy profiles:

```ts
import { createPaymentIntent, getPolicyProfile } from "./sdk/index.js";

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

Available profiles are `sandbox`, `balanced`, and `strict`. `balanced` matches
the default alpha policy.

Trusted recipient helper:

```ts
import {
  createPaymentIntent,
  getPolicyProfile,
  withTrustedRecipients,
} from "./sdk/index.js";

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

Policy decision explanation:

```ts
import {
  createPaymentIntent,
  explainPolicyDecision,
  getPolicyProfile,
} from "./sdk/index.js";

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
```

Alpha wrapper smoke test:

```bash
npm run alpha:smoke
```

Alpha npm package dry run:

```bash
npm run alpha:pack
```

Release gate:

```bash
npm run release:check
```

JSON output for agents or scripts:

```bash
npm run --silent cli:alpha -- pay --agent deepseek --token SOL --amount 20 --settle USDC --json
```

The CLI returns a structured local payment intent with:

- `status`: `ready_for_authorization`, `review_required`, or `rejected`.
- `decision`: `auto_pay`, `review_required`, or `rejected`.
- `nextAction`: `ready_for_authorization`, `open_review`, or `rejected`.
- `riskLevel`: `low`, `medium`, or `high`.
- `policyChecks`: deterministic local checks over intent fields and quote risk.
- `reviewUrl`: full Risk Review URL with `#intent=` payload when review is
  required.
- `reviewCommand`: local CLI shortcut, such as
  `npx jup-sh review intent_xxx`.

For `pay`, exit codes are part of the agent contract:

| Exit code | Meaning |
| --- | --- |
| `0` | The intent is inside policy and ready for local authorization. |
| `2` | The intent is valid, but policy requires Risk Review. |
| `1` | The intent is rejected or the command failed. |

The default quote provider is `mock`. Use `jupiter` for executable real routing:

```bash
npm run cli -- pay --agent deepseek --token SOL --amount 20 --settle USDC --quote-provider jupiter --recipient-token-account <RECIPIENT_USDC_TOKEN_ACCOUNT>
npm run cli -- intent execute intent_xxx --keypair ~/.config/solana/id.json --rpc-url https://api.mainnet-beta.solana.com --json
```

Set `JUPITER_API_KEY` or pass `--jupiter-api-key` if the Jupiter endpoint
requires an API key.

Useful local commands:

```bash
npm run cli -- init
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
npm run cli -- pay --agent deepseek --token SOL --amount 2 --settle USDC --recipient jup-sh-demo
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

The alpha-to-1.0 path is documented in `docs/complete-version-roadmap.md`.
The current release notes are in `docs/releases/1.0.0.md`.

## Disclaimer

`jup.sh` is an independent community-built tool.

It is not affiliated with, sponsored by, or endorsed by Jupiter Exchange, Solana
Foundation, or pay.sh.

References to Jupiter are about using Jupiter API/routing as infrastructure.

## License

MIT — see [LICENSE](LICENSE).
